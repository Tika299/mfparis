import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_seo_status" AS ENUM('active', 'temporarily_out_of_stock', 'discontinued_keep_page', 'discontinued_redirect');
  CREATE TYPE "public"."enum_attributes_scope" AS ENUM('general', 'fragrance', 'beauty');
  CREATE TYPE "public"."enum_attributes_value_type" AS ENUM('select', 'multi_select', 'number', 'range', 'boolean', 'text');
  CREATE TYPE "public"."enum_attributes_display_style" AS ENUM('checkbox', 'radio', 'dropdown', 'chips', 'range', 'color');
  CREATE TYPE "public"."enum_carts_status" AS ENUM('active', 'abandoned', 'converted', 'merged', 'expired');
  CREATE TABLE "products_product_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attribute_id" integer NOT NULL,
  	"numeric_value" numeric,
  	"boolean_value" boolean,
  	"text_value" varchar
  );
  
  CREATE TABLE "attributes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"scope" "enum_attributes_scope" DEFAULT 'general' NOT NULL,
  	"value_type" "enum_attributes_value_type" DEFAULT 'select' NOT NULL,
  	"unit" varchar,
  	"sort_order" numeric DEFAULT 0,
  	"filterable" boolean DEFAULT true,
  	"comparable" boolean DEFAULT true,
  	"variant_option" boolean DEFAULT false,
  	"allows_multiple" boolean DEFAULT false,
  	"display_style" "enum_attributes_display_style" DEFAULT 'checkbox',
  	"validation_min" numeric,
  	"validation_max" numeric,
  	"validation_step" numeric DEFAULT 1,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attributes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "attribute_values_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alias" varchar NOT NULL
  );
  
  CREATE TABLE "attribute_values_metadata" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "attribute_values" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"attribute_id" integer NOT NULL,
  	"label" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"numeric_value" numeric,
  	"boolean_value" boolean DEFAULT false,
  	"color_hex" varchar,
  	"image_id" integer,
  	"sort_order" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"variant_id" varchar,
  	"quantity" numeric DEFAULT 1 NOT NULL,
  	"product_title_snapshot" varchar,
  	"variant_name_snapshot" varchar,
  	"sku_snapshot" varchar,
  	"unit_price_snapshot" numeric,
  	"stock_snapshot" numeric,
  	"line_total" numeric
  );
  
  CREATE TABLE "carts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer,
  	"guest_id" varchar,
  	"status" "enum_carts_status" DEFAULT 'active' NOT NULL,
  	"voucher_id" integer,
  	"subtotal_amount" numeric DEFAULT 0,
  	"discount_amount" numeric DEFAULT 0,
  	"total_amount" numeric DEFAULT 0,
  	"last_activity_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"converted_order_id" integer,
  	"merged_into_cart_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "products" ADD COLUMN "seo_status" "enum_products_seo_status" DEFAULT 'active' NOT NULL;
  ALTER TABLE "products" ADD COLUMN "related_product_id" integer;
  ALTER TABLE "products_rels" ADD COLUMN "attribute_values_id" integer;
  ALTER TABLE "orders_items" ADD COLUMN "variant_id" varchar;
  
ALTER TABLE "orders_items"
ADD COLUMN "product_title_snapshot" varchar;

UPDATE "orders_items" AS "order_item"
SET "product_title_snapshot" = COALESCE(
  "product"."title",
  'Sản phẩm'
)
FROM "products" AS "product"
WHERE
  "order_item"."product_id" = "product"."id"
  AND "order_item"."product_title_snapshot" IS NULL;

UPDATE "orders_items"
SET "product_title_snapshot" = 'Sản phẩm'
WHERE "product_title_snapshot" IS NULL;

