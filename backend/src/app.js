const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const { authRouter } = require('./routes/auth.routes')
const { routesRouter } = require('./routes/routes.routes')
const { incidentsRouter } = require('./routes/incidents.routes')
const { predictionsRouter } = require('./routes/predictions.routes')
const { analyticsRouter } = require('./routes/analytics.routes')
const { alertsRouter } = require('./routes/alerts.routes')
const { adminRouter }  = require('./routes/admin.routes')

function createApp() {
  const app = express()

  app.use(cors({ origin: '*', credentials: true }))
  app.use(express.json({ limit: '10mb' }))
  app.use(morgan('dev'))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/routes', routesRouter)
  app.use('/api/incidents', incidentsRouter)
  app.use('/api/predict', predictionsRouter)
  app.use('/api/analytics', analyticsRouter)
  app.use('/api/alerts', alertsRouter)
  app.use('/api/admin', adminRouter)

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err?.statusCode || 500
    res.status(status).json({ error: err?.message || 'Internal Server Error' })
  })

  return app
}

module.exports = { createApp }

