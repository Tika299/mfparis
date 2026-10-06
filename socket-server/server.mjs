import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'
import { createHmac, timingSafeEqual } from 'node:crypto'

const app = express()
app.use(express.json({ limit: '1mb' }))

const httpServer = createServer(app)

const PORT = Number(process.env.SOCKET_PORT || process.env.PORT || 3001)

const allowedOrigins = (process.env.SOCKET_CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const INTERNAL_TOKEN = process.env.SOCKET_INTERNAL_TOKEN || ''
const TICKET_SECRET = process.env.SOCKET_TICKET_SECRET || ''

if (!INTERNAL_TOKEN || !TICKET_SECRET) {
  throw new Error('SOCKET_INTERNAL_TOKEN and SOCKET_TICKET_SECRET must be configured')
}

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (
        (process.env.NODE_ENV !== 'production' && !origin) ||
        (origin && allowedOrigins.includes(origin))
      ) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked: ${origin}`))
    },
    methods: ['GET', 'POST'],
  },
})

function verifySocketTicket(ticket) {
  if (!ticket || typeof ticket !== 'string') return null

  const [encodedPayload, signature] = ticket.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = createHmac('sha256', TICKET_SECRET)
    .update(encodedPayload)
    .digest('base64url')
  const provided = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const claims = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    const now = Math.floor(Date.now() / 1000)

    if (
      (claims.role !== 'admin' && claims.role !== 'customer') ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= now ||
      claims.iat > now + 30 ||
      (claims.role === 'customer' && !claims.profileId)
    ) {
      return null
    }

    return claims
  } catch {
    return null
  }
}

io.use((socket, next) => {
  const claims = verifySocketTicket(socket.handshake.auth?.ticket)

  if (!claims) {
    return next(new Error('Invalid or expired socket ticket'))
  }

  socket.data.role = claims.role
  socket.data.profileId = claims.profileId
  next()
})

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'mfparis-socket',
    port: PORT,
  })
})

io.on('connection', (socket) => {
  console.log(`✅ Connected: ${socket.id} (${socket.data.role})`)

  socket.on('join-room', (roomId) => {
    if (!roomId) return

    const requestedRoom = String(roomId)
    const isAdmin = socket.data.role === 'admin'
    const canJoin = isAdmin
      ? requestedRoom === 'admins' || /^\d+$/.test(requestedRoom)
      : requestedRoom === String(socket.data.profileId)

    if (!canJoin) {
      socket.emit('room-error', 'Bạn không có quyền vào phòng này.')
      return
    }

    socket.join(requestedRoom)
    console.log(`💬 Socket [${socket.id}] joined room: ${requestedRoom}`)
  })

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`)
  })
})

app.post('/broadcast-admin', (req, res) => {
  if (!INTERNAL_TOKEN) {
    return res.status(500).json({
      error: 'Socket internal token is not configured',
    })
  }

  const token = req.headers['x-socket-token']

  if (token !== INTERNAL_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized',
    })
  }

  const data = req.body
  const sid = data?.profile?.id || data?.profile || data?.sessionId

  if (!sid) {
    return res.status(400).json({
      error: 'Missing sessionId/profile id',
    })
  }

  const payload = {
    ...data,
    sessionId: sid,
  }

  console.log('📨 Received broadcast request:', {
    sid,
    sender: payload.sender,
    id: payload.id,
  })

  io.to(String(sid)).emit('receive-msg', payload)
  io.to('admins').emit('receive-msg', payload)

  const sidRoom = io.sockets.adapter.rooms.get(String(sid))
  const adminsRoom = io.sockets.adapter.rooms.get('admins')

  console.log('📢 Broadcasted:', {
    sid: String(sid),
    sidClients: sidRoom?.size || 0,
    adminsClients: adminsRoom?.size || 0,
  })

  return res.status(200).json({
    ok: true,
  })
})

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 MF Paris Socket running on port ${PORT}`)
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`)
})
