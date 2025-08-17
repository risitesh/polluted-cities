require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes/index.route');
const error = require('./middlewares/error');
const { port, env } = require('./config/vars');
const { logger} = require('./utils/logger');

/**
* Express instance
* @public
*/
const app = express();

// parse body params and attache them to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// Initialize Redis client
const redisClient = require('./utils/cache');
redisClient.init().catch((err) => {
  logger.error('Redis Client Error:', err);
  process.exit(1);
});

// mount api v1 routes
app.use('/v1', routes);

// if error is not an instanceOf APIError, convert it.
app.use(error.converter);

// catch 404 and forward to error handler
app.use(error.notFound);

// error handler, send stacktrace only during development
app.use(error.handler);

// Final error handler (returns proper response)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.code || 500;
  const message = err.message || 'Something went wrong. Our team is looking into it';
  res.status(statusCode).json({ message });
});

app.listen(port, () => logger.info(`server started on port ${port} (${env})`));

module.exports = app;