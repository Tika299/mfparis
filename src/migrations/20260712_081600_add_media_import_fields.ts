import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_imported_from" AS ENUM('manual', 'wordpress', 'woocommerce');
  ALTER TABLE "media" ADD COLUMN "title" varchar;
  ALTER TABLE "media" ADD COLUMN "caption" varchar;
  ALTER TABLE "media" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "media" ADD COLUMN "source_url" varchar;
  ALTER TABLE "media" ADD COLUMN "source_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "imported_from" "enum_media_imported_from" DEFAULT 'manual';
  ALTER TABLE "brands" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "brands" ADD COLUMN "source_url" varchar;
  ALTER TABLE "brands" ADD COLUMN "import_notes" varchar;
  ALTER TABLE "products_variants" ADD COLUMN "wp_variation_id" numeric;
  ALTER TABLE "products" ADD COLUMN "gtin" varchar;
  ALTER TABLE "products" ADD COLUMN "mpn" varchar;
  ALTER TABLE "products" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "products" ADD COLUMN "source_url" varchar;
  ALTER TABLE "products" ADD COLUMN "import_notes" varchar;
  ALTER TABLE "categories" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "categories" ADD COLUMN "source_url" varchar;
  ALTER TABLE "categories" ADD COLUMN "import_notes" varchar;
  ALTER TABLE "posts" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "posts" ADD COLUMN "source_url" varchar;
  ALTER TABLE "posts" ADD COLUMN "import_notes" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "description" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "post_categories" ADD COLUMN "source_url" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "import_notes" varchar;
  ALTER TABLE "attributes" ADD COLUMN "woo_attribute_id" numeric;
  ALTER TABLE "attributes" ADD COLUMN "woo_taxonomy_slug" varchar;
  ALTER TABLE "attribute_values" ADD COLUMN "woo_term_id" numeric;
  ALTER TABLE "attribute_values" ADD COLUMN "woo_taxonomy_slug" varchar;
  CREATE UNIQUE INDEX "media_wp_id_idx" ON "media" USING btree ("wp_id");
  CREATE INDEX "media_source_url_idx" ON "media" USING btree ("source_url");
  CREATE INDEX "media_source_filename_idx" ON "media" USING btree ("source_filename");
  CREATE UNIQUE INDEX "brands_wp_id_idx" ON "brands" USING btree ("wp_id");
  CREATE UNIQUE INDEX "products_wp_id_idx" ON "products" USING btree ("wp_id");
  CREATE UNIQUE INDEX "categories_wp_id_idx" ON "categories" USING btree ("wp_id");
  CREATE UNIQUE INDEX "posts_wp_id_idx" ON "posts" USING btree ("wp_id");
  CREATE UNIQUE INDEX "post_categories_wp_id_idx" ON "post_categories" USING btree ("wp_id");
  CREATE UNIQUE INDEX "attributes_woo_attribute_id_idx" ON "attributes" USING btree ("woo_attribute_id");
  CREATE INDEX "attributes_woo_taxonomy_slug_idx" ON "attributes" USING btree ("woo_taxonomy_slug");
  CREATE INDEX "attribute_values_woo_term_id_idx" ON "attribute_values" USING btree ("woo_term_id");
  CREATE INDEX "attribute_values_woo_taxonomy_slug_idx" ON "attribute_values" USING btree ("woo_taxonomy_slug");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_wp_id_idx";
  DROP INDEX "media_source_url_idx";
  DROP INDEX "media_source_filename_idx";
  DROP INDEX "brands_wp_id_idx";
  DROP INDEX "products_wp_id_idx";
  DROP INDEX "categories_wp_id_idx";
  DROP INDEX "posts_wp_id_idx";
  DROP INDEX "post_categories_wp_id_idx";
  DROP INDEX "attributes_woo_attribute_id_idx";
  DROP INDEX "attributes_woo_taxonomy_slug_idx";
  DROP INDEX "attribute_values_woo_term_id_idx";
  DROP INDEX "attribute_values_woo_taxonomy_slug_idx";
  ALTER TABLE "media" DROP COLUMN "title";
  ALTER TABLE "media" DROP COLUMN "caption";
  ALTER TABLE "media" DROP COLUMN "wp_id";
  ALTER TABLE "media" DROP COLUMN "source_url";
  ALTER TABLE "media" DROP COLUMN "source_filename";
  ALTER TABLE "media" DROP COLUMN "imported_from";
  ALTER TABLE "brands" DROP COLUMN "wp_id";
  ALTER TABLE "brands" DROP COLUMN "source_url";
  ALTER TABLE "brands" DROP COLUMN "import_notes";
  ALTER TABLE "products_variants" DROP COLUMN "wp_variation_id";
  ALTER TABLE "products" DROP COLUMN "gtin";
  ALTER TABLE "products" DROP COLUMN "mpn";
  ALTER TABLE "products" DROP COLUMN "wp_id";
  ALTER TABLE "products" DROP COLUMN "source_url";
  ALTER TABLE "products" DROP COLUMN "import_notes";
  ALTER TABLE "categories" DROP COLUMN "wp_id";
  ALTER TABLE "categories" DROP COLUMN "source_url";
  ALTER TABLE "categories" DROP COLUMN "import_notes";
  ALTER TABLE "posts" DROP COLUMN "wp_id";
  ALTER TABLE "posts" DROP COLUMN "source_url";
  ALTER TABLE "posts" DROP COLUMN "import_notes";
  ALTER TABLE "post_categories" DROP COLUMN "description";
  ALTER TABLE "post_categories" DROP COLUMN "wp_id";
  ALTER TABLE "post_categories" DROP COLUMN "source_url";
  ALTER TABLE "post_categories" DROP COLUMN "import_notes";
  ALTER TABLE "attributes" DROP COLUMN "woo_attribute_id";
  ALTER TABLE "attributes" DROP COLUMN "woo_taxonomy_slug";
  ALTER TABLE "attribute_values" DROP COLUMN "woo_term_id";
  ALTER TABLE "attribute_values" DROP COLUMN "woo_taxonomy_slug";
  DROP TYPE "public"."enum_media_imported_from";`)
}
