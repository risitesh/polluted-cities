const redis = require('redis');
const { logger } = require('./logger');

class Cache {
  /**
   * @param {string} url Redis connection URL
   */
  constructor(url) {
    this.url = url;
    this.client = redis.createClient({ url: this.url });
    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });
    this._connected = false;
  }

  /**
   * Establishes a Redis connection if not already connected.
   * @returns {Promise<void>}
   */
  async init() {
    if (this._connected) return;
    await this.client.connect();
    this._connected = true;
  }

  /**
   * Get a value by key. JSON parses when possible.
   * @param {{key: string}} param0
   * @returns {Promise<any|null>}
   */
  async get({ key }) {
    if (!this._connected) {
      await this.init();
    }
    const val = await this.client.get(key);
    if (val === null || val === undefined) return null;
    try {
      return JSON.parse(val);
    } catch (_) {
      return val;
    }
  }

  /**
   * Set a value by key. Non-strings are JSON stringified. Optional TTL.
   * @param {{key: string, value: any, ttlSeconds?: number}} param0
   * @returns {Promise<void>}
   */
  async set({ key, value, ttlSeconds }) {
    if (!this._connected) {
      await this.init();
    }
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds && Number.isFinite(ttlSeconds)) {
      await this.client.set(key, payload, { EX: Math.max(0, Math.floor(ttlSeconds)) });
    } else {
      await this.client.set(key, payload);
    }
  }

  /**
   * Gracefully disconnects the Redis client.
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this._connected) {
      await this.client.quit();
      this._connected = false;
    }
  }

  /**
   * Atomically increments a key and returns the incremented value.
   * @param {{key: string}} param0
   * @returns {Promise<number>} incremented value
   */
  async increment({ key }) {
    if (!this._connected) {
      await this.init();
    }
    return await this.client.incr(key);
  }

  /**
   * Returns the remaining TTL of a key in seconds, or -1 if no TTL.
   * @param {{key: string}} param0
   * @returns {Promise<number>}
   */
  async getTimeToLive({ key }) {
    if (!this._connected) {
      await this.init();
    }
    return await this.client.ttl(key);
  }

  /**
   * Sets TTL (in seconds) for a key.
   * @param {{key: string, ttlSeconds: number}} param0
   * @returns {Promise<void>}
   */
  async addTimeToLive({ key, ttlSeconds }) {
    if (!this._connected) {
      await this.init();
    }
    await this.client.expire(key, ttlSeconds);
  }
}

// Export a singleton instance configured from environment
module.exports = new Cache(process.env.REDIS_URL);