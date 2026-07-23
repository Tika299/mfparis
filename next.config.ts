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
    return [
      /*
       * Pretty URLs for filter/search pages.
       * These are internal rewrites, not 301 redirects:
       * users keep the clean URL while Next.js renders the existing route.
       */
      {
        source: '/san-pham-moi',
        destination: '/products?sort=-createdAt',
      },
      {
        source: '/san-pham-ban-chay',
        destination: '/products?sort=-reviewCount',
      },
      {
        source: '/san-pham-giam-gia',
        destination: '/products?sale=yes',
      },
      {
        source: '/san-pham-con-hang',
        destination: '/products?availability=in-stock',
      },
      {
        source: '/nuoc-hoa/:brand',
        destination: '/products?category=nuoc-hoa&brand=:brand',
      },
      {
        source: '/danh-muc/:category',
        destination: '/categories/:category',
      },
      {
        source: '/loc/danh-muc/:category/thuong-hieu/:brand',
        destination: '/products?category=:category&brand=:brand',
      },
      {
        source: '/loc/thuong-hieu/:brand/danh-muc/:category',
        destination: '/products?brand=:brand&category=:category',
      },
      {
        source: '/loc/thuong-hieu/:brand',
        destination: '/products?brand=:brand',
      },
      {
        source: '/loc/danh-muc/:category',
        destination: '/products?category=:category',
      },
      {
        source: '/loc/huong/:note',
        destination: '/products?note=:note',
      },
      {
        source: '/loc/gioi-tinh/:gender',
        destination: '/products?gender=:gender',
      },
      {
        source: '/loc/dung-tich/:volume',
        destination: '/products?volume=:volume',
      },
      {
        source: '/loc/thuoc-tinh/:attribute/:value',
        destination: '/products?attribute=:attribute&value=:value',
      },
    ]
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
