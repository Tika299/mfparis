import type { Field } from 'payload'

type SeoFieldsOptions = {
  schemaTypeOptions?: Array<{
    label: string
    value: string
  }>
}

const defaultSchemaTypeOptions = [
  {
    label: 'Tu dong theo loai trang',
    value: 'auto',
  },
  {
    label: 'WebPage',
    value: 'WebPage',
  },
  {
    label: 'CollectionPage',
    value: 'CollectionPage',
  },
  {
    label: 'Product',
    value: 'Product',
  },
  {
    label: 'BlogPosting',
    value: 'BlogPosting',
  },
  {
    label: 'AboutPage',
    value: 'AboutPage',
  },
  {
    label: 'ContactPage',
    value: 'ContactPage',
  },
  {
    label: 'FAQPage',
    value: 'FAQPage',
  },
  {
    label: 'Khong xuat schema rieng',
    value: 'none',
  },
]

export function seoFields(options: SeoFieldsOptions = {}): Field {
  return {
    name: 'seo',
    type: 'group',
    label: 'SEO nang cao',
    admin: {
      description:
        'Cau hinh metadata, social preview, robots, canonical, sitemap va schema cho entity nay.',
    },
    fields: [
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Meta',
            fields: [
              {
                name: 'metaTitle',
                type: 'text',
                label: 'Meta title',
                admin: {
                  description:
                    'Nen nam trong khoang 45-60 ky tu. De trong se tu dong lay theo tieu de.',
                },
              },
              {
                name: 'metaDescription',
                type: 'textarea',
                label: 'Meta description',
                admin: {
                  rows: 3,
                  description:
                    'Nen nam trong khoang 120-160 ky tu. De trong se tu dong lay mo ta ngan/noi dung.',
                },
              },
              {
                name: 'focusKeyword',
                type: 'text',
                label: 'Tu khoa chinh',
                admin: {
                  description:
                    'Dung cho quy trinh bien tap/audit SEO noi bo, khong hien thi truc tiep tren frontend.',
                },
              },
              {
                name: 'breadcrumbLabel',
                type: 'text',
                label: 'Nhan breadcrumb',
                admin: {
                  description:
                    'Neu de trong, breadcrumb se dung ten/tieu de mac dinh.',
                },
              },
            ],
          },
          {
            label: 'Social',
            fields: [
              {
                name: 'ogTitle',
                type: 'text',
                label: 'OpenGraph title',
              },
              {
                name: 'ogDescription',
                type: 'textarea',
                label: 'OpenGraph description',
                admin: {
                  rows: 3,
                },
              },
              {
                name: 'ogImage',
                type: 'upload',
                relationTo: 'media',
                label: 'OpenGraph image',
              },
              {
                name: 'twitterImage',
                type: 'upload',
                relationTo: 'media',
                label: 'Twitter/X image',
                admin: {
                  description:
                    'Neu de trong se dung OpenGraph image hoac anh dai dien.',
                },
              },
            ],
          },
          {
            label: 'Robots & Canonical',
            fields: [
              {
                type: 'row',
                fields: [
                  {
                    name: 'robotsIndex',
                    type: 'select',
                    label: 'Index',
                    defaultValue: 'index',
                    options: [
                      {
                        label: 'Index',
                        value: 'index',
                      },
                      {
                        label: 'Noindex',
                        value: 'noindex',
                      },
                    ],
                    admin: {
                      width: '50%',
                    },
                  },
                  {
                    name: 'robotsFollow',
                    type: 'select',
                    label: 'Follow',
                    defaultValue: 'follow',
                    options: [
                      {
                        label: 'Follow',
                        value: 'follow',
                      },
                      {
                        label: 'Nofollow',
                        value: 'nofollow',
                      },
                    ],
                    admin: {
                      width: '50%',
                    },
                  },
                ],
              },
              {
                name: 'canonicalOverride',
                type: 'text',
                label: 'Canonical override',
                admin: {
                  description:
                    'Chi nhap khi URL canonical khac URL hien tai. Co the la duong dan tuong doi hoac URL day du.',
                },
              },
            ],
          },
          {
            label: 'Sitemap',
            fields: [
              {
                name: 'sitemapInclude',
                type: 'checkbox',
                label: 'Dua vao sitemap',
                defaultValue: true,
              },
              {
                type: 'row',
                fields: [
                  {
                    name: 'sitemapPriority',
                    type: 'number',
                    label: 'Sitemap priority',
                    min: 0,
                    max: 1,
                    admin: {
                      width: '50%',
                      step: 0.1,
                      description:
                        'Gia tri hop le tu 0 den 1. Vi du: 0.8.',
                    },
                  },
                  {
                    name: 'sitemapChangeFrequency',
                    type: 'select',
                    label: 'Change frequency',
                    options: [
                      {
                        label: 'Always',
                        value: 'always',
                      },
                      {
                        label: 'Hourly',
                        value: 'hourly',
                      },
                      {
                        label: 'Daily',
                        value: 'daily',
                      },
                      {
                        label: 'Weekly',
                        value: 'weekly',
                      },
                      {
                        label: 'Monthly',
                        value: 'monthly',
                      },
                      {
                        label: 'Yearly',
                        value: 'yearly',
                      },
                      {
                        label: 'Never',
                        value: 'never',
                      },
                    ],
                    admin: {
                      width: '50%',
                    },
                  },
                ],
              },
            ],
          },
          {
            label: 'Schema',
            fields: [
              {
                name: 'schemaType',
                type: 'select',
                label: 'Schema type',
                defaultValue: 'auto',
                options:
                  options.schemaTypeOptions && options.schemaTypeOptions.length > 0
                    ? options.schemaTypeOptions
                    : defaultSchemaTypeOptions,
              },
              {
                name: 'customJsonLd',
                type: 'json',
                label: 'Custom JSON-LD',
                admin: {
                  description:
                    'Chi dung khi can them schema rieng. Khong nhap Product/Article trung voi schema tu dong.',
                },
              },
            ],
          },
        ],
      },
    ],
  }
}

