import { toast } from 'sonner'

export const notify = {
    success: (msg: string, desc?: string) => {
        toast.success(msg, {
            description: desc,
            style: { borderLeft: '4px solid #22c55e' } // Màu xanh thành công
        })
    },
    error: (msg: string, desc?: string) => {
        toast.error(msg, {
            description: desc,
            style: { borderLeft: '4px solid #b72828' } // Màu đỏ thương hiệu
        })
    },
    info: (msg: string, desc?: string) => {
        toast(msg, {
            description: desc,
            icon: '🔔',
        })
    }
}