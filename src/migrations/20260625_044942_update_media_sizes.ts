import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_sizes_large_sizes_large_filename_idx";
  ALTER TABLE "media" ADD COLUMN "sizes_hero_mobile_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_mobile_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_mobile_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_mobile_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_mobile_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_mobile_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_tablet_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_tablet_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_tablet_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_tablet_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_tablet_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_tablet_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_desktop_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_desktop_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_desktop_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_desktop_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_desktop_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_desktop_filename" varchar;
  CREATE INDEX "media_sizes_hero_mobile_sizes_hero_mobile_filename_idx" ON "media" USING btree ("sizes_hero_mobile_filename");
  CREATE INDEX "media_sizes_hero_tablet_sizes_hero_tablet_filename_idx" ON "media" USING btree ("sizes_hero_tablet_filename");
  CREATE INDEX "media_sizes_hero_desktop_sizes_hero_desktop_filename_idx" ON "media" USING btree ("sizes_hero_desktop_filename");
  CREATE INDEX "products_display_location_value_idx" ON "products_display_location" USING btree ("value");
  CREATE INDEX "products_price_price_base_price_idx" ON "products" USING btree ("price_base_price");
  CREATE INDEX "products_status_idx" ON "products" USING btree ("status");
  CREATE INDEX "orders_payment_method_idx" ON "orders" USING btree ("payment_method");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_voucher_code_idx" ON "orders" USING btree ("voucher_code");
  ALTER TABLE "media" DROP COLUMN "sizes_large_url";
  ALTER TABLE "media" DROP COLUMN "sizes_large_width";
  ALTER TABLE "media" DROP COLUMN "sizes_large_height";
  ALTER TABLE "media" DROP COLUMN "sizes_large_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_large_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_large_filename";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_sizes_hero_mobile_sizes_hero_mobile_filename_idx";
  DROP INDEX "media_sizes_hero_tablet_sizes_hero_tablet_filename_idx";
  DROP INDEX "media_sizes_hero_desktop_sizes_hero_desktop_filename_idx";
  DROP INDEX "products_display_location_value_idx";
  DROP INDEX "products_price_price_base_price_idx";
  DROP INDEX "products_status_idx";
  DROP INDEX "orders_payment_method_idx";
  DROP INDEX "orders_status_idx";
  DROP INDEX "orders_voucher_code_idx";
  ALTER TABLE "media" ADD COLUMN "sizes_large_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_large_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_large_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_large_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_large_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_large_filename" varchar;
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  ALTER TABLE "media" DROP COLUMN "sizes_hero_mobile_url";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_mobile_width";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_mobile_height";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_mobile_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_mobile_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_mobile_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_tablet_url";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_tablet_width";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_tablet_height";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_tablet_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_tablet_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_tablet_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_desktop_url";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_desktop_width";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_desktop_height";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_desktop_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_desktop_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_desktop_filename";`)
}
