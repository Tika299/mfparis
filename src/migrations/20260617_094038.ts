import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_voucher_redemptions_status" AS ENUM('held', 'completed', 'cancelled');
  ALTER TYPE "public"."enum_orders_status" ADD VALUE 'failed';
  ALTER TYPE "public"."enum_vouchers_status" ADD VALUE 'draft' BEFORE 'inactive';
  CREATE TABLE "fragrance_notes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"icon_id" integer NOT NULL,
  	"description" varchar,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"user_id" integer,
  	"rating" numeric NOT NULL,
  	"comment" varchar,
  	"status" "enum_reviews_status" DEFAULT 'pending' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "voucher_redemptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"voucher_id" integer NOT NULL,
  	"order_id" integer NOT NULL,
  	"customer_id" integer,
  	"email" varchar,
  	"discount_amount" numeric NOT NULL,
  	"status" "enum_voucher_redemptions_status" DEFAULT 'held' NOT NULL,
  	"held_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"cancelled_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"vouchers_id" integer
  );
  
  ALTER TABLE "site_settings_flash_sale_vouchers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_settings_flash_sale_vouchers" CASCADE;
  ALTER TABLE "vouchers" ALTER COLUMN "status" SET NOT NULL;
  ALTER TABLE "vouchers" ALTER COLUMN "max_discount_amount" SET DEFAULT 0;
  ALTER TABLE "vouchers" ALTER COLUMN "usage_limit" SET DEFAULT 0;
  ALTER TABLE "products" ADD COLUMN "fragrance_profile_longevity_score" numeric;
  ALTER TABLE "products" ADD COLUMN "fragrance_profile_sillage_score" numeric;
  ALTER TABLE "products" ADD COLUMN "average_rating" numeric DEFAULT 0;
  ALTER TABLE "products" ADD COLUMN "review_count" numeric DEFAULT 0;
  ALTER TABLE "products_rels" ADD COLUMN "fragrance_notes_id" integer;
  ALTER TABLE "vouchers" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;
  ALTER TABLE "vouchers" ADD COLUMN "usage_limit_per_customer" numeric DEFAULT 0;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "fragrance_notes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "reviews_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "voucher_redemptions_id" integer;
  ALTER TABLE "fragrance_notes" ADD CONSTRAINT "fragrance_notes_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_vouchers_fk" FOREIGN KEY ("vouchers_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "fragrance_notes_slug_idx" ON "fragrance_notes" USING btree ("slug");
  CREATE INDEX "fragrance_notes_icon_idx" ON "fragrance_notes" USING btree ("icon_id");
  CREATE INDEX "fragrance_notes_updated_at_idx" ON "fragrance_notes" USING btree ("updated_at");
  CREATE INDEX "fragrance_notes_created_at_idx" ON "fragrance_notes" USING btree ("created_at");
  CREATE INDEX "reviews_product_idx" ON "reviews" USING btree ("product_id");
  CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");
  CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX "voucher_redemptions_voucher_idx" ON "voucher_redemptions" USING btree ("voucher_id");
  CREATE INDEX "voucher_redemptions_order_idx" ON "voucher_redemptions" USING btree ("order_id");
  CREATE INDEX "voucher_redemptions_customer_idx" ON "voucher_redemptions" USING btree ("customer_id");
  CREATE INDEX "voucher_redemptions_email_idx" ON "voucher_redemptions" USING btree ("email");
  CREATE INDEX "voucher_redemptions_status_idx" ON "voucher_redemptions" USING btree ("status");
  CREATE INDEX "voucher_redemptions_held_at_idx" ON "voucher_redemptions" USING btree ("held_at");
  CREATE INDEX "voucher_redemptions_completed_at_idx" ON "voucher_redemptions" USING btree ("completed_at");
  CREATE INDEX "voucher_redemptions_cancelled_at_idx" ON "voucher_redemptions" USING btree ("cancelled_at");
  CREATE INDEX "voucher_redemptions_updated_at_idx" ON "voucher_redemptions" USING btree ("updated_at");
  CREATE INDEX "voucher_redemptions_created_at_idx" ON "voucher_redemptions" USING btree ("created_at");
  CREATE INDEX "site_settings_rels_order_idx" ON "site_settings_rels" USING btree ("order");
  CREATE INDEX "site_settings_rels_parent_idx" ON "site_settings_rels" USING btree ("parent_id");
  CREATE INDEX "site_settings_rels_path_idx" ON "site_settings_rels" USING btree ("path");
  CREATE INDEX "site_settings_rels_vouchers_id_idx" ON "site_settings_rels" USING btree ("vouchers_id");
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_fragrance_notes_fk" FOREIGN KEY ("fragrance_notes_id") REFERENCES "public"."fragrance_notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fragrance_notes_fk" FOREIGN KEY ("fragrance_notes_id") REFERENCES "public"."fragrance_notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_voucher_redemptions_fk" FOREIGN KEY ("voucher_redemptions_id") REFERENCES "public"."voucher_redemptions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_average_rating_idx" ON "products" USING btree ("average_rating");
  CREATE INDEX "products_review_count_idx" ON "products" USING btree ("review_count");
  CREATE INDEX "products_rels_fragrance_notes_id_idx" ON "products_rels" USING btree ("fragrance_notes_id");
  CREATE INDEX "vouchers_status_idx" ON "vouchers" USING btree ("status");
  CREATE INDEX "vouchers_is_public_idx" ON "vouchers" USING btree ("is_public");
  CREATE INDEX "vouchers_starts_at_idx" ON "vouchers" USING btree ("starts_at");
  CREATE INDEX "vouchers_ends_at_idx" ON "vouchers" USING btree ("ends_at");
  CREATE INDEX "vouchers_used_count_idx" ON "vouchers" USING btree ("used_count");
  CREATE INDEX "payload_locked_documents_rels_fragrance_notes_id_idx" ON "payload_locked_documents_rels" USING btree ("fragrance_notes_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_voucher_redemptions_id_idx" ON "payload_locked_documents_rels" USING btree ("voucher_redemptions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_flash_sale_vouchers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Voucher',
  	"value" varchar DEFAULT '15K',
  	"sub" varchar DEFAULT 'Đơn từ 799K'
  );
  
  ALTER TABLE "fragrance_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reviews" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "voucher_redemptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "fragrance_notes" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "voucher_redemptions" CASCADE;
  DROP TABLE "site_settings_rels" CASCADE;
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_fragrance_notes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_fragrance_notes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_reviews_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_voucher_redemptions_fk";
  
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_orders_status";
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'confirmed', 'shipping', 'completed', 'cancelled');
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_orders_status";
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."enum_orders_status" USING "status"::"public"."enum_orders_status";
  ALTER TABLE "vouchers" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "vouchers" ALTER COLUMN "status" SET DEFAULT 'active'::text;
  DROP TYPE "public"."enum_vouchers_status";
  CREATE TYPE "public"."enum_vouchers_status" AS ENUM('active', 'inactive');
  ALTER TABLE "vouchers" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."enum_vouchers_status";
  ALTER TABLE "vouchers" ALTER COLUMN "status" SET DATA TYPE "public"."enum_vouchers_status" USING "status"::"public"."enum_vouchers_status";
  DROP INDEX "products_average_rating_idx";
  DROP INDEX "products_review_count_idx";
  DROP INDEX "products_rels_fragrance_notes_id_idx";
  DROP INDEX "vouchers_status_idx";
  DROP INDEX "vouchers_is_public_idx";
  DROP INDEX "vouchers_starts_at_idx";
  DROP INDEX "vouchers_ends_at_idx";
  DROP INDEX "vouchers_used_count_idx";
  DROP INDEX "payload_locked_documents_rels_fragrance_notes_id_idx";
  DROP INDEX "payload_locked_documents_rels_reviews_id_idx";
  DROP INDEX "payload_locked_documents_rels_voucher_redemptions_id_idx";
  ALTER TABLE "vouchers" ALTER COLUMN "status" DROP NOT NULL;
  ALTER TABLE "vouchers" ALTER COLUMN "max_discount_amount" DROP DEFAULT;
  ALTER TABLE "vouchers" ALTER COLUMN "usage_limit" DROP DEFAULT;
  ALTER TABLE "site_settings_flash_sale_vouchers" ADD CONSTRAINT "site_settings_flash_sale_vouchers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_flash_sale_vouchers_order_idx" ON "site_settings_flash_sale_vouchers" USING btree ("_order");
  CREATE INDEX "site_settings_flash_sale_vouchers_parent_id_idx" ON "site_settings_flash_sale_vouchers" USING btree ("_parent_id");
  ALTER TABLE "products" DROP COLUMN "fragrance_profile_longevity_score";
  ALTER TABLE "products" DROP COLUMN "fragrance_profile_sillage_score";
  ALTER TABLE "products" DROP COLUMN "average_rating";
  ALTER TABLE "products" DROP COLUMN "review_count";
  ALTER TABLE "products_rels" DROP COLUMN "fragrance_notes_id";
  ALTER TABLE "vouchers" DROP COLUMN "is_public";
  ALTER TABLE "vouchers" DROP COLUMN "usage_limit_per_customer";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "fragrance_notes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "reviews_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "voucher_redemptions_id";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_voucher_redemptions_status";`)
}
