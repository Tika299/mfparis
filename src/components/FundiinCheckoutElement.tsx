'use client'

import {
    ArrowRight,
    BadgeCheck,
    CreditCard,
    ShieldCheck,
    Sparkles,
    WalletCards,
} from 'lucide-react'
import { formatPrice } from '@/utilities/formatPrice'

type FundiinPaymentCardProps = {
    amount: number
}

export function FundiinCheckoutElement({ amount }: FundiinPaymentCardProps) {
    const estimatedInstallment = Math.ceil(Number(amount || 0) / 3)

    return (
        <div className="relative overflow-hidden rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-white via-sky-50/60 to-white p-5 shadow-sm">
            {/* Glow nền */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-red-100/50 blur-3xl" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-100">
                            <WalletCards size={24} />
                        </div>

                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-gray-950">
                                    Mua trước, thanh toán linh hoạt
                                </p>

                                <span className="rounded-md bg-sky-500 px-2 py-0.5 text-[10px] font-black tracking-wider text-white">
                                    FUNDIIN
                                </span>
                            </div>

                            <p className="mt-1 text-xs font-medium leading-5 text-gray-500">
                                Xác nhận đơn hàng tại MF Paris, sau đó hệ thống sẽ chuyển bạn sang cổng Fundiin để hoàn tất thanh toán.
                            </p>
                        </div>
                    </div>

                    <Sparkles size={18} className="shrink-0 text-sky-400" />
                </div>

                {/* Amount Card */}
                <div className="mt-5 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Tổng đơn hàng
                            </p>
                            <p className="mt-1 text-xl font-black tracking-tight text-[#b72828]">
                                {formatPrice(amount)}₫
                            </p>
                        </div>

                        <div className="h-10 w-px bg-gray-100" />

                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Ước tính mỗi kỳ
                            </p>
                            <p className="mt-1 text-lg font-black tracking-tight text-gray-950">
                                {formatPrice(estimatedInstallment)}₫
                            </p>
                        </div>
                    </div>
                </div>

                {/* Steps */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-white/80 px-3 py-3 text-center shadow-sm">
                        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-[#b72828]">
                            <BadgeCheck size={16} />
                        </div>
                        <p className="mt-2 text-[10px] font-black uppercase text-gray-400">
                            Bước 1
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-gray-900">
                            Xác nhận đơn
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 px-3 py-3 text-center shadow-sm">
                        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                            <CreditCard size={16} />
                        </div>
                        <p className="mt-2 text-[10px] font-black uppercase text-gray-400">
                            Bước 2
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-gray-900">
                            Sang Fundiin
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 px-3 py-3 text-center shadow-sm">
                        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                            <ShieldCheck size={16} />
                        </div>
                        <p className="mt-2 text-[10px] font-black uppercase text-gray-400">
                            Bước 3
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-gray-900">
                            Hoàn tất
                        </p>
                    </div>
                </div>

                {/* Bottom CTA hint */}
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-gray-950 px-4 py-3 text-white">
                    <div>
                        <p className="text-xs font-black">
                            Sẵn sàng thanh toán qua Fundiin
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-white/60">
                            Bấm nút thanh toán bên phải để tiếp tục
                        </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-950">
                        <ArrowRight size={16} />
                    </div>
                </div>
            </div>
        </div>
    )
}