export const productStructuredSeoFields: Field[] = [
  {
    name: 'gtin',
    type: 'text',
    label: 'GTIN / EAN / UPC',
    admin: {
      description:
        'Ma dinh danh toan cau cho Merchant Listing neu san pham co ma that.',
    },
  },
  {
    name: 'mpn',
    type: 'text',
    label: 'MPN',
  },
  {
    name: 'barcode',
    type: 'text',
    label: 'Barcode noi bo',
  },
  {
    name: 'condition',
    type: 'select',
    label: 'Tinh trang san pham',
    defaultValue: 'new',
    options: [
      {
        label: 'Moi',
        value: 'new',
      },
      {
        label: 'Da qua su dung',
        value: 'used',
      },
      {
        label: 'Tan trang',
        value: 'refurbished',
      },
      {
        label: 'Hong/khong hoan hao',
        value: 'damaged',
      },
    ],
  },
  {
    name: 'priceValidUntil',
    type: 'date',
    label: 'Gia co hieu luc den',
    admin: {
      date: {
        pickerAppearance: 'dayOnly',
      },
      description:
        'Dung cho Offer schema khi gia khuyen mai co han ro rang.',
    },
  },
  {
    name: 'canonicalProduct',
    type: 'relationship',
    relationTo: 'products',
    label: 'Sản phẩm canonical',
    admin: {
      description:
        'Dung khi san pham/variant trung lap nen canonical ve mot san pham chinh.',
    },
  },
  {
    name: 'discontinuedRedirectTarget',
    type: 'relationship',
    relationTo: 'products',
    label: 'Sản phẩm thay the khi ngung ban',
    admin: {
      description:
        'Truong ro nghia hon cho redirect SEO. Co the dong bo voi san pham thay the hien co.',
    },
  },
  {
    name: 'reviewSnippetEnabled',
    type: 'checkbox',
    label: 'Bat review snippet',
    defaultValue: true,
    admin: {
      description:
        'Chi nen bat khi review hien thi cong khai tren trang san pham.',
    },
  },
  {
    name: 'shippingDetails',
    type: 'group',
    label: 'Shipping schema',
    fields: [
      {
        name: 'shippingRate',
        type: 'number',
        label: 'Phi van chuyen',
      },
      {
        name: 'currency',
        type: 'text',
        label: 'Don vi tien',
        defaultValue: 'VND',
      },
      {
        name: 'country',
        type: 'text',
        label: 'Quoc gia giao hang',
        defaultValue: 'VN',
      },
      {
        type: 'row',
        fields: [
          {
            name: 'deliveryMinDays',
            type: 'number',
            label: 'Ngay giao toi thieu',
            admin: {
              width: '50%',
            },
          },
          {
            name: 'deliveryMaxDays',
            type: 'number',
            label: 'Ngay giao toi da',
            admin: {
              width: '50%',
            },
          },
        ],
      },
    ],
  },
  {
    name: 'returnPolicy',
    type: 'group',
    label: 'Return policy schema',
    fields: [
      {
        name: 'applicableCountry',
        type: 'text',
        label: 'Quoc gia ap dung',
        defaultValue: 'VN',
      },
      {
        name: 'merchantReturnDays',
        type: 'number',
        label: 'So ngay doi tra',
        defaultValue: 7,
      },
      {
        name: 'returnPolicyCategory',
        type: 'select',
        label: 'Loai chinh sach doi tra',
        defaultValue:
          'https://schema.org/MerchantReturnFiniteReturnWindow',
        options: [
          {
            label: 'Doi tra trong so ngay nhat dinh',
            value:
              'https://schema.org/MerchantReturnFiniteReturnWindow',
          },
          {
            label: 'Khong ho tro doi tra',
            value:
              'https://schema.org/MerchantReturnNotPermitted',
          },
          {
            label: 'Khong gioi han ngay',
            value:
              'https://schema.org/MerchantReturnUnlimitedWindow',
          },
        ],
      },
      {
        name: 'returnFees',
        type: 'select',
        label: 'Phi doi tra',
        options: [
          {
            label: 'Mien phi',
            value: 'https://schema.org/FreeReturn',
          },
          {
            label: 'Khach tra phi',
            value: 'https://schema.org/ReturnFeesCustomerResponsibility',
          },
        ],
      },
    ],
  },
  {
    name: 'pros',
    type: 'array',
    label: 'Diem manh san pham',
    fields: [
      {
        name: 'text',
        type: 'text',
        required: true,
        label: 'Nội dung',
      },
    ],
  },
  {
    name: 'cons',
    type: 'array',
    label: 'Diem can luu y',
    fields: [
      {
        name: 'text',
        type: 'text',
        required: true,
        label: 'Nội dung',
      },
    ],
  },
  {
    name: 'faq',
    type: 'array',
    label: 'FAQ san pham',
    admin: {
      description:
        'Chi nhap cau hoi/cau tra loi that su hien thi tren trang san pham.',
    },
    fields: [
      {
        name: 'question',
        type: 'text',
        required: true,
        label: 'Câu hỏi',
      },
      {
        name: 'answer',
        type: 'textarea',
        required: true,
        label: 'Cau tra loi',
      },
    ],
  },
]

