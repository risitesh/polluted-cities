const Joi = require('joi');
const { Countries } = require('../../constants/countries');
module.exports = {

  // GET /v1/cities
  getCities: {
    query: Joi.object({
      limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .messages({
          'number.base': 'Limit must be a number',
          'number.min': 'Limit must be at least 1',
          'number.max': 'Limit cannot exceed 50'
        }),

      page: Joi.number()
        .integer()
        .min(1)
        .messages({
          'number.base': 'Page must be a number',
          'number.min': 'Page must be at least 1',
        }),

      country: Joi.string()
        .required()
        .valid(...Object.keys(Countries))
        .messages({
          'string.base': 'Country must be a string',
          'any.only': 'Country must be one of the allowed values'
        }),
    }),
  },
};
