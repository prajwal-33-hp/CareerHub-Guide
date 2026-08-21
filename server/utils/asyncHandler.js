// Wraps an async route handler so thrown errors are passed to Express's
// error-handling middleware instead of crashing the process or needing
// try/catch in every single controller.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
