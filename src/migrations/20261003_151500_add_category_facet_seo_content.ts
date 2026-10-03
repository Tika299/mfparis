import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories_indexable_facets"
      ADD COLUMN "h1" varchar,
      ADD COLUMN "intro_html" varchar,
      ADD COLUMN "bottom_content_html" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories_indexable_facets"
      DROP COLUMN "h1",
      DROP COLUMN "intro_html",
      DROP COLUMN "bottom_content_html";
  `)
}
