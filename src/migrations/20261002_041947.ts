import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_categories_inbound_internal_links_scope" AS ENUM('posts', 'products', 'categories', 'brands', 'post-categories');
  CREATE TABLE "categories_inbound_internal_links_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  CREATE TABLE "categories_inbound_internal_links_scope" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_categories_inbound_internal_links_scope",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "categories" ADD COLUMN "inbound_internal_links_enabled" boolean DEFAULT false;
  ALTER TABLE "categories" ADD COLUMN "inbound_internal_links_max_insertions_per_page" numeric DEFAULT 1;
  ALTER TABLE "categories_inbound_internal_links_keywords" ADD CONSTRAINT "categories_inbound_internal_links_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_inbound_internal_links_scope" ADD CONSTRAINT "categories_inbound_internal_links_scope_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "categories_inbound_internal_links_keywords_order_idx" ON "categories_inbound_internal_links_keywords" USING btree ("_order");
  CREATE INDEX "categories_inbound_internal_links_keywords_parent_id_idx" ON "categories_inbound_internal_links_keywords" USING btree ("_parent_id");
  CREATE INDEX "categories_inbound_internal_links_scope_order_idx" ON "categories_inbound_internal_links_scope" USING btree ("order");
  CREATE INDEX "categories_inbound_internal_links_scope_parent_idx" ON "categories_inbound_internal_links_scope" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "categories_inbound_internal_links_keywords" CASCADE;
  DROP TABLE "categories_inbound_internal_links_scope" CASCADE;
  ALTER TABLE "categories" DROP COLUMN "inbound_internal_links_enabled";
  ALTER TABLE "categories" DROP COLUMN "inbound_internal_links_max_insertions_per_page";
  DROP TYPE "public"."enum_categories_inbound_internal_links_scope";`)
}
