import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Hàm xóa dấu tiếng Việt triệt để nhất
function removeVietnameseTones(str: string) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|á|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
}

export async function POST(req: Request) {
    try {
        const { orderId } = await req.json();
        const payload = await getPayload({ config: configPromise });
        const order: any = await payload.findByID({ collection: 'orders', id: orderId, depth: 2 });

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        const totalAmount = Math.floor(Number(order.totalAmount));
        const cleanPhone = order.customerInfo.phone.replace(/\D/g, '');

        // Sử dụng domain thật hoặc placeholder hợp lệ thay vì localhost
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost')
            ? 'https://mfparis.vn'
            : process.env.NEXT_PUBLIC_BASE_URL;

        const fundiinBody = {
            merchant_id: process.env.FUNDIIN_MERCHANT_ID || '',
            order_id: String(order.id),
            amount: totalAmount,
            description: removeVietnameseTones(`Thanh toan don hang ${order.id}`),
            return_url: `${baseUrl}/checkout/success`,
            cancel_url: `${baseUrl}/checkout`,
            customer: {
                phone: cleanPhone,
                email: order.customerInfo.email || 'customer@mfparis.vn',
                first_name: removeVietnameseTones(order.customerInfo.fullName || 'Khach hang'),
                last_name: 'MF_Paris', // Không dùng dấu cách
            },
            items: order.items.map((item: any) => ({
                id: String(item.product.id),
                name: removeVietnameseTones(item.product.title.substring(0, 40)),
                price: Math.floor(Number(item.priceAtPurchase)),
                quantity: Number(item.quantity),
                image_url: "https://mfparis.vn/wp-content/uploads/2024/07/lan-duoi-muoi-puressentiel-roll-on-face-and-body-50ml-4.jpg", // Dùng link ảnh chắc chắn sống để test
            })),
        };

        const bodyString = JSON.stringify(fundiinBody);
        const signature = crypto
            .createHmac('sha256', process.env.FUNDIIN_SECRET_KEY || '')
            .update(bodyString)
            .digest('hex');

        const response = await fetch(process.env.FUNDIIN_API_URL!, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-signature': signature,
            },
            body: bodyString,
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("❌ FUNDIIN SERVER ERROR 500:", result);
            return NextResponse.json({ error: 'Fundiin đang bảo trì hoặc dữ liệu sai' }, { status: 400 });
        }

        return NextResponse.json({ paymentUrl: result.data.payment_url });

    } catch (error: any) {
        return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }
}