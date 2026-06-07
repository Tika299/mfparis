import dotenv from 'dotenv'
import path from 'path'

// Nạp file .env vào process.env TRƯỚC KHI gọi Payload
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
import { getPayload } from 'payload'
import configPromise from '@payload-config' // Import cấu hình Payload của bạn

async function clearAllData() {
    // Khởi tạo Payload Local API
    const payload = await getPayload({ config: configPromise })

    // 1. Khai báo mảng các collection theo đúng thứ tự an toàn (Ngọn -> Gốc)
    const collectionsToDelete = [
        'products',
        'posts',
        'categories',
        'brands',
        'post-categories',
        'media',
    ]

    console.log('🚀 Bắt đầu dọn dẹp Database...')

    for (const collection of collectionsToDelete) {
        try {
            console.log(`\n⏳ Đang xử lý collection: [${collection}]...`)

            // 2. Lấy toàn bộ ID của collection hiện tại
            const { docs } = await payload.find({
                collection: collection as any,
                limit: 10000, // Đặt mức limit cao để lấy hết dữ liệu
                depth: 0,     // Tắt depth để query chạy nhanh hơn
                select: ['id'], // Chỉ lấy mỗi trường ID
            })

            if (docs.length === 0) {
                console.log(`👉 Collection [${collection}] đã trống, bỏ qua.`)
                continue
            }

            console.log(`Tìm thấy ${docs.length} bản ghi. Đang tiến hành xóa...`)

            // 3. Xóa từng bản ghi theo ID 
            // (Dùng vòng lặp thay vì deleteMany để Payload trigger đúng các Hook xóa file vật lý trong Media)
            let deletedCount = 0
            for (const doc of docs) {
                await payload.delete({
                    collection: collection as any,
                    id: doc.id,
                })
                deletedCount++
            }

            console.log(`✅ Đã xóa thành công ${deletedCount} bản ghi khỏi [${collection}].`)

        } catch (error) {
            console.error(`❌ Lỗi khi xóa dữ liệu tại collection [${collection}]:`, error)
        }
    }

    console.log('\n🎉 Quá trình dọn dẹp Database đã hoàn tất! Bạn có thể import dữ liệu mới.')
    process.exit(0)
}

// Chạy hàm
clearAllData()