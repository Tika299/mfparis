import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories_indexable_facets" ADD COLUMN "h1" varchar;
  ALTER TABLE "categories_indexable_facets" ADD COLUMN "intro_html" varchar;
  ALTER TABLE "categories_indexable_facets" ADD COLUMN "bottom_content_html" varchar;
  ALTER TABLE "brands_indexable_facets" DROP COLUMN "h1";
  ALTER TABLE "brands_indexable_facets" DROP COLUMN "intro_html";
  ALTER TABLE "brands_indexable_facets" DROP COLUMN "bottom_content_html";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands_indexable_facets" ADD COLUMN "h1" varchar;
  ALTER TABLE "brands_indexable_facets" ADD COLUMN "intro_html" varchar;
  ALTER TABLE "brands_indexable_facets" ADD COLUMN "bottom_content_html" varchar;
  ALTER TABLE "categories_indexable_facets" DROP COLUMN "h1";
  ALTER TABLE "categories_indexable_facets" DROP COLUMN "intro_html";
  ALTER TABLE "categories_indexable_facets" DROP COLUMN "bottom_content_html";`)
}
