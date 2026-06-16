import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export default async function TestFilterPage() {
    const payload = await getPayload({
        config: configPromise,
    })

    // 1. Tự tìm Attribute Value bằng slug,
    // không cần nhập ID thủ công.
    const attributeValueResult = await payload.find({
        collection: 'attribute-values',
        depth: 1,
        limit: 10,
        where: {
            slug: {
                equals: 'woody',
            },
        },
    })

    const woodyValue = attributeValueResult.docs[0]

    if (!woodyValue) {
        return (
            <main
                style={{
                    maxWidth: 1000,
                    margin: '40px auto',
                    padding: 24,
                }}
            >
                <h1>Kiểm tra bộ lọc Woody</h1>

                <p>
                    Không tìm thấy Attribute Value có slug
                    <strong> woody</strong>.
                </p>

                <p>
                    Hãy vào Payload Admin → Giá trị thuộc tính
                    và kiểm tra slug của Woody.
                </p>
            </main>
        )
    }

    // 2. Lấy tất cả sản phẩm published để debug.
    const publishedProducts = await payload.find({
        collection: 'products',
        depth: 2,
        limit: 100,
        where: {
            status: {
                equals: 'published',
            },
        },
    })

    // 3. Tìm sản phẩm chứa Attribute Value Woody.
    const filteredProducts = await payload.find({
        collection: 'products',
        depth: 2,
        limit: 100,
        where: {
            and: [
                {
                    status: {
                        equals: 'published',
                    },
                },
                {
                    'productAttributes.values': {
                        in: [woodyValue.id],
                    },
                },
            ],
        },
    })

    return (
        <main
            style={{
                maxWidth: 1100,
                margin: '40px auto',
                padding: 24,
                fontFamily: 'Arial, sans-serif',
            }}
        >
            <h1>Kiểm tra bộ lọc Woody</h1>

            <section
                style={{
                    padding: 16,
                    marginTop: 20,
                    border: '1px solid #ddd',
                }}
            >
                <h2>1. Attribute Value tìm được</h2>

                <p>
                    <strong>ID:</strong> {woodyValue.id}
                </p>

                <p>
                    <strong>Label:</strong> {woodyValue.label}
                </p>

                <p>
                    <strong>Slug:</strong> {woodyValue.slug}
                </p>

                <pre
                    style={{
                        overflow: 'auto',
                        padding: 16,
                        background: '#f5f5f5',
                    }}
                >
                    {JSON.stringify(woodyValue, null, 2)}
                </pre>
            </section>

            <section
                style={{
                    padding: 16,
                    marginTop: 20,
                    border: '1px solid #ddd',
                }}
            >
                <h2>2. Kết quả bộ lọc</h2>

                <p>
                    Tìm thấy{' '}
                    <strong>
                        {filteredProducts.totalDocs}
                    </strong>{' '}
                    sản phẩm Woody.
                </p>

                {filteredProducts.docs.length === 0 ? (
                    <p>
                        Chưa có sản phẩm published nào được gắn
                        giá trị Woody.
                    </p>
                ) : (
                    <ul>
                        {filteredProducts.docs.map((product) => (
                            <li key={product.id}>
                                {product.title}
                            </li>
                        ))}
                    </ul>
                )}

                <pre
                    style={{
                        overflow: 'auto',
                        padding: 16,
                        background: '#f5f5f5',
                    }}
                >
                    {JSON.stringify(
                        filteredProducts.docs.map((product) => ({
                            id: product.id,
                            title: product.title,
                            productAttributes:
                                product.productAttributes,
                        })),
                        null,
                        2,
                    )}
                </pre>
            </section>

            <section
                style={{
                    padding: 16,
                    marginTop: 20,
                    border: '1px solid #ddd',
                }}
            >
                <h2>3. Tất cả sản phẩm đang bán</h2>

                <p>
                    Tổng số sản phẩm published:{' '}
                    <strong>
                        {publishedProducts.totalDocs}
                    </strong>
                </p>

                <pre
                    style={{
                        overflow: 'auto',
                        padding: 16,
                        background: '#f5f5f5',
                    }}
                >
                    {JSON.stringify(
                        publishedProducts.docs.map((product) => ({
                            id: product.id,
                            title: product.title,
                            status: product.status,
                            productAttributes:
                                product.productAttributes,
                        })),
                        null,
                        2,
                    )}
                </pre>
            </section>
        </main>
    )
}