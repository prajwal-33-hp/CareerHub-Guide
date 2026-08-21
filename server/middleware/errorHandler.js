// Centralized error handler -- every asyncHandler-wrapped controller that
// throws lands here instead of leaking a raw stack trace to the client.
function notFound(req, res, next) {
  res.status(404)
  next(new Error(`Route not found: ${req.originalUrl}`))
}

function errorHandler(err, req, res, next) {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode
  let message = err.message

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404
    message = 'Resource not found'
  }

  // Mongoose duplicate key (e.g. email or slug already exists)
  if (err.code === 11000) {
    statusCode = 400
    const field = Object.keys(err.keyValue || {})[0]
    message = field ? `${field} already in use` : 'Duplicate field value'
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(err.errors).map((e) => e.message).join(', ')
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })
}

module.exports = { notFound, errorHandler }
