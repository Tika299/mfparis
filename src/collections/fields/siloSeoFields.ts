import type { Field } from 'payload'

type SiloSeoFieldsOptions = {
  kind: 'product' | 'post'
}

export function siloSeoFields({ kind }: SiloSeoFieldsOptions): Field[] {
  const isProduct = kind === 'product'

  return [
    {
      name: 'displayName',
      type: 'text',
      label: 'Tên hiển thị SEO',
      admin: {
        description: 'Dùng để đổi nhãn trên frontend/admin mà vẫn có thể giữ slug cũ.',
      },
    },
    {
      name: 'taxonomyType',
      type: 'select',
      label: 'Loại taxonomy',
      defaultValue: 'category',
      options: [
        { label: 'Danh mục', value: 'category' },
        { label: 'Collection SEO', value: 'collection' },
        { label: 'Danh mục hỗ trợ', value: 'support' },
        { label: 'Node trung gian tạm', value: 'temporary-node' },
        { label: 'Facet / bộ lọc', value: 'facet' },
        { label: 'Loại bỏ', value: 'removed' },
      ],
      admin: {
        position: 'sidebar',
        description: isProduct
          ? 'Category = loại sản phẩm bền vững; Collection SEO = trang gom nhóm có nhu cầu tìm kiếm.'
          : 'Dùng để gom lại silo blog và tránh index category mỏng.',
      },
    },
    {
      name: 'seoIndex',
      type: 'select',
      label: 'Chính sách index',
      defaultValue: 'index',
      options: [
        { label: 'Index', value: 'index' },
        { label: 'Index có điều kiện', value: 'conditional-index' },
        { label: 'Noindex tạm', value: 'noindex-temporary' },
        { label: 'Noindex', value: 'noindex' },
        {
          label: 'Noindex sau khi chuyển hết sản phẩm/bài viết',
          value: 'noindex-after-move',
        },
      ],
      admin: {
        position: 'sidebar',
        description: 'Frontend dùng field này để xuất robots index/noindex cho trang danh mục.',
      },
    },
    {
      name: 'siloParentLabel',
      type: 'text',
      label: 'Cha silo theo kế hoạch',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'menuPlacement',
      type: 'text',
      label: 'Vị trí menu theo kế hoạch',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'implementationPriority',
      type: 'select',
      label: 'Ưu tiên triển khai',
      options: [
        { label: 'P0', value: 'P0' },
        { label: 'P1', value: 'P1' },
        { label: 'P2', value: 'P2' },
        { label: 'P3', value: 'P3' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'implementationStatus',
      type: 'select',
      label: 'Trạng thái triển khai',
      defaultValue: 'planned',
      options: [
        { label: 'Chưa làm', value: 'planned' },
        { label: 'Đang làm', value: 'in-progress' },
        { label: 'Đã làm', value: 'done' },
        { label: 'Cần kiểm tra GSC', value: 'needs-gsc-review' },
        { label: 'Tạm hoãn', value: 'deferred' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'siloAction',
      type: 'text',
      label: 'Hành động silo',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'redirectStatus',
      type: 'select',
      label: 'Xử lý URL',
      options: [
        { label: 'Giữ URL', value: 'keep' },
        { label: '301', value: '301' },
        { label: '410 / Noindex', value: '410-noindex' },
        { label: 'Noindex', value: 'noindex' },
        { label: 'Giữ / Noindex', value: 'keep-noindex' },
        { label: 'Giữ / đánh giá', value: 'review' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'redirectTo',
      type: 'text',
      label: 'URL đích nếu redirect/gộp',
      admin: {
        position: 'sidebar',
        description: 'Chỉ áp dụng 301 sau khi đã đối chiếu GSC/backlink/doanh thu.',
      },
    },
    {
      name: 'siloNotes',
      type: 'textarea',
      label: 'Ghi chú silo SEO',
      admin: {
        rows: 4,
      },
    },
  ]
}
