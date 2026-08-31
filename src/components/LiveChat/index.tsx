'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import {
  MessageSquareDot,
  Send,
  X,
  User,
  ChevronLeft,
  Loader2,
  LogOut,
} from 'lucide-react'
import { cn } from '@/utilities'

const socketURL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  'http://localhost:3001'

type ChatStep =
  | 'ask'
  | 'login'
  | 'register'
  | 'chat'

type ChatProfile = {
  id: string
  name: string
  username?: string
}

type ChatMessage = {
  id?: string
  sender: 'customer' | 'admin'
  content: string
  createdAt?: string
}

type AuthResponse = {
  success: boolean
  user?: ChatProfile
  error?: string
}

type HistoryResponse = {
  docs?: ChatMessage[]
  hasNextPage?: boolean
  nextPage?: number
}

type SocketModule = typeof import('socket.io-client')
type LiveChatSocket = ReturnType<
  SocketModule['io']
>

export const LiveChat = () => {
  const [isOpen, setIsOpen] =
    useState(false)

  const [step, setStep] =
    useState<ChatStep>('ask')

  const [messages, setMessages] =
    useState<ChatMessage[]>([])

  const [profile, setProfile] =
    useState<ChatProfile | null>(null)

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] =
    useState(false)
  const [isLoading, setIsLoading] =
    useState(false)
  const [isLoadingMore, setIsLoadingMore] =
    useState(false)
  const [unreadCount, setUnreadCount] =
    useState(0)

  const [formData, setFormData] =
    useState({
      name: '',
      username: '',
      password: '',
    })

  const [input, setInput] =
    useState('')

  const scrollRef =
    useRef<HTMLDivElement>(null)

  const prevScrollHeightRef =
    useRef(0)

  const preserveScrollAfterPrependRef = useRef(false)

  const scrollToLatestMessage = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const element = scrollRef.current
    if (!element) return

    requestAnimationFrame(() => {
      element.scrollTo({
        top: element.scrollHeight,
        behavior,
      })
    })
  }, [])

  const isOpenRef = useRef(false)

  const socketRef =
    useRef<LiveChatSocket | null>(null)

  const profileRef =
    useRef<ChatProfile | null>(null)

  const socketListenersBoundRef =
    useRef(false)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    if (!isOpen || step !== 'chat' || messages.length === 0) return
    if (preserveScrollAfterPrependRef.current) return

    scrollToLatestMessage()
  }, [isOpen, messages.length, scrollToLatestMessage, step])

  const bindSocketListeners = useCallback(
    (socket: LiveChatSocket) => {
      if (socketListenersBoundRef.current) {
        return
      }

      socket.on(
        'receive-msg',
        (data: ChatMessage) => {
          setMessages((prev) =>
            prev.some(
              (message) =>
                message.id &&
                data.id &&
                message.id === data.id,
            )
              ? prev
              : [...prev, data],
          )

          if (
            data.sender === 'admin' &&
            !isOpenRef.current
          ) {
            setUnreadCount((count) => count + 1)

            new Audio(
              'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
            )
              .play()
              .catch(() => { })
          }
        },
      )

      socketListenersBoundRef.current = true
    },
    [],
  )

  const ensureSocket = useCallback(async () => {
    if (socketRef.current) {
      return socketRef.current
    }

    const { io } = await import(
      'socket.io-client'
    )

    const socket = io(socketURL, {
      autoConnect: false,
      reconnection: true,
      transports: ['websocket'],
    })

    bindSocketListeners(socket)

    socketRef.current = socket
    return socket
  }, [bindSocketListeners])

  const connectSocketForProfile = useCallback(
    async (profileId: string) => {
      const socket = await ensureSocket()

      if (!socket.connected) {
        socket.connect()
      }

      socket.emit('join-room', profileId)
    },
    [ensureSocket],
  )

  const disconnectSocket = useCallback(() => {
    socketRef.current?.disconnect()
  }, [])

  const loadHistory = useCallback(
    async (
      profileId: string,
      pageNum: number,
      isLoadMore = false,
    ) => {
      if (isLoadMore) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        const res = await fetch(
          `/api/chat/history?sid=${profileId}&page=${pageNum}`,
        )

        const data =
          (await res.json()) as HistoryResponse

        const newMsgs = Array.isArray(data.docs)
          ? [...data.docs].reverse()
          : []

        if (isLoadMore) {
          const currentRef = scrollRef.current

          if (currentRef) {
            prevScrollHeightRef.current = currentRef.scrollHeight
            preserveScrollAfterPrependRef.current = true
          }

          setMessages((prev) => [
            ...newMsgs,
            ...prev,
          ])

          setTimeout(() => {
            if (currentRef) {
              currentRef.scrollTop =
                currentRef.scrollHeight -
                prevScrollHeightRef.current
            }

            preserveScrollAfterPrependRef.current = false
          }, 50)
        } else {
          setMessages(newMsgs)
          scrollToLatestMessage('auto')
        }

        setHasMore(Boolean(data.hasNextPage))
        setPage(data.nextPage || pageNum)
      } catch {
        console.error('Lỗi tải lịch sử')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [scrollToLatestMessage],
  )

  const handleScroll = () => {
    if (
      !scrollRef.current ||
      isLoadingMore ||
      !hasMore ||
      !profileRef.current?.id
    ) {
      return
    }

    if (scrollRef.current.scrollTop < 10) {
      loadHistory(
        profileRef.current.id,
        page,
        true,
      )
    }
  }

  useEffect(() => {
    const initializeChat = async () => {
      const savedProfile =
        localStorage.getItem(
          'mf_chat_profile',
        )

      if (!savedProfile) {
        return
      }

      try {
        const user = JSON.parse(
          savedProfile,
        ) as ChatProfile

        setProfile(user)
        setStep('chat')
        await loadHistory(user.id, 1)
        await connectSocketForProfile(user.id)
      } catch {
        localStorage.removeItem(
          'mf_chat_profile',
        )
      }
    }

    initializeChat()

    return () => {
      if (socketRef.current) {
        socketRef.current.off('receive-msg')
        socketRef.current.disconnect()
      }

      socketListenersBoundRef.current = false
    }
  }, [connectSocketForProfile, loadHistory])

  const handleOpenChat = async () => {
    const nextIsOpen = !isOpen
    setIsOpen(nextIsOpen)

    if (nextIsOpen) {
      if (profile?.id) {
        await connectSocketForProfile(
          profile.id,
        )

        if (unreadCount > 0) {
          setUnreadCount(0)

          fetch('/api/chat/mark-read', {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              sessionId: profile.id,
              sender: 'customer',
            }),
          }).catch(() => { })
        }
      } else {
        await ensureSocket()
      }
    }
  }

  const handleAuth = async (
    action: 'login' | 'register',
  ) => {
    setIsLoading(true)

    try {
      const res = await fetch(
        '/api/chat/auth',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            ...formData,
            action,
          }),
        },
      )

      const data =
        (await res.json()) as AuthResponse

      if (data.success && data.user) {
        localStorage.setItem(
          'mf_chat_profile',
          JSON.stringify(data.user),
        )

        setProfile(data.user)
        setStep('chat')

        await loadHistory(data.user.id, 1)
        await connectSocketForProfile(
          data.user.id,
        )
      } else {
        alert(
          data.error ||
          'Không thể xác thực tài khoản.',
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage =
    async () => {
      if (!input.trim() || !profile) {
        return
      }

      const socket = await ensureSocket()

      if (!socket.connected) {
        socket.connect()
        socket.emit(
          'join-room',
          profile.id,
        )
      }

      const msgData = {
        sessionId: profile.id,
        customerName: profile.name,
        sender: 'customer' as const,
        content: input.trim(),
      }

      socket.emit(
        'client-send-msg',
        msgData,
      )

      setInput('')

      await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(msgData),
      })
    }

  const handleLogout = () => {
    localStorage.removeItem(
      'mf_chat_profile',
    )
    setProfile(null)
    setStep('ask')
    setMessages([])
    setPage(1)
    setHasMore(false)
    disconnectSocket()
  }

  return (
    <div className="relative font-sans antialiased">
      <button
        onClick={handleOpenChat}
        className={cn(
          'relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all',
          isOpen
            ? 'bg-white text-gray-500'
            : 'bg-[#b72828] text-white',
        )}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <MessageSquareDot size={30} />
        )}

        {!isOpen && unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 text-[10px] font-black text-white animate-bounce">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute bottom-20 right-0 z-[1000] flex h-[550px] w-[320px] animate-in slide-in-from-bottom-10 flex-col overflow-hidden rounded-[2.5rem] border bg-white shadow-2xl md:w-[380px]">
          <div className="relative bg-[#b72828] p-6 text-center text-white">
            <h4 className="font-serif font-bold italic">
              MF Paris Support
            </h4>

            {profile ? (
              <button
                onClick={handleLogout}
                className="absolute right-6 top-6 opacity-60"
              >
                <LogOut size={16} />
              </button>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden bg-[#FDFBF9]">
            {step === 'chat' ? (
              <>
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
                >
                  {isLoadingMore ? (
                    <div className="flex justify-center py-2">
                      <Loader2
                        className="animate-spin text-gray-300"
                        size={16}
                      />
                    </div>
                  ) : null}

                  {messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={cn(
                        'flex max-w-[88%] flex-col',
                        message.sender ===
                          'customer'
                          ? 'ml-auto items-end'
                          : 'mr-auto items-start',
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-2xl p-3 text-[13px] shadow-sm',
                          message.sender ===
                            'customer'
                            ? 'rounded-tr-none bg-[#b72828] text-white'
                            : 'rounded-tl-none border bg-white text-gray-700',
                        )}
                      >
                        {message.content}
                      </div>

                      <span className="mt-1 text-[9px] font-bold uppercase text-gray-300">
                        {new Date(
                          message.createdAt ||
                          new Date(),
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  data-enter-scope
                  className="flex gap-2 border-t bg-white p-3 sm:p-4"
                >
                  <input
                    value={input}
                    onChange={(e) =>
                      setInput(
                        e.target.value,
                      )
                    }
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      handleSendMessage()
                    }
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
                {step === 'ask' ? (
                  <div className="flex h-full flex-col items-center justify-center space-y-6 p-6 text-center sm:p-10">
                    <User
                      size={48}
                      className="text-[#b72828]"
                    />

                    <div className="space-y-2">
                      <h5 className="font-bold">
                        Chào mừng bạn!
                      </h5>

                      <p className="text-xs text-gray-400">
                        Bạn đã từng trò chuyện
                        với chúng tôi chưa?
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setStep('login')
                      }
                      className="w-full rounded-2xl border-2 border-[#b72828] py-4 text-[10px] font-bold uppercase tracking-widest text-[#b72828] transition-all hover:bg-red-50"
                    >
                      Tôi đã có mã truy cập
                    </button>

                    <button
                      onClick={() =>
                        setStep(
                          'register',
                        )
                      }
                      className="w-full rounded-2xl bg-[#b72828] py-4 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg"
                    >
                      Tôi là khách mới
                    </button>
                  </div>
                ) : null}

                {step === 'login' ? (
                  <div
                    data-enter-scope
                    className="space-y-4 p-6 sm:p-8"
                  >
                    <button
                      onClick={() =>
                        setStep('ask')
                      }
                      className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400"
                    >
                      <ChevronLeft size={14} />{' '}
                      Quay lại
                    </button>

                    <h5 className="text-center font-bold">
                      Tiếp tục trò chuyện
                    </h5>

                    <input
                      className="w-full border-b py-3 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Tên đăng nhập"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          username:
                            e.target.value,
                        })
                      }
                    />

                    <input
                      type="password"
                      className="w-full border-b py-3 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Mật khẩu"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          password:
                            e.target.value,
                        })
                      }
                    />

                    <button
                      data-enter-action
                      onClick={() =>
                        handleAuth('login')
                      }
                      disabled={isLoading}
                      className="w-full rounded-2xl bg-[#b72828] py-4 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60"
                    >
                      {isLoading
                        ? 'Đang xử lý...'
                        : 'Đăng nhập'}
                    </button>

                    <p className="text-center text-[10px] leading-relaxed text-gray-400">
                      Quên mật khẩu? Liên hệ{' '}
                      <span className="font-bold text-[#b72828]">
                        Hotline/Zalo
                      </span>{' '}
                      để được cấp lại.
                    </p>
                  </div>
                ) : null}

                {step === 'register' ? (
                  <div
                    data-enter-scope
                    className="space-y-4 overflow-y-auto p-6 sm:p-8"
                  >
                    <button
                      onClick={() =>
                        setStep('ask')
                      }
                      className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400"
                    >
                      <ChevronLeft size={14} />{' '}
                      Quay lại
                    </button>

                    <h5 className="text-center font-bold">
                      Tạo mã định danh
                    </h5>

                    <input
                      className="w-full border-b py-2 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Họ tên của bạn"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        })
                      }
                    />

                    <input
                      className="w-full border-b py-2 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Tên đăng nhập tự chọn"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          username:
                            e.target.value,
                        })
                      }
                    />

                    <input
                      type="password"
                      className="w-full border-b py-2 text-sm outline-none focus:border-[#b72828]"
                      placeholder="Mật khẩu tự chọn"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          password:
                            e.target.value,
                        })
                      }
                    />

                    <button
                      data-enter-action
                      onClick={() =>
                        handleAuth(
                          'register',
                        )
                      }
                      disabled={isLoading}
                      className="w-full rounded-2xl bg-[#b72828] py-4 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60"
                    >
                      {isLoading
                        ? 'Đang xử lý...'
                        : 'Bắt đầu Chat'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}