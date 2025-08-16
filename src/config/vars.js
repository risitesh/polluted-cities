module.exports = {
  env: process.env.ENV,
  port: process.env.PORT,
  pollutedApi: {
    url: process.env.POLLUTED_API_URL,
    user: process.env.POLLUTED_API_USER,
    password: process.env.POLLUTED_API_PASSWORD,
  },
  citiesApi: {
    url: process.env.CITIES_API_URL,
  }
};