ALTER TABLE "orders_items"
ALTER COLUMN "product_title_snapshot" SET NOT NULL;

  ALTER TABLE "orders_items" ADD COLUMN "variant_name_snapshot" varchar;
  ALTER TABLE "orders_items" ADD COLUMN "sku_snapshot" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "attributes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "attribute_values_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "carts_id" integer;
  ALTER TABLE "products_product_attributes" ADD CONSTRAINT "products_product_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_product_attributes" ADD CONSTRAINT "products_product_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attributes_rels" ADD CONSTRAINT "attributes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attributes_rels" ADD CONSTRAINT "attributes_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attribute_values_aliases" ADD CONSTRAINT "attribute_values_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attribute_values_metadata" ADD CONSTRAINT "attribute_values_metadata_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_merged_into_cart_id_carts_id_fk" FOREIGN KEY ("merged_into_cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "products_product_attributes_order_idx" ON "products_product_attributes" USING btree ("_order");
  CREATE INDEX "products_product_attributes_parent_id_idx" ON "products_product_attributes" USING btree ("_parent_id");
  CREATE INDEX "products_product_attributes_attribute_idx" ON "products_product_attributes" USING btree ("attribute_id");
  CREATE UNIQUE INDEX "attributes_slug_idx" ON "attributes" USING btree ("slug");
  CREATE INDEX "attributes_is_active_idx" ON "attributes" USING btree ("is_active");
  CREATE INDEX "attributes_updated_at_idx" ON "attributes" USING btree ("updated_at");
  CREATE INDEX "attributes_created_at_idx" ON "attributes" USING btree ("created_at");
  CREATE INDEX "attributes_rels_order_idx" ON "attributes_rels" USING btree ("order");
  CREATE INDEX "attributes_rels_parent_idx" ON "attributes_rels" USING btree ("parent_id");
  CREATE INDEX "attributes_rels_path_idx" ON "attributes_rels" USING btree ("path");
  CREATE INDEX "attributes_rels_categories_id_idx" ON "attributes_rels" USING btree ("categories_id");
  CREATE INDEX "attribute_values_aliases_order_idx" ON "attribute_values_aliases" USING btree ("_order");
  CREATE INDEX "attribute_values_aliases_parent_id_idx" ON "attribute_values_aliases" USING btree ("_parent_id");
  CREATE INDEX "attribute_values_metadata_order_idx" ON "attribute_values_metadata" USING btree ("_order");
  CREATE INDEX "attribute_values_metadata_parent_id_idx" ON "attribute_values_metadata" USING btree ("_parent_id");
  CREATE INDEX "attribute_values_attribute_idx" ON "attribute_values" USING btree ("attribute_id");
  CREATE INDEX "attribute_values_slug_idx" ON "attribute_values" USING btree ("slug");
  CREATE INDEX "attribute_values_image_idx" ON "attribute_values" USING btree ("image_id");
  CREATE INDEX "attribute_values_is_active_idx" ON "attribute_values" USING btree ("is_active");
  CREATE INDEX "attribute_values_updated_at_idx" ON "attribute_values" USING btree ("updated_at");
  CREATE INDEX "attribute_values_created_at_idx" ON "attribute_values" USING btree ("created_at");
  CREATE INDEX "carts_items_order_idx" ON "carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "carts_items" USING btree ("product_id");
  CREATE INDEX "carts_user_idx" ON "carts" USING btree ("user_id");
  CREATE INDEX "carts_guest_id_idx" ON "carts" USING btree ("guest_id");
  CREATE INDEX "carts_status_idx" ON "carts" USING btree ("status");
  CREATE INDEX "carts_voucher_idx" ON "carts" USING btree ("voucher_id");
  CREATE INDEX "carts_last_activity_at_idx" ON "carts" USING btree ("last_activity_at");
  CREATE INDEX "carts_expires_at_idx" ON "carts" USING btree ("expires_at");
  CREATE INDEX "carts_converted_order_idx" ON "carts" USING btree ("converted_order_id");
  CREATE INDEX "carts_merged_into_cart_idx" ON "carts" USING btree ("merged_into_cart_id");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  ALTER TABLE "products" ADD CONSTRAINT "products_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_attribute_values_fk" FOREIGN KEY ("attribute_values_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attribute_values_fk" FOREIGN KEY ("attribute_values_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_seo_status_idx" ON "products" USING btree ("seo_status");
  CREATE INDEX "products_related_product_idx" ON "products" USING btree ("related_product_id");
  CREATE INDEX "products_rels_attribute_values_id_idx" ON "products_rels" USING btree ("attribute_values_id");
  CREATE INDEX "payload_locked_documents_rels_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("attributes_id");
  CREATE INDEX "payload_locked_documents_rels_attribute_values_id_idx" ON "payload_locked_documents_rels" USING btree ("attribute_values_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_product_attributes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "attributes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "attributes_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "attribute_values_aliases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "attribute_values_metadata" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "attribute_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "carts_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "carts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_product_attributes" CASCADE;
  DROP TABLE "attributes" CASCADE;
  DROP TABLE "attributes_rels" CASCADE;
  DROP TABLE "attribute_values_aliases" CASCADE;
  DROP TABLE "attribute_values_metadata" CASCADE;
  DROP TABLE "attribute_values" CASCADE;
  DROP TABLE "carts_items" CASCADE;
  DROP TABLE "carts" CASCADE;
  ALTER TABLE "products" DROP CONSTRAINT "products_related_product_id_products_id_fk";
  
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_attribute_values_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_attributes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_attribute_values_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_carts_fk";
  
  DROP INDEX "products_seo_status_idx";
  DROP INDEX "products_related_product_idx";
  DROP INDEX "products_rels_attribute_values_id_idx";
  DROP INDEX "payload_locked_documents_rels_attributes_id_idx";
  DROP INDEX "payload_locked_documents_rels_attribute_values_id_idx";
  DROP INDEX "payload_locked_documents_rels_carts_id_idx";
  ALTER TABLE "products" DROP COLUMN "seo_status";
  ALTER TABLE "products" DROP COLUMN "related_product_id";
  ALTER TABLE "products_rels" DROP COLUMN "attribute_values_id";
  ALTER TABLE "orders_items" DROP COLUMN "variant_id";
  ALTER TABLE "orders_items" DROP COLUMN "product_title_snapshot";
  ALTER TABLE "orders_items" DROP COLUMN "variant_name_snapshot";
  ALTER TABLE "orders_items" DROP COLUMN "sku_snapshot";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "attributes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "attribute_values_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "carts_id";
  DROP TYPE "public"."enum_products_seo_status";
  DROP TYPE "public"."enum_attributes_scope";
  DROP TYPE "public"."enum_attributes_value_type";
  DROP TYPE "public"."enum_attributes_display_style";
  DROP TYPE "public"."enum_carts_status";`)
}
