const axios = require('axios');
const redisCache = require('../utils/cache');
const { pollutedApi } = require('../config/vars');
const { StatusCode } = require('../constants/statusCode');
const { KEY_EXTERNAL_POLLUTED_API_AUTH_TOKEN, EXTERNAL_POLLUTED_API_AUTH_TOKEN_TTL } = require('../constants/defaults');

/**
 * Service responsible for interacting with the external Polluted API.
 * Includes: auth token management, Redis-based rate limiting, response caching,
 * and retry logic for transient failures (401/429).
 */
class PollutedService {
  /**
   * Initializes HTTP client, Redis-backed rate limit config, and cache TTLs.
   */
  constructor() {
    this.pollutedApi = axios.create({
      baseURL: pollutedApi.url,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.redisClient = redisCache;
    // Rate limit settings: 5 requests per 10 seconds
    this.RL_KEY = 'rl:polluted_api';
    this.RL_WINDOW_SECONDS = 10;
    this.RL_MAX_POINTS = 5;
    // Cache TTL for pollution queries (in seconds)
    this.POLLUTION_CACHE_TTL = 30;
  }

  /**
   * Simple sleep utility.
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>} resolves after the specified delay
   */
  async _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Acquire a rate-limit slot using Redis INCR/EXPIRE.
   * Ensures no more than 5 requests occur within a 10-second window.
   * If the window is saturated, waits until the key TTL elapses, then retries.
   * @returns {Promise<void>} resolves when it is safe to proceed with a request
   */
  async _acquireRateLimit() {
    while (true) {
      const count = await this.redisClient.increment({ key: this.RL_KEY });
      if (count === 1) {
        // start window
        await this.redisClient.addTimeToLive({ key: this.RL_KEY, ttlSeconds: this.RL_WINDOW_SECONDS });
      }
      if (count <= this.RL_MAX_POINTS) {
        return; // allowed
      }
      // Too many requests, wait until window resets
      const ttl = await this.redisClient.getTimeToLive({ key: this.RL_KEY });
      const waitMs = Math.max(1, ttl) * 1000 + 100;
      await this._sleep(waitMs);
    }
  }

  /**
   * Retrieves an auth token from the Polluted API and caches it in Redis.
   * @returns {Promise<string>} a valid bearer token
   */
  async getAuthToken() {
    try {
      const response = await this.pollutedApi.post('/auth/login', {
        username: pollutedApi.user,
        password: pollutedApi.password,
      });
      this.redisClient.set({ key: KEY_EXTERNAL_POLLUTED_API_AUTH_TOKEN, value: response.data.token, ttlSeconds: EXTERNAL_POLLUTED_API_AUTH_TOKEN_TTL });
      return response.data.token;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetches paginated pollution data for a country with built-in caching and rate limiting.
   * - Checks Redis cache first by {country,page,limit}
   * - Acquires a rate-limit slot prior to external call
   * - Retries on 401 (refresh token) and 429 (Retry-After or exponential backoff)
   * @param {Object} params
   * @param {number} [params.limit=50] - Page size
   * @param {number} [params.page=1] - Page index
   * @param {string} params.country - Country code/name expected by the upstream API
   * @returns {Promise<Object>} upstream response body
   */
  async getCities({ limit = 50, page = 1, country }) {
    try {
      let token = await this.redisClient.get({ key: KEY_EXTERNAL_POLLUTED_API_AUTH_TOKEN });
      if (!token) {
        token = await this.getAuthToken();
      }
      this.pollutedApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Check cache first to avoid unnecessary requests
      const cacheKey = `polluted:cities:${country}:${page}:${limit}`;
      const cached = await this.redisClient.get({ key: cacheKey });
      if (cached) return cached;

      // Acquire rate limit slot before calling external API
      await this._acquireRateLimit();

      const maxRetries = 3;
      let attempt = 0;
      // Exponential backoff base in ms
      const baseDelay = 1000;

      while (true) {
        try {
          const response = await this.pollutedApi.get('/pollution', {
            params: { limit, page, country },
          });
          // Cache successful response
          await this.redisClient.set({ key: cacheKey, value: response.data, ttlSeconds: this.POLLUTION_CACHE_TTL });
          return response.data;
        } catch (err) {
          const status = err?.response?.status;
          if (status === StatusCode.UNAUTHORIZED) {
            await this.getAuthToken();
            attempt++;
          } else if (status === StatusCode.TOO_MANY_REQUESTS) {
            const retryAfter = Number(err?.response?.headers?.['retry-after']);
            const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : baseDelay * Math.pow(2, attempt);
            await this._sleep(delay);
            attempt++;
          } else {
            throw err;
          }

          if (attempt > maxRetries) {
            throw err;
          }

          await this._acquireRateLimit();
          continue;
        }
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PollutedService();
