import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories_indexable_facets"
      ADD COLUMN IF NOT EXISTS "h1" varchar,
      ADD COLUMN IF NOT EXISTS "intro_html" varchar,
      ADD COLUMN IF NOT EXISTS "bottom_content_html" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories_indexable_facets"
      DROP COLUMN IF EXISTS "h1",
      DROP COLUMN IF EXISTS "intro_html",
      DROP COLUMN IF EXISTS "bottom_content_html";
  `)
}
