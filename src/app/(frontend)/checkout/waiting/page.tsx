'use client'
import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    Loader2,
    ExternalLink,
    CheckCircle2,
    MessageCircle,
    ChevronRight,
    ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'

function WaitingContent() {
    const searchParams = useSearchParams()
    const paymentUrl = searchParams.get('url')
    const orderId = searchParams.get('orderId')

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-20 text-center">

            {/* Hiệu ứng vòng tròn chuyển động */}
            <div className="relative mb-10">
                <div className="absolute inset-0 rounded-full bg-[#b72828]/10 animate-ping"></div>
                <div className="relative w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center border border-gray-50">
                    <Loader2 className="text-[#b72828] animate-spin" size={40} />
                </div>
            </div>

            {/* Tiêu đề */}
            <h1 className="text-3xl md:text-4xl font-bold font-serif italic text-gray-900 mb-4 tracking-tighter">
                Đang chờ thanh toán...
            </h1>

            <p className="max-w-md mx-auto text-gray-500 text-sm leading-relaxed mb-10">
                Một cửa sổ thanh toán của <span className="font-bold text-black text-xs">FUNDIIN</span> đã được mở trong tab mới.
                Vui lòng hoàn tất giao dịch tại đó để đơn hàng được xác nhận.
            </p>

            {/* Khối hành động chính */}
            <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50 space-y-6">

                {/* Nút mở lại nếu bị đóng */}
                {paymentUrl && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bạn không thấy tab thanh toán?</p>
                        <Button
                            asChild
                            className="w-full h-14 bg-[#b72828] hover:bg-black text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest transition-all shadow-lg shadow-red-100"
                        >
                            <a href={decodeURIComponent(paymentUrl)} target="_blank">
                                Thử mở lại trang thanh toán <ExternalLink size={14} className="ml-2" />
                            </a>
                        </Button>
                    </div>
                )}

                {/* Thông tin đơn hàng */}
                <div className="pt-4 flex items-center justify-between text-xs border-t border-gray-50">
                    <span className="text-gray-400 font-medium uppercase tracking-tighter">Mã đơn hàng:</span>
                    <span className="font-black text-[#16423C]">#{orderId || 'MFP-XXXX'}</span>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium uppercase tracking-tighter">Trạng thái:</span>
                    <span className="flex items-center gap-1.5 text-amber-600 font-bold uppercase tracking-tighter">
                        <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></span>
                        Chờ xác nhận
                    </span>
                </div>
            </div>

            {/* Lối tắt quay về hoặc hỗ trợ */}
            <div className="mt-12 flex flex-col items-center gap-6">
                <Link href="/" className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-gray-800 hover:text-[#b72828] transition-colors border-b border-black pb-1">
                    Quay lại trang chủ <ChevronRight size={14} />
                </Link>

                <div className="flex items-center gap-4 pt-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        <ShieldCheck size={14} className="text-emerald-500" /> Thanh toán bảo mật
                    </div>
                    <span className="text-gray-200">|</span>
                    <Link href="/contact" className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter hover:text-black">
                        <MessageCircle size={14} /> Cần hỗ trợ?
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function WaitingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <WaitingContent />
        </Suspense>
    )
}