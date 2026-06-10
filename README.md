# 🇫🇷 MF PARIS - High-End E-commerce Platform

**MF PARIS** là nền tảng thương mại điện tử chuyên về **nước hoa, mỹ phẩm, dược mỹ phẩm và thực phẩm chức năng cao cấp**, được xây dựng theo hướng hiện đại, tốc độ cao, dễ mở rộng và tối ưu trải nghiệm mua sắm.

Dự án được phát triển trên hệ sinh thái **Next.js + Payload CMS**, kết hợp với hệ thống realtime chat riêng bằng **Socket.io**, tích hợp thanh toán **Fundiin BNPL**, quản lý sản phẩm đa biến thể, giỏ hàng thông minh và quy trình triển khai bằng Docker/Coolify trên VPS.

---

## 🚀 Tech Stack

### Frontend

* **Next.js 16.x** - App Router
* **React 19**
* **Tailwind CSS v4**
* **Zustand** - quản lý giỏ hàng và trạng thái client
* **Lucide React** - icon system
* **Next Image** - tối ưu hình ảnh sản phẩm

### Backend & CMS

* **Payload CMS 3.x**
* **PostgreSQL**
* **REST API routes** trong Next.js
* **Payload Collections** cho sản phẩm, danh mục, thương hiệu, đơn hàng, chat profiles và messages

### Realtime

* **Socket.io**
* **Express.js**
* **Dedicated Socket Server**
* Socket chạy riêng với domain độc lập:

```txt
https://socket.maraisdefrance.vn
```

### Payment

* **Fundiin API V2**
* HMAC-SHA256 signature
* Waiting page flow
* Redirect/payment tab flow

### Deployment

* **Docker**
* **Coolify**
* **VPS Vietnix**
* Reverse proxy tự động qua Coolify
* Tách riêng app web và app socket để ổn định RAM

---

## ✨ Tính năng chính

### 1. Luxury E-commerce UX

MF PARIS được thiết kế theo phong cách **Minimalist Luxury**, ưu tiên trải nghiệm mua hàng cao cấp, rõ ràng và dễ thao tác.

Các điểm nổi bật:

* Layout tối ưu chiều rộng 1200px
* Typography sang trọng:

  * Heading: `Playfair Display`
  * Body: `Be Vietnam Pro`
* Product card tỉ lệ ảnh 1:1
* Hover image swap
* Giao diện mobile-first
* CTA rõ ràng
* UI đồng bộ tone đỏ thương hiệu MF Paris

---

## 🛍️ Product System

Hệ thống sản phẩm hỗ trợ cả sản phẩm đơn và sản phẩm nhiều biến thể.

### Sản phẩm đơn

Phù hợp với các sản phẩm chỉ có một phiên bản bán:

* Giá gốc
* Giá sale
* Tồn kho
* SKU
* Ảnh sản phẩm
* Mô tả chi tiết

### Sản phẩm biến thể

Phù hợp với nước hoa, mỹ phẩm nhiều dung tích hoặc nhiều phiên bản:

Ví dụ:

```txt
10ml
30ml
50ml
100ml
Tester
Gift set
```

Mỗi biến thể có thể có:

* Tên biến thể
* SKU riêng
* Giá gốc riêng
* Giá sale riêng
* Tồn kho riêng
* Ảnh riêng
* Trạng thái active/inactive

---

## 🛒 Smart Cart System

Giỏ hàng được quản lý bằng **Zustand Persist**, lưu trong localStorage để giữ trạng thái khi khách rời trang.

### Tính năng giỏ hàng

* Thêm sản phẩm vào giỏ
* Tăng/giảm số lượng
* Xóa sản phẩm
* Đổi biến thể ngay trong giỏ
* Reset số lượng về 1 khi đổi biến thể
* Không cho thêm sản phẩm hết hàng
* Không cho vượt tồn kho
* Hiển thị cảnh báo nếu sản phẩm trong giỏ đã hết hàng

### Cart validation API

Để tránh lỗi tồn kho cũ trong localStorage, hệ thống có API kiểm tra lại giỏ hàng:

```txt
POST /api/cart/validate
```

API này sẽ:

