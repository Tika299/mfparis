'use client'

import { useAuth } from '@payloadcms/ui'
import React from 'react'

type Props = {
  children: React.ReactNode
  description?: string
  title?: string
}

export function AdminAuthRequired({
  children,
  description = 'Bạn cần đăng nhập tài khoản quản trị để sử dụng chức năng này.',
  title = 'Cần đăng nhập admin',
}: Props) {
  const { user } = useAuth()

  if (!user) {
    return (
      <main style={{ maxWidth: 720, padding: 32 }}>
        <section
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: 24,
          }}
        >
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>{title}</h1>
          <p style={{ color: '#555', marginBottom: 18 }}>{description}</p>
          <a
            href="/admin/login"
            style={{
              background: '#b72828',
              borderRadius: 8,
              color: '#fff',
              display: 'inline-block',
              fontWeight: 700,
              padding: '10px 14px',
              textDecoration: 'none',
            }}
          >
            Đăng nhập
          </a>
        </section>
      </main>
    )
  }

  return <>{children}</>
}
