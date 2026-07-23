const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Runs after express-validator check(...) chains in a route definition.
 * If any validation failed, forwards a formatted 400 AppError.
 */
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const messages = errors.array().map((e) => `${e.path}: ${e.msg}`);
  return next(new AppError(messages.join(', '), 400));
};
