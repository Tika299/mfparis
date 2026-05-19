// chat-server.js
import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'

const app = express()
app.use(express.json())
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
})

io.on('connection', (socket) => {
  socket.on('join-room', (sessionId) => {
    socket.join(sessionId)
    console.log(`💬 User joined: ${sessionId}`)
  })

  socket.on('client-send-msg', (data) => {
    // Gửi cho TOÀN BỘ mọi người trong phòng (bao gồm người gửi)
    io.to(data.sessionId).emit('receive-msg', {
      ...data,
      id: data.id || Date.now().toString(), // Tạo ID tạm nếu chưa có
      createdAt: data.createdAt || new Date().toISOString(),
    })
  })

  socket.on('disconnect', () => {
    console.log('❌ Disconnected')
  })
})

app.post('/broadcast-admin', (req, res) => {
  const data = req.body
  if (data.sessionId) {
    io.to(data.sessionId).emit('receive-msg', data)
    res.status(200).send('OK')
  }
})

httpServer.listen(3001, () => console.log('🔥 Server Socket: 3001'))