export const landingSeoContentFields: Field[] = [
  {
    name: 'h1Override',
    type: 'text',
    label: 'H1 tuy chinh',
  },
  {
    name: 'introHtml',
    type: 'textarea',
    label: 'Nội dung mo dau HTML',
    admin: {
      rows: 8,
      description:
        'Nội dung hien thi phia tren danh sach san pham.',
    },
  },
  {
    name: 'bottomContentHtml',
    type: 'textarea',
    label: 'Nội dung cuoi trang HTML',
    admin: {
      rows: 10,
      description:
        'Nội dung SEO hien thi phia duoi danh sach san pham.',
    },
  },
  {
    name: 'faq',
    type: 'array',
    label: 'FAQ landing page',
    fields: [
      {
        name: 'question',
        type: 'text',
        required: true,
        label: 'Câu hỏi',
      },
      {
        name: 'answer',
        type: 'textarea',
        required: true,
        label: 'Cau tra loi',
      },
    ],
  },
  {
    name: 'featuredProducts',
    type: 'relationship',
    relationTo: 'products',
    hasMany: true,
    label: 'Sản phẩm noi bat',
  },
  {
    name: 'indexableFacets',
    type: 'array',
    label: 'Facet duoc phep index',
    fields: [
      {
        name: 'key',
        type: 'text',
        required: true,
        label: 'Ten filter',
        admin: {
          placeholder: 'VD: brand, gender, volume',
        },
      },
      {
        name: 'value',
        type: 'text',
        required: true,
        label: 'Gia tri filter',
      },
      {
        name: 'metaTitle',
        type: 'text',
        label: 'Meta title rieng',
      },
      {
        name: 'metaDescription',
        type: 'textarea',
        label: 'Meta description rieng',
      },
    ],
  },
  {
    name: 'noindexWhenEmpty',
    type: 'checkbox',
    label: 'Noindex khi khong co san pham',
    defaultValue: true,
  },
  {
    name: 'canonicalToParent',
    type: 'checkbox',
    label: 'Canonical ve trang cha',
    defaultValue: false,
  },
  {
    name: 'thumbnail',
    type: 'upload',
    relationTo: 'media',
    label: 'Thumbnail SEO',
  },
  {
    name: 'ogImage',
    type: 'upload',
    relationTo: 'media',
    label: 'Anh social rieng cho landing page',
  },
]

