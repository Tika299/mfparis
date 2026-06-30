import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_delivery_method" AS ENUM('home_delivery', 'store_pickup');
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded');
  ALTER TABLE "orders" ADD COLUMN "delivery_method" "enum_orders_delivery_method" DEFAULT 'home_delivery';
  ALTER TABLE "orders" ADD COLUMN "payment_status" "enum_orders_payment_status" DEFAULT 'unpaid';
  ALTER TABLE "site_settings" ADD COLUMN "payment_bank_name" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "payment_bank_account_name" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "payment_bank_account_number" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "payment_bank_branch" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "payment_bank_qr_image_id" integer;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_payment_bank_qr_image_id_media_id_fk" FOREIGN KEY ("payment_bank_qr_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "orders_delivery_method_idx" ON "orders" USING btree ("delivery_method");
  CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");
  CREATE INDEX "site_settings_payment_payment_bank_qr_image_idx" ON "site_settings" USING btree ("payment_bank_qr_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_payment_bank_qr_image_id_media_id_fk";
  
  DROP INDEX "orders_delivery_method_idx";
  DROP INDEX "orders_payment_status_idx";
  DROP INDEX "site_settings_payment_payment_bank_qr_image_idx";
  ALTER TABLE "orders" DROP COLUMN "delivery_method";
  ALTER TABLE "orders" DROP COLUMN "payment_status";
  ALTER TABLE "site_settings" DROP COLUMN "payment_bank_name";
  ALTER TABLE "site_settings" DROP COLUMN "payment_bank_account_name";
  ALTER TABLE "site_settings" DROP COLUMN "payment_bank_account_number";
  ALTER TABLE "site_settings" DROP COLUMN "payment_bank_branch";
  ALTER TABLE "site_settings" DROP COLUMN "payment_bank_qr_image_id";
  DROP TYPE "public"."enum_orders_delivery_method";
  DROP TYPE "public"."enum_orders_payment_status";`)
}
