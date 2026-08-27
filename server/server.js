const express = require('express')
const http = require('http')
const path = require('path')
const dotenv = require('dotenv')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

dotenv.config()

const connectDB = require('./config/db')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const { initSocket } = require('./utils/socket')

const authRoutes = require('./routes/authRoutes')
const jobRoutes = require('./routes/jobRoutes')
const applicationRoutes = require('./routes/applicationRoutes')
const userRoutes = require('./routes/userRoutes')
const companyRoutes = require('./routes/companyRoutes')
const bookmarkRoutes = require('./routes/bookmarkRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const aiRoutes = require('./routes/aiRoutes')
const contactRoutes = require('./routes/contactRoutes')
const messageRoutes = require('./routes/messageRoutes')
const interviewRoutes = require('./routes/interviewRoutes')

connectDB()

const app = express()
const server = http.createServer(app)

// --- Security & core middleware ---
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5174',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true)
      }

      const originUrl = new URL(origin)
      const isLocalhost = ['localhost', '127.0.0.1'].includes(originUrl.hostname)
      const isDevPort = originUrl.port.startsWith('517')

      if (isLocalhost && isDevPort) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      callback(new Error(`CORS policy does not allow access from ${origin}`))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '10kb' }))

const uploadsPath = path.join(__dirname, 'uploads')
const fs = require('fs')
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true })
}

app.use(
  '/uploads',
  express.static(uploadsPath, {
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin')
      res.set('Access-Control-Allow-Origin', '*')
    },
  })
)
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'))

// Rate limit: applies to all /api routes, generous enough for normal use
// but blocks brute-force login attempts and scraping
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})
app.use('/api', apiLimiter)

// --- Initialize Socket.io ---
initSocket(server, allowedOrigins)

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/auth', authRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/users', userRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/bookmarks', bookmarkRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/interviews', interviewRoutes)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CareerHub API is running'
  });
});

// --- Error handling (must be last) ---
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`CareerHub API with Real-time WebSockets running on port ${PORT}`))
