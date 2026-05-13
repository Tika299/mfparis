import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export default function SuccessPage() {
  return (
    <div className="container mx-auto py-40 text-center">
      <div className="flex justify-center mb-6 text-green-500">
        <CheckCircle size={80} />
      </div>
      <h1 className="text-3xl font-bold uppercase mb-4">Đặt hàng thành công!</h1>
      <p className="text-gray-500 mb-10">
        Cảm ơn bạn đã tin tưởng MF Paris. <br />
        Chúng tôi sẽ liên hệ với bạn để xác nhận đơn hàng trong thời gian sớm nhất.
      </p>
      <Link href="/">
        <Button className="bg-black text-white px-10 h-12 uppercase font-bold">
          Quay lại trang chủ
        </Button>
      </Link>
    </div>
  )
}
