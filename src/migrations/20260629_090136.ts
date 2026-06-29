import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_footer_social_icon" AS ENUM('facebook', 'instagram', 'youtube', 'tiktok', 'zalo');
  CREATE TABLE "site_settings_footer_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_site_settings_footer_social_icon" NOT NULL,
  	"name" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_policy_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link" varchar NOT NULL
  );
  
  ALTER TABLE "orders" ADD COLUMN "shipping_fee" numeric DEFAULT 0;
  ALTER TABLE "site_settings" ADD COLUMN "contact_email" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "contact_zalo" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_description" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_working_hours" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_chat_url" varchar;
  ALTER TABLE "site_settings_footer_social" ADD CONSTRAINT "site_settings_footer_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_policy_links" ADD CONSTRAINT "site_settings_footer_policy_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_footer_social_order_idx" ON "site_settings_footer_social" USING btree ("_order");
  CREATE INDEX "site_settings_footer_social_parent_id_idx" ON "site_settings_footer_social" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_policy_links_order_idx" ON "site_settings_footer_policy_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_policy_links_parent_id_idx" ON "site_settings_footer_policy_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_footer_social" CASCADE;
  DROP TABLE "site_settings_footer_policy_links" CASCADE;
  ALTER TABLE "orders" DROP COLUMN "shipping_fee";
  ALTER TABLE "site_settings" DROP COLUMN "contact_email";
  ALTER TABLE "site_settings" DROP COLUMN "contact_zalo";
  ALTER TABLE "site_settings" DROP COLUMN "footer_description";
  ALTER TABLE "site_settings" DROP COLUMN "footer_working_hours";
  ALTER TABLE "site_settings" DROP COLUMN "footer_chat_url";
  DROP TYPE "public"."enum_site_settings_footer_social_icon";`)
}
