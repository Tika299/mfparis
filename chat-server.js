import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'

const app = express()
app.use(express.json())

const httpServer = createServer(app)

const PORT = Number(process.env.SOCKET_PORT || process.env.PORT || 3001)

const allowedOrigins = (process.env.SOCKET_CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked: ${origin}`))
    },
    methods: ['GET', 'POST'],
  },
})

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'mfparis-socket',
  })
})

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId)
    console.log(`💬 Connection [${socket.id}] joined room: ${roomId}`)
  })

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`)
  })
})

app.post('/broadcast-admin', (req, res) => {
  const data = req.body
  const sid = data.profile?.id || data.profile || data.sessionId

  if (!sid) {
    return res.status(400).send('Missing ID')
  }

  const payload = { ...data, sessionId: sid }

  io.to(sid).emit('receive-msg', payload)
  io.to('admins').emit('receive-msg', payload)

  console.log(`📢 Broadcasted message to Room [${sid}] and Room [admins]`)

  return res.status(200).send('OK')
})

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Server Socket running on port ${PORT}`)
})