* Lấy lại tồn kho mới nhất từ database
* Lấy lại giá mới nhất
* Lấy lại danh sách biến thể mới nhất
* Tự đồng bộ lại giỏ hàng
* Giữ lại sản phẩm hết hàng để cảnh báo khách, không tự xóa im lặng

---

## 💬 Realtime Chat System

MF PARIS có hệ thống chat realtime riêng, tách khỏi Next.js app để đảm bảo ổn định khi deploy production.

### Kiến trúc chat

```txt
Customer Live Chat
        ↓
/api/chat/send
        ↓
Payload CMS - messages collection
        ↓
afterChange hook
        ↓
Socket Server /broadcast-admin
        ↓
Admin Chat Center + Customer Chat Widget
```

### Socket server

Socket server chạy riêng bằng:

* Node.js
* Express
* Socket.io
* Port nội bộ: `3001`
* Domain production:

```txt
https://socket.maraisdefrance.vn
```

### Tính năng chat

* Khách hàng đăng ký mã định danh
* Khách hàng đăng nhập lại để xem lịch sử chat
* Admin xem danh sách hội thoại
* Admin trả lời realtime
* Tin nhắn có lịch sử phân trang
* Badge tin nhắn chưa đọc
* Âm báo khi có tin nhắn mới
* Room riêng cho từng khách hàng
* Room riêng cho admin:

```txt
admins
```

---

## 🔐 Socket Security

Socket server có endpoint nội bộ:

```txt
POST /broadcast-admin
```

Endpoint này được bảo vệ bằng token:

```env
SOCKET_INTERNAL_TOKEN=your_secure_token
```

Khi Next.js app gọi socket server, bắt buộc gửi header:

```ts
'x-socket-token': process.env.SOCKET_INTERNAL_TOKEN
```

Điều này giúp tránh người ngoài gọi trực tiếp vào socket server để spam tin nhắn realtime.

---

## 💳 Fundiin Payment Integration

MF PARIS tích hợp **Fundiin API V2** cho hình thức mua trước trả sau.

### Tính năng

* Tạo payment request
* Ký bảo mật bằng HMAC-SHA256
* Redirect sang Fundiin
* Waiting page giữ chân khách hàng
* Tự động lưu order trước khi thanh toán
* Hỗ trợ kiểm tra trạng thái đơn hàng

### Production endpoint

```env
FUNDIIN_API_URL=https://gateway.fundiin.vn
```

### Sandbox endpoint

```env
FUNDIIN_API_URL=https://gateway-sandbox.fundiin.vn
```

---

## 📦 Payload Collections

Các collection chính trong dự án:

```txt
collections/
├── Products.ts
├── Categories.ts
├── Brands.ts
├── Orders.ts
├── Users.ts
├── Media.ts
├── ChatProfiles.ts
└── Messages.ts
```

### Products

Quản lý sản phẩm:

* Sản phẩm đơn
* Sản phẩm biến thể
* Giá
* Tồn kho
* SKU
* Hình ảnh
* Thương hiệu
* Danh mục
* Mô tả
* SEO
* Nội dung chi tiết

### Orders

Quản lý đơn hàng:

* Thông tin khách hàng
* Danh sách sản phẩm
* Biến thể đã mua
* Giá tại thời điểm mua
* Phương thức thanh toán
* Trạng thái đơn hàng
* Fundiin reference/payment URL

### Chat Profiles

Quản lý định danh khách hàng chat:

* Tên khách hàng
* Username
* Password/mã truy cập
* Lịch sử chat theo profile

### Messages

Quản lý tin nhắn:

* Profile khách hàng
* Tên khách hàng
* Người gửi: `customer` hoặc `admin`
* Nội dung
* Trạng thái đã đọc
* Thời gian tạo

---

## 🗂️ Directory Structure

