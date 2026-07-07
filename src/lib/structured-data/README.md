# Structured Data cho MF Paris

Bá»™ nÃ y táº¡o JSON-LD theo dáº¡ng `@graph`, dÃ¹ng chung cho toÃ n site:

- Home: `Organization`, `WebSite`, `WebPage`
- Product detail: `WebPage`, `BreadcrumbList`, `Product` hoáº·c `ProductGroup`
- Category/Brand/Product listing: `CollectionPage`, `ItemList`, `BreadcrumbList`
- Blog detail: `WebPage`, `BreadcrumbList`, `BlogPosting`
- Static pages: `AboutPage`, `ContactPage`, `WebPage`, cÃ³ thá»ƒ thÃªm `FAQPage`, `VideoObject`, `LocalBusiness` khi cÃ³ dá»¯ liá»‡u tháº­t

NguyÃªn táº¯c:

- KhÃ´ng xuáº¥t field rá»—ng.
- KhÃ´ng xuáº¥t rating/review náº¿u chÆ°a cÃ³ Ä‘Ã¡nh giÃ¡ tháº­t.
- KhÃ´ng xuáº¥t FAQ/video náº¿u ná»™i dung Ä‘Ã³ khÃ´ng hiá»ƒn thá»‹ trÃªn trang.
- URL dÃ¹ng `SITE_ORIGIN` Ä‘á»ƒ thá»‘ng nháº¥t canonical.

VÃ­ dá»¥ trong page:

```tsx
import { JsonLd } from '@/components/JsonLd'
import { buildHomeSchemaGraph } from '@/lib/structured-data'

const schema = buildHomeSchemaGraph({
  title: 'MF Paris',
  description: 'NÆ°á»›c hoa, má»¹ pháº©m chÃ­nh hÃ£ng tá»« PhÃ¡p',
})

return (
  <>
    <JsonLd data={schema} />
    ...
  </>
)
```
