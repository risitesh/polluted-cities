const express = require('express');
const { getCities } = require('../controllers/cities.controller');
const { validateSchema } = require('../middlewares/validate-schema');
const citiesValidation = require('./validations/cities.validation');
const router = express.Router();

router.route('/').get(validateSchema(citiesValidation.getCities), getCities);

module.exports = router;