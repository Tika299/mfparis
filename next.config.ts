import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'], // Ưu tiên AVIF, nếu máy cũ không hỗ trợ sẽ dùng WebP
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Tạo các bản nén phù hợp với từng loại màn hình
    minimumCacheTTL: 31536000, // Lưu ảnh trong cache trình duyệt 1 năm (Google rất thích điều này)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Thêm dòng này để cho phép ảnh từ Unsplash
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Cho phép nếu bạn dùng Supabase
      },
    ],
    // Hỗ trợ thêm các đường dẫn ảnh nội bộ từ Payload CMS
    localPatterns: [
      {
        pathname: '/api/media/**',
        search: '',
      },
      {
        pathname: '/media/**',
        search: '',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
