# Polluted Cities Backend

This is the backend API for the Polluted Cities application, built with Node.js.

---

## 🚀 Requirements

- **Node.js**: v22.13.1  
- **NPM**: v10.9.2

---

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/risitesh/polluted-cities.git
   cd polluted-cities
   ```

2. **Install dependencies**
    ```bash
    npm install
    ```

3. **Setup environment variables**
    - Copy the `.example.env` file to `.env`
    ```bash
    cp .example.env .env
    ```
    - Fill the values in `.env`

4. **Running the server**
    - To start the backend server, run
    ```bash
    npm start
    ```
    - It'll default run on port 3000 unless changed in the .env

5. **Environment variables**
    - `PORT` (number)
      - Port for the HTTP server. Defaults to `3000` if not set.
    - `ENV` (string)
      - Runtime environment. Use `production` in prod; `localhost` enables verbose logging and disables prod-only tooling.
    - `POLLUTED_API_URL` (string, required)
      - Base URL for the external pollution API, e.g. `https://api.example.com`.
    - `POLLUTED_API_USER` (string, required)
      - Username for pollution API auth.
    - `POLLUTED_API_PASSWORD` (string, required)
      - Password for pollution API auth.
    - `REDIS_URL` (string, required)
      - Redis connection URL, e.g. `redis://localhost:6379`.
    - `CITIES_API_URL` (string, required)
      - Base URL for CountriesNow API, e.g. `https://countriesnow.space`.

---

## 🏙️ How do we determine whether something is a city?

* **Authoritative list per country**
  - We query CountriesNow API (`/api/v0.1/countries/cities`) via `src/services/cities.service.js#getListOfCitiesBasedOnCountry()` to fetch an allowlist of valid city names for a given country.
* **Filtering external results**
  - Data from the external Pollution API is filtered to only include entries whose `name` exists in the allowlist (`src/controllers/cities.controller.js#getCities`).
* **Country resolution**
  - Country code (e.g., `DE`) is mapped to full name via `src/constants/countries.js` and then lowercased when querying CountriesNow.

---

## ⚠️ Limitations and assumptions

* **External API dependencies**
  - Pollution API requires authentication and enforces rate limit of 5 requests per 10 seconds. We enforce a Redis-backed limiter and retries.
* **Caching behavior**
  - Pollution responses cached for 30s (`polluted.service.js`).
  - Cities list per country cached for 1h (`cities.service.js`).
  - Wikipedia descriptions cached for 24h; negative cache (miss/error) for 1h (`wiki.service.js`).
* **Descriptions**
  - Wikipedia summary may be empty or generic (e.g., disambiguation). We attempt a title search fallback; if unresolved, `description` is an empty string.
* **Pagination semantics**
  - The API response returns `{ page, limit, total, cities }` where `total` reflects `totalPages` from the Pollution API’s `meta`, not total items.
* **Country/city naming**
  - City name comparisons are exact string matches against CountriesNow results; naming differences or alternative spellings may exclude valid cities.
* **Infrastructure**
  - Requires a reachable Redis instance (`REDIS_URL`).