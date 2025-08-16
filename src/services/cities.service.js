const axios = require('axios');
const { citiesApi } = require('../config/vars');
const redisCache = require('../utils/cache');

/**
 * Service for retrieving cities by country from the CountriesNow API,
 * with Redis caching to reduce external calls.
 */
class CitiesService {
  /**
   * Initializes an Axios client for the Cities API and binds a Redis cache client.
   */
  constructor() {
    this.citiesApi = axios.create({
      baseURL: citiesApi.url,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.redisClient = redisCache;
  }

  /**
   * Returns a list of city names for a given country.
   * - Checks Redis cache first using key `cities:${country}`.
   * - If not cached, queries CountriesNow endpoint and caches the result for 1 hour.
   *
   * @param {{ country: string }} params - Country name as expected by the API (e.g., "Poland").
   * @returns {Promise<string[]>} Array of city names.
   */
  async getListOfCitiesBasedOnCountry({ country }) {
    try {
      const cacheKey = `cities:${country}`;
      const cached = await this.redisClient.get({ key: cacheKey });
      if (cached) return cached;
      const cities = await this.citiesApi.post('/api/v0.1/countries/cities', { country });
      if (cities.data.error) {
        throw new Error(cities.data.msg);
      }
      await this.redisClient.set({ key: cacheKey, value: cities.data.data, ttlSeconds: 60 * 60 });
      return cities.data.data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CitiesService();
