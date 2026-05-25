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

  socket.on('disconnect', () => {
    console.log('❌ Disconnected')
  })
})

app.post('/broadcast-admin', (req, res) => {
  const data = req.body;
  // Payload gửi qua trường 'profile', ta gán lại vào 'sessionId' cho frontend hiểu
  const sid = data.profile?.id || data.profile || data.sessionId;

  if (sid) {
    io.to(sid).emit('receive-msg', { ...data, sessionId: sid });
    return res.status(200).send('OK');
  }
  res.status(400).send('Missing ID');
});

httpServer.listen(3001, () => console.log('🔥 Server Socket: 3001'))
