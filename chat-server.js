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
  // Cả Khách và Admin đều dùng lệnh này để vào phòng riêng hoặc phòng tổng
  socket.on('join-room', (roomId) => {
    socket.join(roomId)
    console.log(`💬 Connection [${socket.id}] joined room: ${roomId}`)
  })

  socket.on('disconnect', () => {
    console.log('❌ Disconnected')
  })
})

// ĐÂY LÀ ĐOẠN KHẮC PHỤC LỖI TRÊN ADMIN
app.post('/broadcast-admin', (req, res) => {
  const data = req.body;
  const sid = data.profile?.id || data.profile || data.sessionId;

  if (sid) {
    const payload = { ...data, sessionId: sid };

    // 1. Gửi tới phòng riêng của khách hàng đó (Để khách nhận được)
    io.to(sid).emit('receive-msg', payload);

    // 2. GỬI TỚI PHÒNG 'admins' (Để Admin đang online nhận được thông báo sidebar)
    io.to('admins').emit('receive-msg', payload);

    console.log(`📢 Broadcasted message to Room [${sid}] and Room [admins]`);
    return res.status(200).send('OK');
  }
  res.status(400).send('Missing ID');
});

httpServer.listen(3001, () => console.log('🔥 Server Socket: 3001'))