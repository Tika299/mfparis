import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_vouchers_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_vouchers_type" AS ENUM('fixed', 'percent');
  CREATE TYPE "public"."enum_redirects_type" AS ENUM('301', '302');
  ALTER TYPE "public"."enum_products_display_location" ADD VALUE 'flash-sale';
  CREATE TABLE "vouchers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"title" varchar,
  	"status" "enum_vouchers_status" DEFAULT 'active',
  	"type" "enum_vouchers_type" DEFAULT 'fixed' NOT NULL,
  	"value" numeric NOT NULL,
  	"min_order_amount" numeric DEFAULT 0,
  	"max_discount_amount" numeric,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"usage_limit" numeric,
  	"used_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"type" "enum_redirects_type" DEFAULT '301' NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_flash_sale_vouchers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Voucher',
  	"value" varchar DEFAULT '15K',
  	"sub" varchar DEFAULT 'Đơn từ 799K'
  );
  
  ALTER TABLE "orders" ADD COLUMN "subtotal_amount" numeric;
  ALTER TABLE "orders" ADD COLUMN "discount_amount" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "voucher_code" varchar;
  ALTER TABLE "orders" ADD COLUMN "voucher_id_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vouchers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "redirects_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "flash_sale_enabled" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "flash_sale_end_time" timestamp(3) with time zone;
  ALTER TABLE "site_settings_flash_sale_vouchers" ADD CONSTRAINT "site_settings_flash_sale_vouchers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "vouchers_code_idx" ON "vouchers" USING btree ("code");
  CREATE INDEX "vouchers_updated_at_idx" ON "vouchers" USING btree ("updated_at");
  CREATE INDEX "vouchers_created_at_idx" ON "vouchers" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_active_idx" ON "redirects" USING btree ("active");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "site_settings_flash_sale_vouchers_order_idx" ON "site_settings_flash_sale_vouchers" USING btree ("_order");
  CREATE INDEX "site_settings_flash_sale_vouchers_parent_id_idx" ON "site_settings_flash_sale_vouchers" USING btree ("_parent_id");
  ALTER TABLE "orders" ADD CONSTRAINT "orders_voucher_id_id_vouchers_id_fk" FOREIGN KEY ("voucher_id_id") REFERENCES "public"."vouchers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vouchers_fk" FOREIGN KEY ("vouchers_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_voucher_id_idx" ON "orders" USING btree ("voucher_id_id");
  CREATE INDEX "payload_locked_documents_rels_vouchers_id_idx" ON "payload_locked_documents_rels" USING btree ("vouchers_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "vouchers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "redirects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_flash_sale_vouchers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "vouchers" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "site_settings_flash_sale_vouchers" CASCADE;
  ALTER TABLE "orders" DROP CONSTRAINT "orders_voucher_id_id_vouchers_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vouchers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_redirects_fk";
  
  ALTER TABLE "products_display_location" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_products_display_location";
  CREATE TYPE "public"."enum_products_display_location" AS ENUM('best-seller', 'combo', 'new-arrival');
  ALTER TABLE "products_display_location" ALTER COLUMN "value" SET DATA TYPE "public"."enum_products_display_location" USING "value"::"public"."enum_products_display_location";
  DROP INDEX "orders_voucher_id_idx";
  DROP INDEX "payload_locked_documents_rels_vouchers_id_idx";
  DROP INDEX "payload_locked_documents_rels_redirects_id_idx";
  ALTER TABLE "orders" DROP COLUMN "subtotal_amount";
  ALTER TABLE "orders" DROP COLUMN "discount_amount";
  ALTER TABLE "orders" DROP COLUMN "voucher_code";
  ALTER TABLE "orders" DROP COLUMN "voucher_id_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vouchers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "redirects_id";
  ALTER TABLE "site_settings" DROP COLUMN "flash_sale_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "flash_sale_end_time";
  DROP TYPE "public"."enum_vouchers_status";
  DROP TYPE "public"."enum_vouchers_type";
  DROP TYPE "public"."enum_redirects_type";`)
}
