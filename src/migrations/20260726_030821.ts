import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_header_nav_items_mega_groups_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_header_nav_items_mega_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_about_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link" varchar NOT NULL
  );
  
  ALTER TABLE "site_settings_header_nav_items_mega_groups_links" ADD CONSTRAINT "site_settings_header_nav_items_mega_groups_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_header_nav_items_mega_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_header_nav_items_mega_groups" ADD CONSTRAINT "site_settings_header_nav_items_mega_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_header_nav_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_about_links" ADD CONSTRAINT "site_settings_footer_about_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_header_nav_items_mega_groups_links_order_idx" ON "site_settings_header_nav_items_mega_groups_links" USING btree ("_order");
  CREATE INDEX "site_settings_header_nav_items_mega_groups_links_parent_id_idx" ON "site_settings_header_nav_items_mega_groups_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_header_nav_items_mega_groups_order_idx" ON "site_settings_header_nav_items_mega_groups" USING btree ("_order");
  CREATE INDEX "site_settings_header_nav_items_mega_groups_parent_id_idx" ON "site_settings_header_nav_items_mega_groups" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_about_links_order_idx" ON "site_settings_footer_about_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_about_links_parent_id_idx" ON "site_settings_footer_about_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_header_nav_items_mega_groups_links" CASCADE;
  DROP TABLE "site_settings_header_nav_items_mega_groups" CASCADE;
  DROP TABLE "site_settings_footer_about_links" CASCADE;`)
}
