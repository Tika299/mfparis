import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is missing.')
  }

  const sql = postgres(connectionString, {
    max: 1,
  })

  try {
    await sql.unsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm')

    const indexStatements = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS products_search_keywords_trgm_idx ON products USING gin (search_keywords gin_trgm_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS products_title_trgm_idx ON products USING gin (title gin_trgm_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS products_slug_trgm_idx ON products USING gin (slug gin_trgm_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS products_sku_trgm_idx ON products USING gin (sku gin_trgm_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS brands_name_trgm_idx ON brands USING gin (name gin_trgm_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS brands_slug_trgm_idx ON brands USING gin (slug gin_trgm_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS categories_name_trgm_idx ON categories USING gin (name gin_trgm_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS categories_slug_trgm_idx ON categories USING gin (slug gin_trgm_ops)',
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS products_published_created_at_desc_idx ON products (created_at DESC) WHERE status = 'published'",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS products_published_price_base_price_idx ON products (price_base_price) WHERE status = 'published'",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS products_published_average_rating_idx ON products (average_rating DESC) WHERE status = 'published'",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS products_published_review_count_idx ON products (review_count DESC) WHERE status = 'published'",
    ]

    for (const statement of indexStatements) {
      await sql.unsafe(statement)
    }

    console.log('Search indexes are ready.')
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error('Create search indexes failed:', error)
  process.exit(1)
})
