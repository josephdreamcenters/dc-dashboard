require('dotenv').config()
const express = require('express')
const cors = require('cors')
const routes = require('./src/routes')
const errorHandler = require('./src/middleware/errorHandler')
require('./src/cron')

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173']

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))
app.use('/api', routes)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`DC Dashboard API running on port ${PORT}`)
})
