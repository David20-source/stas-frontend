'use strict'
const { ZodError } = require('zod')

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // Zod validation errors → 400 with field-level detail
  if (err instanceof ZodError) {
    return res.status(400).json({
      error:   'Validation failed',
      details: err.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message,
      })),
    })
  }

  const status  = err.statusCode || err.status || 500
  const message = err.message    || 'Internal Server Error'

  if (status >= 500) console.error(`[error] ${status} —`, err)

  res.status(status).json({ error: message })
}

module.exports = { errorHandler }
