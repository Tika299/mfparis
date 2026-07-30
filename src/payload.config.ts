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
import { BlogComments } from '@/collections/BlogComments'
import { BlogAuthors } from '@/collections/BlogAuthors'
import { InternalLinkRules } from '@/collections/InternalLinkRules'
import { InternalLinkLogs } from '@/collections/InternalLinkLogs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com'
const smtpPort = Number(process.env.SMTP_PORT || 465)
const smtpUser =
  process.env.SMTP_USER?.trim() ||
  process.env.SMTP_USERNAME?.trim() ||
  process.env.SMTP_EMAIL?.trim() ||
  'mfparisvn@gmail.com'
const smtpPassword =
  process.env.SMTP_PASSWORD?.trim() ||
  process.env.SMTP_PASS?.trim()
const emailFromAddress =
  process.env.SMTP_FROM_ADDRESS?.trim() ||
  smtpUser ||
  'mfparisvn@gmail.com'
const emailFromName =
  process.env.SMTP_FROM_NAME?.trim() ||
  'MF PARIS - Hệ thống Đơn hàng'

const emailAdapter = smtpUser && smtpPassword
  ? nodemailerAdapter({
    defaultFromAddress: emailFromAddress,
    defaultFromName: emailFromName,
    transportOptions: {
      host: smtpHost,
      port: Number.isFinite(smtpPort) ? smtpPort : 465,
      secure: (process.env.SMTP_SECURE ?? 'true') !== 'false',
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    },
  })
  : undefined

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
        InternalLinkSuggestions: {
          Component: '@/components/Admin/InternalLinkSuggestions#InternalLinkSuggestions',
          path: '/internal-links/suggestions',
        },
        ContentExcelManager: {
          Component: '@/components/Admin/ContentExcelManager#ContentExcelManager',
          path: '/content-excel',
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
    BlogAuthors,
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
    BlogComments,
    VoucherRedemptions,
    InternalLinkRules,
    InternalLinkLogs,
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
  ...(emailAdapter ? { email: emailAdapter } : {}),
})
