# Structured Data cho MF Paris

Bộ này tạo JSON-LD theo dạng `@graph`, dùng chung cho toàn site:

- Home: `Organization`, `WebSite`, `WebPage`
- Product detail: `WebPage`, `BreadcrumbList`, `Product` hoặc `ProductGroup`
- Category/Brand/Product listing: `CollectionPage`, `ItemList`, `BreadcrumbList`
- Blog detail: `WebPage`, `BreadcrumbList`, `BlogPosting`
- Static pages: `AboutPage`, `ContactPage`, `WebPage`, có thể thêm `FAQPage`, `VideoObject`, `LocalBusiness` khi có dữ liệu thật

Nguyên tắc:

- Không xuất field rỗng.
- Không xuất rating/review nếu chưa có đánh giá thật.
- Không xuất FAQ/video nếu nội dung đó không hiển thị trên trang.
- URL dùng `SITE_ORIGIN` để thống nhất canonical.

Ví dụ trong page:

```tsx
import { JsonLd } from '@/components/JsonLd'
import { buildHomeSchemaGraph } from '@/lib/structured-data'

const schema = buildHomeSchemaGraph({
  title: 'MF Paris',
  description: 'Nước hoa, mỹ phẩm chính hãng từ Pháp',
})

return (
  <>
    <JsonLd data={schema} />
    ...
  </>
)
```
