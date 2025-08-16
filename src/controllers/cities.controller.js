const pollutedService = require('../services/polluted.service');
const citiesService = require('../services/cities.service');
const { Countries } = require('../constants/countries');
const wikiService = require('../services/wiki.service');
const { StatusCode } = require('../constants/statusCode');

/**
 * GET /v1/cities
 * Builds a paginated list of polluted cities enriched with a Wikipedia description.
 * Response shape:
 * {
 *   page: number,
 *   limit: number,
 *   total: number,            // total pages as provided by polluted API meta
 *   cities: Array<{
 *     name: string,
 *     country: string,
 *     pollution: number,
 *     description: string
 *   }>
 * }
 */
const getCities = async (req, res, next) => {
  try {
    const { limit, page, country } = req.query;
    const pollutedCities = await pollutedService.getCities({ limit, page, country });
    if (!pollutedCities) {
      return res.status(StatusCode.NO_CONTENT).json({});
    }
    // Map country code (e.g., "DE") to readable name (e.g., "Germany")
    const countryName = Countries[country];
    // Fetch all cities for the country and filter external results against this allowlist
    const listOfCities = await citiesService.getListOfCitiesBasedOnCountry({ country: countryName.toLowerCase() });
    const cities = pollutedCities.results.filter((city) => listOfCities.includes(city.name));
    // Enrich with short Wikipedia descriptions (cached)
    const descriptions = await Promise.all(cities.map((city) => wikiService.getWikiDescription(city.name)));
    const citiesWithDescription = cities.map((city, idx) => ({ ...city, country: countryName, description: descriptions[idx] || '' }));
    // Use meta from polluted API for pagination info
    const { page: currentPage, totalPages } = pollutedCities.meta;
    return res.status(StatusCode.SUCCESS).json({ page: currentPage, limit: limit || 50, total: totalPages, cities: citiesWithDescription });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCities,
};
