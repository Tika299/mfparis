'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { io } from 'socket.io-client'
import { MessageCircle, Send, X, User, Loader2 } from 'lucide-react'
import { cn } from '@/utilities'

export const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [name, setName] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sid, setSid] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Khởi tạo socket duy nhất, không bị đổi khi re-render
  const socket = useMemo(() => io('http://localhost:3001', { autoConnect: false }), [])

  useEffect(() => {
    let sessionId = localStorage.getItem('mf_sid') || crypto.randomUUID()
    let savedName = localStorage.getItem('mf_name')
    localStorage.setItem('mf_sid', sessionId)
    setSid(sessionId)

    if (savedName) {
      setName(savedName)
      setIsRegistered(true)
      setIsLoading(true)
      fetch(`/api/chat/history?sid=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          setMessages(data)
          setIsLoading(false)
        })
    }

    // Kết nối socket
    socket.connect()
    socket.emit('join-room', sessionId)

    // Lắng nghe tin nhắn
    socket.on('receive-msg', (data) => {
      setMessages((prev) => {
        // Chống trùng lặp tin nhắn dựa trên ID
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data]
      })
    })

    return () => {
      socket.off('receive-msg')
      socket.disconnect()
    }
  }, [isRegistered, socket])

  // Tự động cuộn xuống cuối
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen])

  const handleSend = async () => {
    if (!input.trim()) return

    // Tạo object tin nhắn tạm thời có ID và Ngày tháng để tránh lỗi UI
    const tempId = Date.now().toString()
    const msg = {
      id: tempId, // Thêm ID tạm
      sessionId: sid,
      customerName: name,
      sender: 'customer',
      content: input,
      createdAt: new Date().toISOString(), // Thêm ngày tháng ngay lập tức
    }

    // 1. Gửi qua socket để hiện ngay lập tức
    socket.emit('client-send-msg', msg)

    // 2. Xóa ô input
    setInput('')

    // 3. Lưu vào Database ngầm
    try {
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      })
    } catch (e) {
      console.error('Lỗi lưu DB:', e)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110',
          isOpen ? 'bg-red-500 rotate-90 text-white' : 'bg-[#16423C] text-white',
        )}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[320px] md:w-[380px] h-[520px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-10 duration-300 z-[1000]">
          <div className="bg-[#16423C] p-6 text-white text-center">
            <h4 className="font-bold text-lg font-serif italic tracking-tight">MF Paris Support</h4>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              <p className="text-[10px] uppercase tracking-widest opacity-70">
                Chúng tôi đang trực tuyến
              </p>
            </div>
          </div>

          {!isRegistered ? (
            <div className="flex-grow flex flex-col items-center justify-center p-10 text-center space-y-6">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-700 shadow-inner">
                <User size={32} />
              </div>
              <div className="space-y-2">
                <h5 className="font-bold text-gray-800">Bắt đầu trò chuyện</h5>
                <p className="text-xs text-gray-400">
                  MF Paris cần biết tên để hỗ trợ bạn tốt nhất.
                </p>
              </div>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-b-2 border-gray-100 py-2 text-center outline-none focus:border-amber-700 transition-all text-sm"
                placeholder="Tên của bạn..."
              />
              <button
                onClick={() => {
                  if (name) {
                    localStorage.setItem('mf_name', name)
                    setIsRegistered(true)
                  }
                }}
                className="w-full bg-[#16423C] text-white py-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em]"
              >
                Bắt đầu
              </button>
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="flex-grow p-5 overflow-y-auto space-y-4 bg-[#FDFBF9] scroll-smooth"
              >
                {isLoading && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-gray-300" />
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={m.id || i}
                    className={cn(
                      'flex flex-col max-w-[80%]',
                      m.sender === 'customer' ? 'ml-auto items-end' : 'mr-auto items-start',
                    )}
                  >
                    <div
                      className={cn(
                        'p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm',
                        m.sender === 'customer'
                          ? 'bg-[#16423C] text-white rounded-tr-none'
                          : 'bg-white text-gray-700 rounded-tl-none border border-gray-100',
                      )}
                    >
                      {m.content}
                    </div>
                    {/* SỬA LỖI INVALID DATE BẰNG CÁCH THÊM FALLBACK */}
                    <span className="text-[8px] uppercase font-bold text-gray-300 mt-1 px-1">
                      {new Date(m.createdAt || new Date()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-white border-t border-gray-50 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-grow text-sm bg-gray-100 rounded-xl px-4 py-2 outline-none focus:bg-white border border-transparent focus:border-gray-200 transition-all"
                  placeholder="Nhắn tin..."
                />
                <button
                  onClick={handleSend}
                  className="w-10 h-10 bg-[#16423C] text-white rounded-xl flex items-center justify-center hover:scale-105 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