```txt
src/
├── app/
│   ├── (frontend)/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── blog/
│   │   ├── cart/
│   │   ├── checkout/
│   │   └── fundiin/
│   │
│   ├── (payload)/
│   │   └── admin/
│   │
│   └── api/
│       ├── cart/
│       │   └── validate/
│       ├── chat/
│       │   ├── auth/
│       │   ├── send/
│       │   ├── history/
│       │   ├── sessions/
│       │   └── mark-read/
│       └── payments/
│           └── fundiin/
│
├── collections/
│   ├── Products.ts
│   ├── Orders.ts
│   ├── Messages.ts
│   └── ChatProfiles.ts
│
├── components/
│   ├── ProductCard.tsx
│   ├── ProductPurchase.tsx
│   ├── LiveChat.tsx
│   └── ChatCenter.tsx
│
├── lib/
│   └── store.ts
│
├── hooks/
├── utilities/
└── scripts/

socket-server/
├── Dockerfile
├── package.json
└── server.mjs
```

---

## ⚙️ Environment Variables

### Web App

```env
# App
NEXT_PUBLIC_BASE_URL=https://maraisdefrance.vn
NEXT_PUBLIC_SERVER_URL=https://maraisdefrance.vn

# Database
DATABASE_URI=postgresql://user:password@host:port/database

# Payload
PAYLOAD_SECRET=your_payload_secret

# Socket - browser/client
NEXT_PUBLIC_SOCKET_URL=https://socket.maraisdefrance.vn

# Socket - server only
SOCKET_SERVER_URL=https://socket.maraisdefrance.vn
SOCKET_INTERNAL_TOKEN=your_secure_socket_token

# Fundiin
FUNDIIN_API_URL=https://gateway.fundiin.vn
FUNDIIN_CLIENT_ID=your_client_id
FUNDIIN_SECRET_KEY=your_secret_key
FUNDIIN_STORE_ID=your_store_id
```

### Socket Server

```env
PORT=3001
SOCKET_PORT=3001
SOCKET_CORS_ORIGINS=https://maraisdefrance.vn,https://www.maraisdefrance.vn
SOCKET_INTERNAL_TOKEN=your_secure_socket_token
```

> Lưu ý: `SOCKET_INTERNAL_TOKEN` ở web app và socket server phải giống nhau 100%.

---

## 🐳 Deployment

Dự án được deploy bằng Docker/Coolify, tách thành 2 service riêng.

### 1. Web App

```txt
Service: mfparis-web
Domain: https://maraisdefrance.vn
Port: 3000
```

Web app chạy:

* Next.js
* Payload CMS
* API routes
* Admin panel
* Frontend e-commerce

### 2. Socket App

```txt
Service: mfparis-socket
Domain: https://socket.maraisdefrance.vn
Port: 3001
```

Socket app chạy:

* Express
* Socket.io
* Broadcast realtime chat
* Health check endpoint

---

## 🩺 Health Check

Socket server có endpoint kiểm tra trạng thái:

```txt
GET https://socket.maraisdefrance.vn/health
```

Response mẫu:

```json
{
  "status": "ok",
  "service": "mfparis-socket",
  "port": 3001
}
```

---

## 🔁 Realtime Chat Flow

### Customer gửi tin nhắn

```txt
Customer LiveChat
→ POST /api/chat/send
→ Payload tạo message trong collection messages
→ afterChange hook gọi socket server
→ socket emit receive-msg tới room admins
→ Admin Chat Center nhận realtime
```

### Admin gửi tin nhắn

```txt
Admin Chat Center
→ POST /api/chat/send
→ Payload tạo message trong collection messages
→ afterChange hook gọi socket server
→ socket emit receive-msg tới room profileId của khách
→ Customer LiveChat nhận realtime
```

---

## 🧪 Debug Checklist

### Socket client không realtime

Kiểm tra browser console:

```txt
ADMIN SOCKET URL: https://socket.maraisdefrance.vn
CLIENT SOCKET URL: https://socket.maraisdefrance.vn
```

Nếu thấy request sai:

```txt
https://maraisdefrance.vn/socket.io
```

thì thiếu hoặc sai biến:

```env
NEXT_PUBLIC_SOCKET_URL
```

### Socket server sống nhưng không nhận tin

Kiểm tra log socket server phải có:

```txt
✅ Connected
💬 Socket joined room
📨 Received broadcast request
📢 Broadcasted
```

Nếu không thấy `Received broadcast request`, nghĩa là web app chưa gọi được `/broadcast-admin`.

### Broadcast bị 401

Kiểm tra token:

