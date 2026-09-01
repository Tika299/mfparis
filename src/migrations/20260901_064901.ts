import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_categories_filter_profile_preset" AS ENUM('auto', 'fragrance', 'skincare', 'makeup', 'health', 'hair', 'body', 'minimal', 'custom');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_product_filter_groups_show_on" AS ENUM('products', 'categories', 'brands', 'search');
  CREATE TYPE "public"."enum_product_filter_groups_source_type" AS ENUM('brand', 'category', 'attribute', 'fragrance-note', 'price');
  CREATE TYPE "public"."enum_product_filter_groups_display_type" AS ENUM('checkbox', 'radio', 'select', 'chips', 'range');
  CREATE TABLE "categories_filter_profile_facet_keys" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "product_filter_groups_show_on" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_product_filter_groups_show_on",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "product_filter_groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"query_key" varchar NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 100,
  	"source_type" "enum_product_filter_groups_source_type" DEFAULT 'attribute' NOT NULL,
  	"attribute_id" integer,
  	"display_type" "enum_product_filter_groups_display_type" DEFAULT 'checkbox' NOT NULL,
  	"max_options" numeric DEFAULT 50,
  	"collapsed_by_default" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
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
  ALTER TABLE "posts" ADD COLUMN "status" "enum_posts_status" DEFAULT 'draft';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "product_filter_groups_id" integer;
  ALTER TABLE "categories_filter_profile_facet_keys" ADD CONSTRAINT "categories_filter_profile_facet_keys_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_filter_groups_show_on" ADD CONSTRAINT "product_filter_groups_show_on_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_filter_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_filter_groups" ADD CONSTRAINT "product_filter_groups_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "categories_filter_profile_facet_keys_order_idx" ON "categories_filter_profile_facet_keys" USING btree ("_order");
  CREATE INDEX "categories_filter_profile_facet_keys_parent_id_idx" ON "categories_filter_profile_facet_keys" USING btree ("_parent_id");
  CREATE INDEX "product_filter_groups_show_on_order_idx" ON "product_filter_groups_show_on" USING btree ("order");
  CREATE INDEX "product_filter_groups_show_on_parent_idx" ON "product_filter_groups_show_on" USING btree ("parent_id");
  CREATE UNIQUE INDEX "product_filter_groups_query_key_idx" ON "product_filter_groups" USING btree ("query_key");
  CREATE INDEX "product_filter_groups_sort_order_idx" ON "product_filter_groups" USING btree ("sort_order");
  CREATE INDEX "product_filter_groups_attribute_idx" ON "product_filter_groups" USING btree ("attribute_id");
  CREATE INDEX "product_filter_groups_updated_at_idx" ON "product_filter_groups" USING btree ("updated_at");
  CREATE INDEX "product_filter_groups_created_at_idx" ON "product_filter_groups" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_filter_groups_fk" FOREIGN KEY ("product_filter_groups_id") REFERENCES "public"."product_filter_groups"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");
  CREATE INDEX "payload_locked_documents_rels_product_filter_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("product_filter_groups_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories_filter_profile_facet_keys" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "product_filter_groups_show_on" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "product_filter_groups" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "categories_filter_profile_facet_keys" CASCADE;
  DROP TABLE "product_filter_groups_show_on" CASCADE;
  DROP TABLE "product_filter_groups" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_product_filter_groups_fk";
  
  DROP INDEX "posts_status_idx";
  DROP INDEX "payload_locked_documents_rels_product_filter_groups_id_idx";
  ALTER TABLE "categories" DROP COLUMN "filter_profile_preset";
  ALTER TABLE "categories" DROP COLUMN "filter_profile_inherit_parent_profile";
  ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_brand";
  ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_category";
  ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_price";
  ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_availability";
  ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_sale";
  ALTER TABLE "categories" DROP COLUMN "filter_profile_core_filters_rating";
  ALTER TABLE "categories" DROP COLUMN "filter_profile_show_fragrance_notes";
  ALTER TABLE "posts" DROP COLUMN "status";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "product_filter_groups_id";
  DROP TYPE "public"."enum_categories_filter_profile_preset";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum_product_filter_groups_show_on";
  DROP TYPE "public"."enum_product_filter_groups_source_type";
  DROP TYPE "public"."enum_product_filter_groups_display_type";`)
}
