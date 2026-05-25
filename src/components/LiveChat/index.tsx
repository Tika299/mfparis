'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { io } from 'socket.io-client'
import { MessageCircle, Send, X, User, Loader2, ChevronLeft, Lock, UserPlus } from 'lucide-react'
import { cn } from '@/utilities'

const socket = io('http://localhost:3001', { autoConnect: false })

export const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'ask' | 'login' | 'register' | 'chat'>('ask')
  const [profile, setProfile] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')
  const [formData, setFormData] = useState({ name: '', username: '', password: '' })
  const scrollRef = useRef<HTMLDivElement>(null)

  // Kiểm tra trạng thái đã đăng nhập chưa
  useEffect(() => {
    const saved = localStorage.getItem('mf_chat_user')
    if (saved) {
      const user = JSON.parse(saved)
      setProfile(user)
      setStep('chat')
      loadHistory(user.id)
    }
  }, [])

  // Xử lý Socket Realtime
  useEffect(() => {
    if (profile?.id && isOpen) {
      socket.connect()
      socket.emit('join-room', profile.id)
      socket.on('receive-msg', (data) => {
        setMessages((prev) => prev.some(m => m.id === data.id) ? prev : [...prev, data])
      })
    }
    return () => { socket.off('receive-msg'); socket.disconnect(); }
  }, [profile, isOpen])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, step, isOpen])

  const loadHistory = async (id: string) => {
    setIsLoading(true)
    const res = await fetch(`/api/chat/history?sid=${id}`)
    const data = await res.json()
    setMessages(data)
    setIsLoading(false)
  }

  const handleAuth = async (action: 'login' | 'register') => {
    setIsLoading(true)
    const res = await fetch('/api/chat/auth', {
      method: 'POST',
      body: JSON.stringify({ ...formData, action })
    })
    const data = await res.json()
    if (data.success) {
      localStorage.setItem('mf_chat_user', JSON.stringify(data.user))
      setProfile(data.user)
      setStep('chat')
      loadHistory(data.user.id)
    } else {
      alert(data.error)
    }
    setIsLoading(false)
  }

  const handleSend = async () => {
    if (!input.trim()) return
    const msg = { sessionId: profile.id, customerName: profile.name, sender: 'customer', content: input }
    setInput('')
    await fetch('/api/chat/send', { method: 'POST', body: JSON.stringify(msg) })
  }

  return (
    <div className="relative font-sans">
      <button onClick={() => setIsOpen(!isOpen)} className={cn("w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110", isOpen ? "bg-red-500 rotate-90 text-white" : "bg-[#b72828] text-white")}>
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[320px] md:w-[380px] h-[550px] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-10">
          <div className="bg-[#b72828] p-6 text-white text-center">
            <h4 className="font-bold text-lg font-serif italic">MF Paris Support</h4>
          </div>

          <div className="flex-grow flex flex-col overflow-hidden bg-[#FDFBF9]">
            {/* 1. MÀN HÌNH HỎI */}
            {step === 'ask' && (
              <div className="p-10 flex flex-col items-center justify-center h-full text-center space-y-6">
                <User size={48} className="text-[#b72828]" />
                <div className="space-y-2">
                  <h5 className="font-bold">Chào mừng bạn!</h5>
                  <p className="text-xs text-gray-400">Bạn đã từng trò chuyện với chúng tôi chưa?</p>
                </div>
                <button onClick={() => setStep('login')} className="w-full py-4 border-2 border-[#b72828] text-[#b72828] rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all">Tôi đã có mã truy cập</button>
                <button onClick={() => setStep('register')} className="w-full py-4 bg-[#b72828] text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg">Tôi là khách mới</button>
              </div>
            )}

            {/* 2. MÀN HÌNH ĐĂNG NHẬP */}
            {step === 'login' && (
              <div className="p-8 space-y-4">
                <button onClick={() => setStep('ask')} className="text-gray-400 flex items-center gap-1 text-[10px] font-bold uppercase"><ChevronLeft size={14} /> Quay lại</button>
                <h5 className="font-bold text-center">Tiếp tục trò chuyện</h5>
                <input className="w-full border-b py-3 text-sm outline-none focus:border-[#b72828]" placeholder="Tên đăng nhập" onChange={e => setFormData({ ...formData, username: e.target.value })} />
                <input type="password" className="w-full border-b py-3 text-sm outline-none focus:border-[#b72828]" placeholder="Mật khẩu" onChange={e => setFormData({ ...formData, password: e.target.value })} />
                <button onClick={() => handleAuth('login')} className="w-full bg-[#b72828] text-white py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Đăng nhập</button>
                <p className="text-[10px] text-gray-400 text-center leading-relaxed">Quên mật khẩu? Liên hệ <span className="text-[#b72828] font-bold">Hotline/Zalo</span> để được cấp lại.</p>
              </div>
            )}

            {/* 3. MÀN HÌNH ĐĂNG KÝ */}
            {step === 'register' && (
              <div className="p-8 space-y-4 overflow-y-auto">
                <button onClick={() => setStep('ask')} className="text-gray-400 flex items-center gap-1 text-[10px] font-bold uppercase"><ChevronLeft size={14} /> Quay lại</button>
                <h5 className="font-bold text-center">Tạo mã định danh</h5>
                <input className="w-full border-b py-2 text-sm outline-none focus:border-[#b72828]" placeholder="Họ tên của bạn" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                <input className="w-full border-b py-2 text-sm outline-none focus:border-[#b72828]" placeholder="Tên đăng nhập tự chọn" onChange={e => setFormData({ ...formData, username: e.target.value })} />
                <input type="password" className="w-full border-b py-2 text-sm outline-none focus:border-[#b72828]" placeholder="Mật khẩu tự chọn" onChange={e => setFormData({ ...formData, password: e.target.value })} />
                <button onClick={() => handleAuth('register')} className="w-full bg-[#b72828] text-white py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Bắt đầu Chat</button>
              </div>
            )}

            {/* 4. MÀN HÌNH CHAT */}
            {step === 'chat' && (
              <>
                <div ref={scrollRef} className="flex-grow p-5 overflow-y-auto space-y-4 scroll-smooth">
                  {messages.map((m, i) => (
                    <div key={m.id || i} className={cn("flex flex-col max-w-[85%]", m.sender === 'customer' ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div className={cn("p-3 rounded-2xl text-[13px] shadow-sm", m.sender === 'customer' ? "bg-[#b72828] text-white rounded-tr-none" : "bg-white text-gray-700 rounded-tl-none border")}>
                        {m.content}
                      </div>
                      <span className="text-[8px] text-gray-300 mt-1 uppercase font-bold">{new Date(m.createdAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-white border-t flex gap-2">
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-grow text-sm outline-none bg-gray-50 rounded-xl px-4" placeholder="Nhắn tin..." />
                  <button onClick={handleSend} className="w-10 h-10 bg-[#b72828] text-white rounded-xl flex items-center justify-center"><Send size={18} /></button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}