```env
SOCKET_INTERNAL_TOKEN
```

Token ở web app và socket app phải giống nhau.

---

## 📥 Migration từ WordPress

Dự án hỗ trợ migration dữ liệu lớn từ WordPress sang Payload CMS.

### Nguồn dữ liệu

* Sản phẩm
* Danh mục
* Thương hiệu
* Bài viết
* Hình ảnh
* Nội dung HTML cũ

### Scripts

```txt
src/scripts/
├── import-tax.ts
├── import-products.ts
├── import-media.ts
└── clean-html.ts
```

### Quy trình import

```bash
npm run import-tax
npm run import-wp
```

Các script có thể xử lý:

* Import danh mục
* Import thương hiệu
* Import sản phẩm
* Tải ảnh về media
* Làm sạch HTML
* Tách nội dung theo thẻ heading
* Chuyển nội dung cũ sang layout accordion chuyên nghiệp

---

## 🧾 SEO & Performance

Dự án được tối ưu cho SEO và tốc độ tải trang.

### SEO

* Metadata động
* Slug sản phẩm
* Slug danh mục
* Open Graph
* Canonical URL
* Blog 16:9
* Tối ưu tiêu đề, mô tả và cấu trúc nội dung

### Performance

* Next Image optimization
* WebP/AVIF support
* Lazy loading
* Product card image ratio 1:1
* Tách socket server khỏi web server
* Giảm tải RAM khi deploy

---

## 🧠 Business Features

Các tính năng phục vụ bán hàng thực tế:

* Quản lý sản phẩm đa ngành: nước hoa, mỹ phẩm, dược mỹ phẩm, TPBVSK
* Quản lý tồn kho theo biến thể
* Giỏ hàng thông minh
* Thanh toán Fundiin
* Chat realtime hỗ trợ khách hàng
* Lịch sử hội thoại khách hàng
* Quản lý đơn hàng
* Tối ưu giao diện mobile
* Phù hợp bán hàng qua website, Shopee, TikTok Shop, Zalo OA

---

## 🔐 Security Notes

Không commit các biến môi trường nhạy cảm vào GitHub:

```txt
PAYLOAD_SECRET
DATABASE_URI
FUNDIIN_SECRET_KEY
SOCKET_INTERNAL_TOKEN
```

Nên lưu các biến này trong:

* Coolify Environment Variables
* GitHub Secrets nếu dùng GitHub Actions
* VPS secret manager nếu có

---

## 🧰 Useful Commands

### Install dependencies

```bash
npm install
```

### Run development

```bash
npm run dev
```

### Build production

```bash
npm run build
```

### Start production

```bash
npm run start
```

### Run socket server local

```bash
cd socket-server
npm install
npm start
```

### Test socket health

```bash
curl https://socket.maraisdefrance.vn/health
```

---

## 📌 Production Domains

```txt
Website:       https://maraisdefrance.vn
Socket Server: https://socket.maraisdefrance.vn
Admin Panel:   https://maraisdefrance.vn/admin
```

---

## 🏷️ Brand Standards

### Brand

```txt
MF PARIS / Marais de France
```

### Main Color

```txt
#B72828
```

### Typography

```txt
Heading: Playfair Display
Body: Be Vietnam Pro
```

### Image Ratio

```txt
Product card: 1:1
Blog hero: 16:9
Banner: responsive
```

---

## 👨‍💻 Development Notes

Khi chỉnh realtime chat, cần nhớ:

* Client component chỉ đọc được env có tiền tố `NEXT_PUBLIC_`
* Server API/hook dùng env thường như `SOCKET_SERVER_URL`
* Socket server chạy riêng, không nằm trong Next.js app
* `/health` chỉ xác nhận socket server sống, không xác nhận realtime broadcast hoạt động
* Muốn realtime hoạt động cần đủ:

  * Browser connect đúng socket domain
  * Client/admin join đúng room
  * Web app gọi đúng `/broadcast-admin`
  * Token socket hợp lệ
  * Socket emit đúng `receive-msg`

---

## © MF PARIS

Built for high-end beauty commerce.
Designed for luxury UX.
Optimized for real-world Vietnamese e-commerce operations.