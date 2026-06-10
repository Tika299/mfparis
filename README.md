# 🇫🇷 MF PARIS - High-End E-commerce Platform

**MF PARIS** (`mfparis.vn`) là nền tảng thương mại điện tử chuyên biệt về Nước hoa, Mỹ phẩm và Thực phẩm chức năng cao cấp từ Pháp. Dự án được chuyển đổi từ WordPress sang hệ sinh thái **Next.js 15 + Payload CMS 3.0**, tối ưu hóa cho tốc độ, bảo mật và trải nghiệm người dùng đẳng cấp (Luxury UX).

## 🚀 Tech Stack

*   **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4.
*   **CMS & Backend:** Payload CMS 3.0 (Headless CMS running on Next.js).
*   **Database:** PostgreSQL (Hosted on Supabase/VPS).
*   **Realtime Chat:** Socket.io (Dedicated Chat Server on Node.js v25).
*   **State Management:** Zustand (Cart & User Sessions).
*   **Payment:** Fundiin API V2 Integration (Buy Now Pay Later).
*   **Media:** Sharp (Image Processing), AVIF/WebP Format, 10.000+ images.
*   **CI/CD:** GitHub Actions (Automated Deployment to VPS).

## ✨ Tính năng nổi bật

### 🎨 Luxury UX/UI (Chuẩn Vietnix 1200px)
*   Giao diện thiết kế theo phong cách **Minimalist Luxury**, ép khung 1200px giúp tối ưu thị giác.
*   Hệ thống Typography kết hợp **Be Vietnam Pro** (nội dung) và **Playfair Display** (tiêu đề).
*   Thẻ sản phẩm tỉ lệ **1:1** với hiệu ứng **Hover Image Swap**.

### 💬 Hệ thống Chat Realtime (Định danh)
*   Server Socket.io riêng biệt chạy trên VPS port 3001.
*   Cơ chế **Identity-first**: Khách hàng đăng ký/đăng nhập bằng mã định danh để đồng bộ tin nhắn xuyên thiết bị.
*   **Admin Chat Center**: Giao diện quản trị tập trung (Zalo-style) cho phép trả lời khách hàng ngay lập tức.
*   Thông báo âm thanh và badge đỏ cho tin nhắn chưa đọc.

### 📦 Quản lý Sản phẩm Thông minh
*   **Dynamic Attributes**: Tự định nghĩa thông số (Nồng độ, SPF, Calo...) linh hoạt cho từng loại sản phẩm.
*   **Combo Savings**: Cho phép tạo bộ sản phẩm để tăng giá trị đơn hàng.
*   **Auto-Accordion**: Tự động bóc tách nội dung WordPress cũ theo thẻ `<h2>` để tạo mục lục nội dung chuyên nghiệp.

### 💳 Thanh toán Fundiin V2
*   Tích hợp sâu API Fundiin V2 (camelCase structure).
*   Cơ chế **Waiting Page**: Mở tab thanh toán mới và giữ chân người dùng tại website để tăng tỷ lệ quay lại.
*   Tự động tính toán chữ ký bảo mật **HmacSHA256**.

## 🛠 Cấu trúc thư mục (Directory Structure)

```text
src/
├── app/
│   ├── (frontend)/       # Giao diện người dùng (Route Group)
│   │   ├── products/     # Trang danh sách & chi tiết sản phẩm
│   │   ├── categories/   # Quản lý danh mục
│   │   ├── blog/         # Tạp chí làm đẹp 16:9
│   │   └── checkout/     # Quy trình thanh toán & Fundiin
│   └── (payload)/        # Hệ thống quản trị Admin
├── collections/          # Định nghĩa Schema (Products, Brands, Messages...)
├── components/           # UI Components (OptimizedImage, RelatedProducts...)
├── hooks/                # Logic xử lý tự động (Slug, Auth...)
├── lib/                  # Zustand stores & Global state
├── scripts/              # Script Migration (Import 2000+ SP từ WordPress)
└── utilities/            # Hàm tiện ích (Format price, Clean HTML...)
chat-server.js            # Server WebSocket (Socket.io)
```

## 🏗 Quy trình Triển khai (Deployment)

### 1. GitHub Actions (CI/CD)
Mỗi khi có code mới được `push` lên branch `main`, GitHub Actions sẽ:
*   Linting & Type check.
*   Build ứng dụng Next.js.
*   Tự động deploy bản build sang VPS thông qua SSH.

### 2. VPS Configuration (Ubuntu 24.04 LTS)
*   **Web Server:** Chạy Next.js qua Docker hoặc PM2 tại port 3000.
*   **WebSocket Server:** Chạy `chat-server.js` tại port 3001 (Quản lý bởi PM2).
*   **Reverse Proxy:** Nginx cấu hình hỗ trợ `Upgrade` header cho Websocket và SSL (Certbot).

## 📥 Hướng dẫn Migration từ WordPress

1.  Chuẩn bị các file JSON từ WordPress (`products.json`, `brands.json`...).
2.  Lưu vào `src/scripts/`.
3.  Chạy lệnh:
    ```bash
    # Import Thương hiệu và Danh mục
    npm run import-tax
    
    # Import 2000+ Sản phẩm (Tự động tải ảnh & bóc tách Accordion)
    npm run import-wp
    ```

## 🔐 Biến môi trường (.env)

```env
# Database
DATABASE_URI=postgresql://user:pass@host:port/db

# Payload
PAYLOAD_SECRET=your_secret_key
NEXT_PUBLIC_SERVER_URL=https://mfparis.vn

# Socket
NEXT_PUBLIC_SOCKET_URL=https://mfparis.vn:3001

# Fundiin
FUNDIIN_MERCHANT_ID=xxx
FUNDIIN_SECRET_KEY=xxx
FUNDIIN_API_URL=https://gateway.fundiin.vn
```

---
© 2024 **MF PARIS**. Designed for Excellence. Standardized for UX.