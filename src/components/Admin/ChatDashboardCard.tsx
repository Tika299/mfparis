import React from 'react'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { MessageSquare, ArrowRight, Zap } from 'lucide-react'

export const ChatDashboardCard = async () => {
  const payload = await getPayload({ config: configPromise })

  const messagesRes = await payload.find({
    collection: 'messages',
    limit: 1,
  })

  return (
    <div className="chat-card-wrapper">
      {/* Khung Card chính */}
      <div className="chat-card">
        {/* Bên trái: Icon và Thông tin */}
        <div className="chat-card__left">
          <div className="chat-card__icon-box">
            <MessageSquare size={32} />
          </div>

          <div className="chat-card__info">
            <div className="chat-card__title-container">
              <h3 className="chat-card__title">Trung tâm Chat</h3>
              <div className="chat-card__ping"></div>
            </div>
            <p className="chat-card__count">{messagesRes.totalDocs} Tin nhắn đã ghi nhận</p>
          </div>
        </div>

        {/* Bên phải: Nút bấm */}
        <div className="chat-card__right">
          <Link href="/admin/chat" className="chat-card__btn">
            Mở khung tư vấn khách hàng
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Dòng mẹo nhỏ bên dưới */}
      <div className="chat-card__tip">
        <Zap size={12} />
        <span>
          Mẹo: Hãy phản hồi khách ngay khi nhận được thông báo Telegram để tăng uy tín shop.
        </span>
      </div>
    </div>
  )
}
