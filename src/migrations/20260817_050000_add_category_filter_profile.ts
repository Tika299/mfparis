import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_categories_filter_profile_preset" AS ENUM('auto', 'fragrance', 'skincare', 'makeup', 'health', 'hair', 'body', 'minimal', 'custom');

    CREATE TABLE "categories_filter_profile_facet_keys" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "label" varchar
    );

    ALTER TABLE "categories" ADD COLUMN "filter_profile_preset" "enum_categories_filter_profile_preset" DEFAULT 'auto';
    ALTER TABLE "categories" ADD COLUMN "filter_profile_inherit_parent_profile" boolean DEFAULT true;
    ALTER TABLE "categories" ADD COLUMN "filter_profile_core_filters_brand" boolean DEFAULT true;
    ALTER TABLE "categories" ADD COLUMN "filter_profile_core_filters_category" boolean DEFAULT true;
    ALTER TABLE "categories" ADD COLUMN "filter_profile_core_filters_price" boolean DEFAULT true;
    ALTER TABLE "categories" ADD COLUMN "filter_profile_core_filters_availability" boolean DEFAULT true;
    ALTER TABLE "categories" ADD COLUMN "filter_profile_core_filters_sale" boolean DEFAULT true;
    ALTER TABLE "categories" ADD COLUMN "filter_profile_core_filters_rating" boolean DEFAULT true;
    ALTER TABLE "categories" ADD COLUMN "filter_profile_show_fragrance_notes" boolean DEFAULT false;

    ALTER TABLE "categories_filter_profile_facet_keys" ADD CONSTRAINT "categories_filter_profile_facet_keys_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "categories_filter_profile_facet_keys_order_idx" ON "categories_filter_profile_facet_keys" USING btree ("_order");
    CREATE INDEX "categories_filter_profile_facet_keys_parent_id_idx" ON "categories_filter_profile_facet_keys" USING btree ("_parent_id");
    CREATE INDEX "categories_filter_profile_preset_idx" ON "categories" USING btree ("filter_profile_preset");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "categories_filter_profile_preset_idx";
    DROP TABLE "categories_filter_profile_facet_keys" CASCADE;
    ALTER TABLE "categories" DROP COLUMN "filter_profile_show_fragrance_notes";
    ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_rating";
    ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_sale";
    ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_availability";
    ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_price";
    ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_category";
    ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_brand";
    ALTER TABLE "categories" DROP COLUMN "filter_profile_inherit_parent_profile";
    ALTER TABLE "categories" DROP COLUMN "filter_profile_preset";
    DROP TYPE "public"."enum_categories_filter_profile_preset";
  `)
}