export const blogLandingSeoContentFields: Field[] = [
  {
    name: 'h1Override',
    type: 'text',
    label: 'H1 tùy chỉnh',
  },
  {
    name: 'introHtml',
    type: 'textarea',
    label: 'Nội dung mở đầu HTML',
    admin: {
      rows: 8,
      description:
        'Nội dung hiển thị phía trên danh sách bài viết.',
    },
  },
  {
    name: 'bottomContentHtml',
    type: 'textarea',
    label: 'Nội dung cuối trang HTML',
    admin: {
      rows: 10,
      description:
        'Nội dung SEO hiển thị phía dưới danh sách bài viết.',
    },
  },
  {
    name: 'faq',
    type: 'array',
    label: 'FAQ landing page',
    fields: [
      {
        name: 'question',
        type: 'text',
        required: true,
        label: 'Câu hỏi',
      },
      {
        name: 'answer',
        type: 'textarea',
        required: true,
        label: 'Câu trả lời',
      },
    ],
  },
  {
    name: 'featuredPosts',
    type: 'relationship',
    relationTo: 'posts',
    hasMany: true,
    label: 'Bài viết nổi bật',
  },
  {
    name: 'internalLinks',
    type: 'array',
    label: 'Internal link gợi ý',
    fields: [
      {
        name: 'label',
        type: 'text',
        required: true,
        label: 'Nhãn link',
      },
      {
        name: 'url',
        type: 'text',
        required: true,
        label: 'URL đích',
        admin: {
          placeholder: '/blog/category/tap-chi-nuoc-hoa',
        },
      },
    ],
  },
  {
    name: 'noindexWhenEmpty',
    type: 'checkbox',
    label: 'Noindex khi không có bài viết',
    defaultValue: true,
  },
  {
    name: 'thumbnail',
    type: 'upload',
    relationTo: 'media',
    label: 'Thumbnail SEO',
  },
  {
    name: 'ogImage',
    type: 'upload',
    relationTo: 'media',
    label: 'Ảnh social riêng cho landing page',
  },
]
