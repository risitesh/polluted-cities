const ExtendableError = require('./extendable-error');
const { StatusCode } = require('../constants/statusCode');

/**
 * Class representing an API error.
 * @extends ExtendableError
 */
class APIError extends ExtendableError {
  /**
   * Creates an API error.
   * @param {string} message - Error message.
   * @param {number} status - HTTP status code of error.
   * @param {boolean} isPublic - Whether the message should be visible to user or not.
   */
  constructor({
    message,
    errors,
    stack,
    status = StatusCode.INTERNAL_SERVER_ERROR,
    code,
    isPublic = false,
  }) {
    super({
      message, errors, status, code, isPublic, stack,
    });
  }
}

module.exports = APIError;