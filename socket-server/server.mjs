import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'

const app = express()
app.use(express.json({ limit: '1mb' }))

const httpServer = createServer(app)

const PORT = Number(process.env.SOCKET_PORT || process.env.PORT || 3001)

const allowedOrigins = (process.env.SOCKET_CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const INTERNAL_TOKEN = process.env.SOCKET_INTERNAL_TOKEN || ''

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
        port: PORT,
    })
})

io.on('connection', (socket) => {
    console.log(`✅ Connected: ${socket.id}`)

    socket.on('join-room', (roomId) => {
        if (!roomId) return

        socket.join(String(roomId))
        console.log(`💬 Socket [${socket.id}] joined room: ${roomId}`)
    })

    socket.on('disconnect', () => {
        console.log(`❌ Disconnected: ${socket.id}`)
    })
})

app.post('/broadcast-admin', (req, res) => {
    if (INTERNAL_TOKEN) {
        const token = req.headers['x-socket-token']

        if (token !== INTERNAL_TOKEN) {
            return res.status(401).json({
                error: 'Unauthorized',
            })
        }
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

    io.to(String(sid)).emit('receive-msg', payload)
    io.to('admins').emit('receive-msg', payload)

    console.log(`📢 Broadcasted to room [${sid}] and [admins]`)

    return res.status(200).json({
        ok: true,
    })
})

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 MF Paris Socket running on port ${PORT}`)
    console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`)
})