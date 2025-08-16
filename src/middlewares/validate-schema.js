exports.validateSchema = (schemas) => {
  return (req, res, next) => {
    const validSources = ['body', 'query', 'params'];

    for (const key of validSources) {
      if (schemas[key]) {
        const { error, value } = schemas[key].validate(req[key], {
          abortEarly: false,
          convert: true, // coerce types (e.g., strings to numbers)
          stripUnknown: true, // remove unknown keys
        });
        if (error) {
          return res.status(400).json({
            message: 'Validation error',
            source: key,
            details: error.details.map(d => ({ message: d.message, path: d.path })),
          });
        }
        // assign the validated and coerced value back to the request
        req[key] = value;
      }
    }
    next();
  };
};
