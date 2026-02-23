/**
 * Centralized API error handling.
 * Returns structured responses; never exposes stack or internal details in production.
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Send a structured error response and optionally log.
 * @param {Object} res - Express response
 * @param {number} status - HTTP status
 * @param {string} code - Machine-readable error code (e.g. REPORT_NOT_FOUND)
 * @param {string} message - User-facing message
 * @param {Object} [options] - { log: string, err: Error }
 */
function sendError(res, status, code, message, options = {}) {
  if (options.log) {
    console.warn('[API]', options.log);
  }
  if (options.err && !isProduction) {
    console.error(options.err.message || options.err);
  }
  const body = {
    error: code,
    message: message || 'An error occurred.'
  };
  if (!isProduction && options.err && options.err.message) {
    body.details = options.err.message;
  }
  res.status(status).json(body);
}

/**
 * Handle unexpected errors in route handlers (no stack in production).
 */
function handleRouteError(res, err, fallbackMessage = 'Server error') {
  const status = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message && !isProduction ? err.message : fallbackMessage;
  sendError(res, status, code, message, {
    log: fallbackMessage,
    err
  });
}

module.exports = {
  sendError,
  handleRouteError,
  isProduction
};
