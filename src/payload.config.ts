import { postgresAdapter } from '@payloadcms/db-postgres'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { Products } from './collections/Products'
import { Brands } from './collections/Brands'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { SiteSettings } from './globals/SiteSettings'
import { Categories } from './collections/Categories'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { Posts } from './collections/Posts'
import { PostCategories } from './collections/PostCategories'
import { AboutPage } from './globals/AboutPage'
import { Messages } from './collections/Messages'
import { ChatProfiles } from './collections/ChatProfiles'
import { Vouchers } from './collections/Vouchers'
import { Redirects } from '@/collections/Redirects'
import { Attributes } from '@/collections/Attributes'
import { AttributeValues } from '@/collections/AttributeValues'
import { Carts } from '@/collections/Carts'
import { FragranceNotes } from './collections/FragranceNotes'
import { Reviews } from '@/collections/Reviews'
import { VoucherRedemptions } from '@/collections/VoucherRedemptions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      // Đăng ký trang mới
      views: {
        ChatCenter: {
          Component: '@/components/Admin/ChatCenter#ChatCenter',
          path: '/chat',
        },
      },
      beforeDashboard: ['@/components/Admin/ChatDashboardCard#ChatDashboardCard'],
    },
  },
  collections: [
    Users,
    Media,
    Brands,
    Products,
    Categories,
    Orders,
    Posts,
    PostCategories,
    Messages,
    ChatProfiles,
    Vouchers,
    Redirects,
    Attributes,
    AttributeValues,
    Carts,
    FragranceNotes,
    Reviews,
    VoucherRedemptions,
  ],
  globals: [SiteSettings, AboutPage],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter(
    {
      pool: { connectionString: process.env.DATABASE_URL, },
      transactionOptions: { isolationLevel: 'serializable', },
    }
  ),
  sharp,
  plugins: [],
  email: nodemailerAdapter({
    defaultFromAddress: 'mfparisvn@gmail.com',
    defaultFromName: 'MF PARIS - Hệ thống Đơn hàng',
    transportOptions: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'mfparisvn@gmail.com',
        pass: process.env.SMTP_PASSWORD,
      },
    },
  }),
})
