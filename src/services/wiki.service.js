const axios = require('axios');
const redisCache = require('../utils/cache');
const WIKI_CACHE_TTL = 24 * 60 * 60; // 24h
const WIKI_CACHE_PREFIX = 'wiki:desc:';
const WIKI_NEG_CACHE_TTL = 60 * 60; // 1h for negative cache

/**
 * Service for fetching short Wikipedia descriptions for cities.
 * Uses Redis caching to avoid repeated calls and applies a short negative cache
 * window when no description is found or a request fails.
 */
class WikiService {
  /**
   * Binds the Redis cache client for storing description lookups.
   */
  constructor() {
    this.redisClient = redisCache;
  }

  /**
   * Returns a concise Wikipedia description for a given city.
   * - Checks Redis cache first under key `wiki:desc:${cityName}`
   * - Queries REST v1 summary endpoint; if ambiguous/missing, performs a title search
   *   and retries summary for the top result
   * - Stores positive results for 24h; stores empty string for 1h on miss/error (negative cache)
   *
   * @param {string} cityName - City name (e.g., "Berlin")
   * @returns {Promise<string|null>} Description text, empty string cached for misses, null if not available in-process
   */
  async getWikiDescription(cityName) {
    if (!cityName) return null;
    const cacheKey = `${WIKI_CACHE_PREFIX}${cityName}`;
    const cached = await this.redisClient.get({ key: cacheKey });
    if (cached) return cached;
    try {
      const headers = {
        'Accept': 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'polluted-cities/1.0 (+https://github.com/risitesh/polluted-cities)'
      };
      const title = encodeURIComponent(cityName.replace(/\s+/g, '_'));
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
      let { data } = await axios.get(url, { headers });
      let desc = data?.extract || null;

      // Fallback: try title search to resolve better page
      if (!desc || data?.type === 'disambiguation') {
        const q = encodeURIComponent(cityName);
        const searchUrl = `https://en.wikipedia.org/api/rest_v1/search/title?q=${q}&limit=1`;
        const searchRes = await axios.get(searchUrl, { headers });
        const top = searchRes?.data?.pages?.[0];
        const bestKey = top?.key || top?.title;
        if (bestKey) {
          const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestKey)}`;
          const sumRes = await axios.get(sumUrl, { headers });
          desc = sumRes?.data?.extract || desc;
        }
      }

      if (desc) {
        await this.redisClient.set({ key: cacheKey, value: desc, ttlSeconds: WIKI_CACHE_TTL });
        return desc;
      }
      // negative cache to avoid repeated misses
      await this.redisClient.set({ key: cacheKey, value: '', ttlSeconds: WIKI_NEG_CACHE_TTL });
      return null;
    } catch (_) {
      // negative cache on error as well
      await this.redisClient.set({ key: `${cacheKey}:err`, value: '', ttlSeconds: WIKI_NEG_CACHE_TTL });
      return null;
    }
  }
}

module.exports = new WikiService();