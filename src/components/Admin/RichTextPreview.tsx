'use client'
import React from 'react'
import { useField } from '@payloadcms/ui'
import { RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'

export const RichTextPreview: React.FC<{ path: string }> = ({ path }) => {
  // Lấy giá trị đang gõ trong ô mô tả
  const { value } = useField<any>({ path })

  return (
    <div className="mt-4 border border-dashed border-gray-300 rounded-2xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Chế độ xem trước (Giao diện người dùng)
        </span>
        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
          Live Preview
        </span>
      </div>

      {/* Khu vực hiển thị nội dung */}
      <div className="p-8 bg-[#FDFBF9]">
        {' '}
        {/* Màu nền trang web của bạn */}
        {value ? (
          <PayloadRichText
            data={
              (value ?? {
                root: {
                  type: 'root',
                  children: [],
                  direction: null,
                  format: '',
                  indent: 0,
                  version: 1,
                },
                version: 1,
              }) as any
            }
          />
        ) : (
          <p className="text-gray-300 italic text-sm text-center">
            Chưa có nội dung để hiển thị...
          </p>
        )}
      </div>
    </div>
  )
}
