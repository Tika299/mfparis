'use client'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { io } from 'socket.io-client'
import { Send, User, Search, MessageSquare, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

// Nạp file SCSS của Admin
import '../../app/(payload)/custom.scss'

const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'

const socket = io(socketURL, {
  autoConnect: false,
  reconnection: true
})

export const ChatCenter = () => {
  // --- STATES ---
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSid, setActiveSid] = useState('')
  const [activeName, setActiveName] = useState('')
  const [messages, setMessages] = useState<any[]>([])

  // States cho phân trang
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const [input, setInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // --- REFS ---
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeSidRef = useRef('')
  const prevScrollHeightRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    activeSidRef.current = activeSid
  }, [activeSid])

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3')
  }, [])

  // --- LOGIC FUNCTIONS ---

  // 1. Tải danh sách hội thoại
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions', { cache: 'no-store' })
      const data = await res.json()
      setSessions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Lỗi nạp danh sách inbox')
    }
  }

  // 2. Hàm nạp tin nhắn (Hỗ trợ phân trang)
  const loadMessages = useCallback(async (sid: string, pageNum: number, isLoadMore = false) => {
    if (isLoadMore) setIsLoadingMore(true)
    else setIsLoadingMessages(true)

    try {
      const res = await fetch(`/api/chat/history?sid=${sid}&page=${pageNum}`)
      const data = await res.json()

      // Đảo ngược mảng vì API trả về tin mới nhất lên đầu (-createdAt)
      const newMsgs = Array.isArray(data.docs) ? [...data.docs].reverse() : []

      if (isLoadMore) {
        // Lưu lại chiều cao trước khi thêm tin cũ
        if (scrollRef.current) prevScrollHeightRef.current = scrollRef.current.scrollHeight

        setMessages(prev => [...newMsgs, ...prev])
      } else {
        setMessages(newMsgs)
        // Cuộn xuống đáy ở lần đầu chọn khách
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }, 100)
      }

      setHasMore(data.hasNextPage)
      setPage(data.nextPage || pageNum)
    } catch (error) {
      console.error("Lỗi tải lịch sử")
    } finally {
      setIsLoadingMessages(false)
      setIsLoadingMore(false)
    }
  }, [])

  // 3. Xử lý cuộn để tải tin cũ
  const handleScroll = () => {
    if (!scrollRef.current || isLoadingMore || !hasMore) return

    // Nếu cuộn lên sát đỉnh (cách 10px)
    if (scrollRef.current.scrollTop < 10) {
      loadMessages(activeSid, page, true)

      // Giữ vị trí mắt người dùng sau khi nạp thêm tin
      const currentRef = scrollRef.current
      setTimeout(() => {
        currentRef.scrollTop = currentRef.scrollHeight - prevScrollHeightRef.current
      }, 50)
    }
  }

  // 4. Socket Realtime
  useEffect(() => {
    fetchSessions()
    socket.connect()
    socket.emit('join-room', 'admins')

    const onReceiveMsg = (data: any) => {
      const msgSid = data.sessionId

      // Cập nhật sidebar
      setSessions((prev) => {
        const otherSessions = prev.filter((s) => s.sessionId !== msgSid)
        const existed = prev.find(s => s.sessionId === msgSid)
        const isCurrent = msgSid === activeSidRef.current
        const unreadIncrease = (data.sender === 'customer' && !isCurrent) ? 1 : 0

        if (data.sender === 'customer' && !isCurrent) {
          audioRef.current?.play().catch(() => { })
        }

        return [{
          sessionId: msgSid,
          customerName: data.customerName || existed?.customerName || 'Khách hàng',
          lastMessage: data.content,
          updatedAt: data.createdAt || new Date().toISOString(),
          unreadCount: isCurrent ? 0 : (existed?.unreadCount || 0) + unreadIncrease
        }, ...otherSessions]
      })

      // Cập nhật khung chat
      if (msgSid === activeSidRef.current) {
        setMessages((prev) => {
          if (prev.some(m => m.id === data.id)) return prev
          return [...prev, data]
        })
        if (data.sender === 'customer') {
          fetch('/api/chat/mark-read', { method: 'POST', body: JSON.stringify({ sessionId: msgSid, sender: 'admin' }) })
        }
      }
    }

    socket.on('receive-msg', onReceiveMsg)
    return () => { socket.off('receive-msg'); socket.disconnect() }
  }, [])

  // 5. Chọn khách hàng
  const selectSession = async (sid: string, name: string) => {
    if (sid === activeSid) return
    setActiveSid(sid)
    setActiveName(name)
    setPage(1) // Reset phân trang
    setMessages([])

    socket.emit('join-room', sid)
    await loadMessages(sid, 1, false)

    // Đánh dấu đã đọc trên Sidebar
    setSessions(prev => prev.map(s => s.sessionId === sid ? { ...s, unreadCount: 0 } : s))
    fetch('/api/chat/mark-read', { method: 'POST', body: JSON.stringify({ sessionId: sid, sender: 'admin' }) })
  }

  // 6. Gửi tin nhắn
  const handleSend = async () => {
    if (!input.trim() || !activeSid) return
    const text = input.trim()
    setInput('')

    const payload = {
      sessionId: activeSid,
      customerName: activeName,
      sender: 'admin',
      content: text
    }

    await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  const filteredSessions = sessions.filter(s =>
    s.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="admin-chat-container">
      <div className="admin-chat-wrapper">

        {/* SIDEBAR */}
        <div className="admin-chat-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-top" style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <Link href="/admin" className="back-btn"><ArrowLeft size={18} /></Link>
              <h2 className="sidebar-title" style={{ marginLeft: 10, marginBottom: 0 }}>Hộp thư hỗ trợ</h2>
            </div>
            <div className="sidebar-search">
              <Search className="search-icon" size={16} />
              <input
                placeholder="Tìm khách hàng..."
                className="search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="session-list">
            {filteredSessions.map((s, i) => (
              <div
                key={`${s.sessionId}-${i}`}
                onClick={() => selectSession(s.sessionId, s.customerName)}
                className={`session-item ${activeSid === s.sessionId ? 'is-active' : ''} ${s.unreadCount > 0 ? 'is-unread' : ''}`}
              >
                <div className="avatar-circle">{s.customerName?.[0]?.toUpperCase()}</div>
                <div className="session-info">
                  <div className="session-top">
                    <span className="session-name">{s.customerName}</span>
                    <span className="session-time">
                      {new Date(s.updatedAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="session-bottom">
                    <p className="session-last-msg">{s.lastMessage}</p>
                    {s.unreadCount > 0 && <span className="unread-dot"></span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CHAT */}
        <div className="admin-chat-main">
          {activeSid ? (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="header-avatar"><User size={20} /></div>
                  <div>
                    <h3 className="header-name">{activeName}</h3>
                    <div className="status-indicator"><span className="dot"></span> Trực tuyến</div>
                  </div>
                </div>
              </div>

              <div ref={scrollRef} onScroll={handleScroll} className="chat-messages-area">
                {isLoadingMore && <div className="loading-more"><Loader2 className="animate-spin" size={16} /> Tải thêm tin nhắn...</div>}

                {messages.map((m, i) => (
                  <div key={m.id || i} className={`message-row ${m.sender === 'admin' ? 'is-admin' : 'is-customer'}`}>
                    <div className="message-bubble">
                      <div className="message-text">{m.content}</div>
                      <div className="message-meta">{new Date(m.createdAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input-footer">
                <div className="input-box-wrapper">
                  <input
                    className="chat-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Nhập phản hồi..."
                  />
                  <button onClick={handleSend} className="send-btn"><Send size={18} /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="chat-empty-state">
              <div className="empty-icon-circle"><MessageSquare size={48} /></div>
              <p>Chọn một khách hàng để bắt đầu tư vấn</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}