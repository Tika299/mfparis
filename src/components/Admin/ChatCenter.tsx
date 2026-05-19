'use client'
import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { Send, User, Search, MessageCircle, Clock, MessageSquare } from 'lucide-react'

// Kết nối tới Socket Server (Port 3001)
const socket = io('http://localhost:3001')

export const ChatCenter = () => {
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSid, setActiveSid] = useState('')
  const [activeName, setActiveName] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // 1. Tải danh sách hội thoại ban đầu
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions')
      const data = await res.json()
      setSessions(data)
    } catch (error) {
      console.error('Không thể tải danh sách hội thoại:', error)
    }
  }

  useEffect(() => {
    fetchSessions()

    // Hàm xử lý khi nhận tin nhắn mới từ Socket
    const onReceiveMsg = (data: any) => {
      // A. Cập nhật danh sách bên Sidebar (Cột trái)
      setSessions((prev) => {
        const otherSessions = prev.filter((s) => s.sessionId !== data.sessionId)
        return [
          {
            sessionId: data.sessionId,
            customerName: data.customerName,
            lastMessage: data.content,
            updatedAt: new Date().toISOString(),
          },
          ...otherSessions,
        ]
      })

      // B. Cập nhật nội dung chat hiện tại (Cột phải)
      // Chỉ cập nhật nếu tin nhắn đó thuộc về khách hàng đang được chọn
      if (data.sessionId === activeSid) {
        setMessages((prev) => {
          // KIỂM TRA TRÙNG LẶP QUA ID (Giải quyết vấn đề duplicate)
          const isExisting = prev.some((m) => m.id === data.id)
          if (isExisting) return prev
          return [...prev, data]
        })
      }
    }

    socket.on('receive-msg', onReceiveMsg)

    // CLEANUP: Gỡ bỏ listener khi component re-render hoặc đổi activeSid
    return () => {
      socket.off('receive-msg', onReceiveMsg)
    }
  }, [activeSid])

  // 2. Chọn một khách hàng để chat
  const selectSession = async (sid: string, name: string) => {
    setActiveSid(sid)
    setActiveName(name)
    setMessages([]) // Xóa tạm tin cũ để tránh giật lag

    // Tham gia phòng của khách hàng này trên Socket Server
    socket.emit('join-room', sid)

    // Tải lịch sử chat từ Database
    try {
      const res = await fetch(`/api/chat/history?sid=${sid}`)
      const history = await res.json()
      setMessages(history)
    } catch (error) {
      console.error('Lỗi tải lịch sử:', error)
    }
  }

  // 3. Admin gửi tin nhắn
  const handleSend = async () => {
    const messageContent = input.trim()
    if (!messageContent || !activeSid) return

    const payload = {
      sessionId: activeSid,
      customerName: activeName,
      sender: 'admin',
      content: messageContent,
    }

    // Xóa ô nhập ngay lập tức để tạo cảm giác mượt mà
    setInput('')

    // CHỈ GỌI API: Sau khi Payload lưu DB, afterChange Hook sẽ tự bắn socket về
    // hàm onReceiveMsg ở trên sẽ lo việc hiển thị. Cách này chống duplicate 100%.
    try {
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error)
    }
  }

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="admin-chat-container">
      <div className="admin-chat-wrapper">
        {/* CỘT TRÁI: DANH SÁCH KHÁCH */}
        <div className="admin-chat-sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Hộp thư hỗ trợ</h2>
            <div className="sidebar-search">
              <Search className="search-icon" size={16} />
              <input placeholder="Tìm khách hàng..." className="search-input" />
            </div>
          </div>

          <div className="session-list">
            {sessions.length > 0 ? (
              sessions.map((s) => (
                <div
                  key={s.sessionId}
                  onClick={() => selectSession(s.sessionId, s.customerName)}
                  className={`session-item ${activeSid === s.sessionId ? 'is-active' : ''}`}
                >
                  <div className="avatar-circle">{s.customerName[0]?.toUpperCase()}</div>
                  <div className="session-info">
                    <div className="session-top">
                      <span className="session-name">{s.customerName}</span>
                      <span className="session-time">
                        {new Date(s.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="session-last-msg">{s.lastMessage}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-list">Không có hội thoại nào</div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: KHUNG CHAT */}
        <div className="admin-chat-main">
          {activeSid ? (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="header-avatar">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="header-name">{activeName}</h3>
                    <div className="status-indicator">
                      <span className="dot-online"></span>
                      <span>Đang trực tuyến</span>
                    </div>
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="chat-messages-area">
                {messages.map((m, i) => (
                  <div
                    key={m.id || i}
                    className={`message-row ${m.sender === 'admin' ? 'is-admin' : 'is-customer'}`}
                  >
                    <div className="message-bubble">
                      <div className="message-text">{m.content}</div>
                      <div className="message-meta">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input-footer">
                <div className="input-box-wrapper">
                  <input
                    className="chat-input"
                    placeholder={`Trả lời ${activeName}...`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button onClick={handleSend} className="send-btn">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="chat-empty-state">
              <div className="empty-icon-circle">
                <MessageSquare size={40} />
              </div>
              <p>Chọn một hội thoại để trả lời khách hàng</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
