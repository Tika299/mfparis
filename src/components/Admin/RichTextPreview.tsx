'use client'

import React from 'react'
import { useField } from '@payloadcms/ui'
import { SafeHtmlContent } from '@/components/SafeHtmlContent'

export const RichTextPreview: React.FC<{ path: string }> = ({ path }) => {
  const { value } = useField<unknown>({ path })

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-dashed border-gray-300">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Che do xem truoc
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          HTML Preview
        </span>
      </div>

      <div className="bg-[#FDFBF9] p-8">
        {value ? (
          <SafeHtmlContent html={value} className="prose max-w-none" />
        ) : (
          <p className="text-center text-sm italic text-gray-300">
            Chua co noi dung de hien thi...
          </p>
        )}
      </div>
    </div>
  )
}
