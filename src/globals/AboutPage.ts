import { GlobalConfig } from 'payload'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'

const uploadField = (name: string, label: string) => ({
  name,
  type: 'upload' as const,
  relationTo: 'media' as const,
  label,
})

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'Trang Giới thiệu',
  admin: {
    group: 'Nội dung',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          fields: [
            {
              name: 'hero',
              type: 'group',
              label: 'Khối mở đầu',
              fields: [
                {
                  name: 'eyebrow',
                  type: 'text',
                  label: 'Dòng nhỏ phía trên',
                  defaultValue: 'Since 2018 · MF Paris',
                },
                {
                  name: 'title',
                  type: 'text',
                  label: 'Tiêu đề lớn',
                  defaultValue: 'Câu Chuyện Thương Hiệu',
                },
                {
                  name: 'subtitle',
                  type: 'textarea',
                  label: 'Mô tả ngắn',
                  defaultValue:
                    'Marais de France đồng hành cùng vẻ đẹp chính hãng, an toàn và giàu cảm hứng từ nước Pháp đến người Việt.',
                },
                uploadField('image', 'Ảnh nền hero'),
                uploadField('productImage', 'Ảnh sản phẩm bên phải'),
                {
                  name: 'stats',
                  type: 'array',
                  label: 'Thông số nổi bật',
                  minRows: 0,
                  fields: [
                    { name: 'value', type: 'text', label: 'Giá trị' },
                    { name: 'label', type: 'text', label: 'Nhãn' },
                  ],
                  defaultValue: [
                    { value: '2018', label: 'Khởi nguồn' },
                    { value: '100%', label: 'Chính hãng' },
                    { value: 'VN', label: 'Toàn quốc' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Câu chuyện',
          fields: [
            {
              name: 'story',
              type: 'group',
              label: 'Hành trình thương hiệu',
              fields: [
                {
                  name: 'eyebrow',
                  type: 'text',
                  label: 'Dòng nhỏ',
                  defaultValue: 'Hành trình của chúng tôi',
                },
                {
                  name: 'heading',
                  type: 'text',
                  label: 'Tiêu đề',
                  defaultValue: 'Marais de France',
                },
                {
                  name: 'summary',
                  type: 'textarea',
                  label: 'Tóm tắt bên trái',
                  defaultValue:
                    'Một thương hiệu được xây dựng từ niềm tin vào cái đẹp chân thật, nguồn gốc minh bạch và trải nghiệm mua sắm tử tế.',
                },
                {
                  name: 'signature',
                  type: 'text',
                  label: 'Chữ ký/điểm nhấn',
                  defaultValue: 'Marais de France',
                },
                htmlEditorField({
                  name: 'content',
                  label: 'Nội dung câu chuyện',
                  rows: 24,
                }),
                uploadField('image', 'Ảnh minh họa câu chuyện'),
                {
                  name: 'videoUrl',
                  type: 'text',
                  label: 'Link video giới thiệu',
                  admin: {
                    description: 'Dán link YouTube, YouTube Shorts, youtu.be hoặc Vimeo.',
                  },
                },
                {
                  name: 'videoTitle',
                  type: 'text',
                  label: 'Tiêu đề mô tả video',
                  defaultValue: 'Video giới thiệu Marais de France',
                },
              ],
            },
          ],
        },
        {
          label: 'Khác biệt',
          fields: [
            {
              name: 'difference',
              type: 'group',
              label: 'Giá trị khác biệt',
              fields: [
                {
                  name: 'eyebrow',
                  type: 'text',
                  label: 'Dòng nhỏ',
                  defaultValue: 'Vì sao chọn chúng tôi?',
                },
                {
                  name: 'heading',
                  type: 'text',
                  label: 'Tiêu đề',
                  defaultValue: 'Giá trị làm nên sự khác biệt',
                },
                {
                  name: 'intro',
                  type: 'textarea',
                  label: 'Mô tả ngắn',
                  defaultValue:
                    'Chúng tôi không ngừng tìm hiểu và phát triển để bạn luôn cảm nhận được sự khác biệt từ sản phẩm chính hãng.',
                },
                { name: 'ctaLabel', type: 'text', label: 'Nhãn nút', defaultValue: 'Khám phá ngay' },
                { name: 'ctaHref', type: 'text', label: 'Đường dẫn nút', defaultValue: '/about' },
                {
                  name: 'cards',
                  type: 'array',
                  label: 'Thẻ nội dung có ảnh',
                  minRows: 0,
                  fields: [
                    uploadField('image', 'Ảnh'),
                    { name: 'title', type: 'text', label: 'Tiêu đề' },
                    { name: 'description', type: 'textarea', label: 'Mô tả' },
                  ],
                  defaultValue: [
                    {
                      title: 'Tầm nhìn thương hiệu',
                      description:
                        'Mang đến phong cách Pháp, tinh tế và rõ ràng trong từng trải nghiệm làm đẹp.',
                    },
                    {
                      title: 'Sứ mệnh',
                      description:
                        'Cung cấp sản phẩm chính hãng 100%, chất lượng cao và tư vấn tận tâm cho khách hàng Việt.',
                    },
                    {
                      title: 'Cam kết',
                      description:
                        'Hàng chính hãng, nguồn gốc rõ ràng, giá hợp lý và chính sách hậu mãi chuyên nghiệp.',
                    },
                  ],
                },
              ],
            },
            {
              name: 'serviceHighlights',
              type: 'array',
              label: 'Dải cam kết dịch vụ',
              minRows: 0,
              fields: [
                { name: 'title', type: 'text', label: 'Tiêu đề' },
                { name: 'description', type: 'textarea', label: 'Mô tả' },
              ],
              defaultValue: [
                { title: '100% Chính hãng', description: 'Cam kết hàng nhập khẩu chính hãng' },
                { title: 'Đổi trả dễ dàng', description: 'Hỗ trợ đổi trả trong 7 ngày' },
                { title: 'Tư vấn tận tâm', description: 'Đội ngũ am hiểu sản phẩm' },
                { title: 'Giao hàng toàn quốc', description: 'Nhanh chóng và an toàn' },
              ],
            },
          ],
        },
        {
          label: 'Cam kết',
          fields: [
            {
              name: 'values',
              type: 'array',
              label: 'Giá trị cốt lõi',
              minRows: 0,
              fields: [
                { name: 'title', type: 'text', label: 'Tiêu đề' },
                { name: 'description', type: 'textarea', label: 'Mô tả' },
              ],
              defaultValue: [
                {
                  title: 'Tận tâm',
                  description:
                    'Không chỉ trong từng sản phẩm, Marais de France luôn hướng đến sự hài lòng và trải nghiệm mua sắm tuyệt vời nhất.',
                },
                {
                  title: 'Chất lượng',
                  description:
                    'Cam kết chỉ phân phối những sản phẩm chính hãng, đạt chuẩn quốc tế và có kiểm định rõ ràng.',
                },
                {
                  title: 'Chuyên nghiệp',
                  description:
                    'Từ phong cách làm việc đến trải nghiệm khách hàng, mọi quy trình đều được tối ưu từng chi tiết.',
                },
                {
                  title: 'Trách nhiệm',
                  description:
                    'Với khách hàng, đối tác và cộng đồng, chúng tôi luôn hành động với tinh thần trách nhiệm cao nhất.',
                },
                {
                  title: 'Truyền cảm hứng',
                  description:
                    'Vẻ đẹp thật sự tạo ra năng lượng tự tin mới mỗi ngày.',
                },
              ],
            },
          ],
        },
        {
          label: 'Showroom',
          fields: [
            {
              name: 'showroom',
              type: 'group',
              label: 'Khối showroom cuối trang',
              fields: [
                uploadField('image', 'Ảnh nền lớn showroom/sản phẩm'),
                {
                  name: 'heading',
                  type: 'textarea',
                  label: 'Tiêu đề',
                  defaultValue: 'Đến tận nơi, thử tận tay, chọn đúng sản phẩm dành cho bạn.',
                },
                { name: 'ctaLabel', type: 'text', label: 'Nhãn nút', defaultValue: 'Khám phá ngay' },
                { name: 'ctaHref', type: 'text', label: 'Đường dẫn nút', defaultValue: '/he-thong-cua-hang' },
                { name: 'locationTitle', type: 'text', label: 'Tiêu đề địa chỉ', defaultValue: 'Marais de France' },
                {
                  name: 'locationText',
                  type: 'textarea',
                  label: 'Địa chỉ',
                  defaultValue: '220/24 Nguyễn Oanh, Phường Gò Vấp, TP.HCM',
                },
                { name: 'channelsTitle', type: 'text', label: 'Tiêu đề kênh bán', defaultValue: 'Phục vụ toàn quốc' },
                {
                  name: 'channelsText',
                  type: 'textarea',
                  label: 'Kênh bán',
                  defaultValue: 'Website, Facebook, TikTok Shop, Shopee, Lazada và các kênh chính thức.',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
