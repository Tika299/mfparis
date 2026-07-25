import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/thuong-hieu/:brand',
        destination: '/brands/:brand',
        permanent: true,
      },
      {
        source: '/thuong-hieu/:brand/san-pham',
        destination: '/brands/:brand',
        permanent: true,
      },
      {
        source: '/san-pham-moi',
        destination: '/products?sort=-createdAt',
        permanent: true,
      },
      {
        source: '/san-pham-ban-chay',
        destination: '/products?sort=-reviewCount',
        permanent: true,
      },
      {
        source: '/san-pham-giam-gia',
        destination: '/products?sale=yes',
        permanent: true,
      },
      {
        source: '/san-pham-con-hang',
        destination: '/products?availability=in-stock',
        permanent: true,
      },
      {
        source: '/nuoc-hoa/:brand',
        destination: '/brands/:brand',
        permanent: true,
      },
      {
        source: '/danh-muc/:category',
        destination: '/categories/:category',
        permanent: true,
      },
      {
        source: '/loc/danh-muc/:category/thuong-hieu/:brand',
        destination: '/products?category=:category&brand=:brand',
        permanent: true,
      },
      {
        source: '/loc/thuong-hieu/:brand/danh-muc/:category',
        destination: '/products?brand=:brand&category=:category',
        permanent: true,
      },
      {
        source: '/loc/thuong-hieu/:brand',
        destination: '/brands/:brand',
        permanent: true,
      },
      {
        source: '/loc/danh-muc/:category',
        destination: '/categories/:category',
        permanent: true,
      },
      {
        source: '/loc/huong/:note',
        destination: '/products?note=:note',
        permanent: true,
      },
      {
        source: '/loc/gioi-tinh/:gender',
        destination: '/products?gender=:gender',
        permanent: true,
      },
      {
        source: '/loc/dung-tich/:volume',
        destination: '/products?volume=:volume',
        permanent: true,
      },
      {
        source: '/loc/thuoc-tinh/:attribute/:value',
        destination: '/products?attribute=:attribute&value=:value',
        permanent: true,
      },
      {
        source: '/shop',
        has: [
          {
            type: 'query',
            key: 'filter_brand',
            value: '(?<brand>[^&]+)',
          },
        ],
        destination: '/brands/:brand',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return []
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [378, 414, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [96, 160, 320],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
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
