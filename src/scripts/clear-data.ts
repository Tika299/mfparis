import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { getPayload } from 'payload'
import configPromise from '@payload-config'

async function clearProductsOnly() {
    const configPromise = (await import('@payload-config')).default

    const payload = await getPayload({
        config: configPromise,
    })

    const collection = 'products' as const

    console.log('🚀 Bắt đầu xóa dữ liệu products...')

    try {
        const { docs } = await payload.find({
            collection,
            limit: 10000,
            depth: 0,
        })

        if (docs.length === 0) {
            console.log('👉 Collection [products] đã trống, không cần xóa.')
            process.exit(0)
        }

        console.log(`Tìm thấy ${docs.length} sản phẩm. Đang tiến hành xóa...`)

        let deletedCount = 0

        for (const doc of docs) {
            await payload.delete({
                collection,
                id: doc.id,
            })
            deletedCount++
        }

        console.log(`✅ Đã xóa thành công ${deletedCount} sản phẩm.`)
        console.log('🎉 Bạn có thể import lại dữ liệu mới.')
        process.exit(0)
    } catch (error) {
        console.error('❌ Lỗi khi xóa dữ liệu products:', error)
        process.exit(1)
    }
}

clearProductsOnly()