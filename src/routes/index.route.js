const express = require('express');
const router = express.Router();
const citiesRoutes = require('./cities.route');

/**
 * GET v1/health
 */
router.get('/health', (req, res) => res.send('OK'));

/**
 * v1/cities
 */
router.use('/cities', citiesRoutes);

module.exports = router;