'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import {
  MessageCircle, Send, X, User,
  ChevronLeft, Loader2, LogOut, MessageSquareDot
} from 'lucide-react'
import { cn } from '@/utilities'

const socket = io('http://localhost:3001', {
  autoConnect: false,
  reconnection: true,
  transports: ['websocket']
})

export const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'ask' | 'login' | 'register' | 'chat'>('ask')

  // DỮ LIỆU CHAT
  const [messages, setMessages] = useState<any[]>([]) // Luôn đảm bảo là mảng
  const [profile, setProfile] = useState<any>(null)

  // PHÂN TRANG
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const [formData, setFormData] = useState({ name: '', username: '', password: '' })

  const scrollRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const isOpenRef = useRef(false)
  const [input, setInput] = useState('')

  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  // 1. HÀM TẢI LỊCH SỬ (Hỗ trợ phân trang)
  const loadHistory = useCallback(async (profileId: string, pageNum: number, isLoadMore = false) => {
    if (isLoadMore) setIsLoadingMore(true)
    else setIsLoading(true)

    try {
      const res = await fetch(`/api/chat/history?sid=${profileId}&page=${pageNum}`)
      const data = await res.json()

      // Đảo ngược mảng vì API trả về tin mới nhất lên đầu (-createdAt)
      const newMsgs = Array.isArray(data.docs) ? [...data.docs].reverse() : []

      if (isLoadMore) {
        if (scrollRef.current) prevScrollHeightRef.current = scrollRef.current.scrollHeight
        setMessages(prev => [...newMsgs, ...prev])
      } else {
        setMessages(newMsgs)
        // Cuộn xuống cuối lần đầu
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }, 100)
      }

      setHasMore(data.hasNextPage)
      setPage(data.nextPage || pageNum)
    } catch (e) {
      console.error("Lỗi tải lịch sử")
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  // 2. XỬ LÝ CUỘN NGƯỢC TẢI TIN CŨ
  const handleScroll = () => {
    if (!scrollRef.current || isLoadingMore || !hasMore) return
    if (scrollRef.current.scrollTop < 10) {
      loadHistory(profile.id, page, true)
      // Giữ vị trí cuộn
      if (scrollRef.current) {
        const currentRef = scrollRef.current
        setTimeout(() => {
          currentRef.scrollTop = currentRef.scrollHeight - prevScrollHeightRef.current
        }, 50)
      }
    }
  }

  // KHỞI TẠO & SOCKET
  useEffect(() => {
    const savedProfile = localStorage.getItem('mf_chat_profile')
    if (savedProfile) {
      const user = JSON.parse(savedProfile)
      setProfile(user); setStep('chat')
      loadHistory(user.id, 1)
      socket.connect()
      socket.emit('join-room', user.id)
    }

    const handleNewMsg = (data: any) => {
      setMessages((prev) => prev.some(m => m.id === data.id) ? prev : [...prev, data])
      if (data.sender === 'admin' && !isOpenRef.current) {
        setUnreadCount(c => c + 1)
        new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => { })
      }
    }
    socket.on('receive-msg', handleNewMsg)
    return () => { socket.off('receive-msg'); socket.disconnect() }
  }, [loadHistory])

  // ĐÁNH DẤU ĐÃ ĐỌC
  useEffect(() => {
    if (isOpen && unreadCount > 0 && profile?.id) {
      setUnreadCount(0)
      fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: profile.id, sender: 'customer' })
      })
    }
  }, [isOpen, profile, unreadCount])

  const handleAuth = async (action: 'login' | 'register') => {
    setIsLoading(true)
    const res = await fetch('/api/chat/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, action })
    })
    const data = await res.json()
    if (data.success) {
      localStorage.setItem('mf_chat_profile', JSON.stringify(data.user))
      setProfile(data.user); setStep('chat'); loadHistory(data.user.id, 1)
      socket.connect(); socket.emit('join-room', data.user.id)
    } else alert(data.error)
    setIsLoading(false)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !profile) return
    const msgData = { sessionId: profile.id, customerName: profile.name, sender: 'customer', content: input.trim() }
    socket.emit('client-send-msg', msgData)
    setInput('')
    await fetch('/api/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msgData) })
  }

  return (
    <div className="relative font-sans antialiased">
      <button onClick={() => setIsOpen(!isOpen)} className={cn("w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all relative", isOpen ? "bg-white text-gray-500" : "bg-[#b72828] text-white")}>
        {isOpen ? <X size={24} /> : <MessageSquareDot size={30} />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white animate-bounce">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[320px] md:w-[380px] h-[550px] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border animate-in slide-in-from-bottom-10 z-[1000]">
          <div className="bg-[#b72828] p-6 text-white text-center relative">
            <h4 className="font-bold font-serif italic">MF Paris Support</h4>
            {profile && <button onClick={() => { localStorage.removeItem('mf_chat_profile'); setProfile(null); setStep('ask'); socket.disconnect() }} className="absolute top-6 right-6 opacity-60"><LogOut size={16} /></button>}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden bg-[#FDFBF9]">
            {step === 'chat' ? (
              <>
                <div ref={scrollRef} onScroll={handleScroll} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                  {isLoadingMore && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="animate-spin text-gray-300" size={16} />
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div
                      key={m.id || i}
                      className={cn(
                        'flex max-w-[88%] flex-col',
                        m.sender === 'customer' ? 'ml-auto items-end' : 'mr-auto items-start',
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-2xl p-3 text-[13px] shadow-sm',
                          m.sender === 'customer'
                            ? 'rounded-tr-none bg-[#b72828] text-white'
                            : 'rounded-tl-none border bg-white text-gray-700',
                        )}
                      >
                        {m.content}
                      </div>
                      <span className="mt-1 text-[9px] font-bold uppercase text-gray-300">
                        {new Date(m.createdAt || new Date()).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>

                <div data-enter-scope className="flex gap-2 border-t bg-white p-3 sm:p-4">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="h-10 flex-1 rounded-xl bg-gray-50 px-4 text-sm outline-none"
                    placeholder="Nhắn tin..."
                  />
                  <button
                    data-enter-action
                    onClick={handleSendMessage}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b72828] text-white"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* 1. MÀN HÌNH HỎI */}
                {step === 'ask' && (
                  <div className="flex h-full flex-col items-center justify-center space-y-6 p-6 text-center sm:p-10">
                    <User size={48} className="text-[#b72828]" />
                    <div className="space-y-2">
                      <h5 className="font-bold">Chào mừng bạn!</h5>
                      <p className="text-xs text-gray-400">Bạn đã từng trò chuyện với chúng tôi chưa?</p>
                    </div>
                    <button
                      onClick={() => setStep('login')}
                      className="w-full rounded-2xl border-2 border-[#b72828] py-4 text-[10px] font-bold uppercase tracking-widest text-[#b72828] transition-all hover:bg-red-50"
                    >
                      Tôi đã có mã truy cập
                    </button>
                    <button
                      onClick={() => setStep('register')}
                      className="w-full rounded-2xl bg-[#b72828] py-4 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg"
                    >
                      Tôi là khách mới
                    </button>
                  </div>
                )}

                {/* 2. MÀN HÌNH ĐĂNG NHẬP */}
                {step === 'login' && (
                  <div data-enter-scope className="space-y-4 p-6 sm:p-8">
                    <button
                      onClick={() => setStep('ask')}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400"
                    >
                      <ChevronLeft size={14} /> Quay lại
                    </button>
                    <h5 className="text-center font-bold">Tiếp tục trò chuyện</h5>
                    <input
                      className="w-full border-b py-3 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Tên đăng nhập"
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                    <input
                      type="password"
                      className="w-full border-b py-3 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Mật khẩu"
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      data-enter-action
                      onClick={() => handleAuth('login')}
                      disabled={isLoading}
                      className="w-full rounded-2xl bg-[#b72828] py-4 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60"
                    >
                      {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                    </button>
                    <p className="text-center text-[10px] leading-relaxed text-gray-400">
                      Quên mật khẩu? Liên hệ <span className="font-bold text-[#b72828]">Hotline/Zalo</span> để được cấp lại.
                    </p>
                  </div>
                )}

                {/* 3. MÀN HÌNH ĐĂNG KÝ */}
                {step === 'register' && (
                  <div data-enter-scope className="space-y-4 overflow-y-auto p-6 sm:p-8">
                    <button
                      onClick={() => setStep('ask')}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400"
                    >
                      <ChevronLeft size={14} /> Quay lại
                    </button>
                    <h5 className="text-center font-bold">Tạo mã định danh</h5>
                    <input
                      className="w-full border-b py-2 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Họ tên của bạn"
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <input
                      className="w-full border-b py-2 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Tên đăng nhập tự chọn"
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                    <input
                      type="password"
                      className="w-full border-b py-2 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Mật khẩu tự chọn"
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      data-enter-action
                      onClick={() => handleAuth('register')}
                      disabled={isLoading}
                      className="w-full rounded-2xl bg-[#b72828] py-4 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60"
                    >
                      {isLoading ? 'Đang xử lý...' : 'Bắt đầu Chat'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}