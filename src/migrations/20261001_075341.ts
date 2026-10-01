import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_inbound_internal_links_scope" AS ENUM('posts', 'products', 'categories', 'brands', 'post-categories');
  CREATE TYPE "public"."enum_internal_link_rules_managed_by" AS ENUM('manual', 'product');
  CREATE TABLE "products_inbound_internal_links_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  CREATE TABLE "products_inbound_internal_links_scope" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_inbound_internal_links_scope",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "internal_link_rules_keywords" ALTER COLUMN "match_type" SET DEFAULT 'phrase';
  ALTER TABLE "products" ADD COLUMN "inbound_internal_links_enabled" boolean DEFAULT false;
  ALTER TABLE "products" ADD COLUMN "inbound_internal_links_max_insertions_per_page" numeric DEFAULT 1;
  ALTER TABLE "internal_link_rules" ADD COLUMN "managed_by" "enum_internal_link_rules_managed_by";
  ALTER TABLE "internal_link_rules" ADD COLUMN "managed_key" varchar;
  ALTER TABLE "internal_link_rules" ADD COLUMN "managed_source_id" varchar;
  ALTER TABLE "products_inbound_internal_links_keywords" ADD CONSTRAINT "products_inbound_internal_links_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_inbound_internal_links_scope" ADD CONSTRAINT "products_inbound_internal_links_scope_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_inbound_internal_links_keywords_order_idx" ON "products_inbound_internal_links_keywords" USING btree ("_order");
  CREATE INDEX "products_inbound_internal_links_keywords_parent_id_idx" ON "products_inbound_internal_links_keywords" USING btree ("_parent_id");
  CREATE INDEX "products_inbound_internal_links_scope_order_idx" ON "products_inbound_internal_links_scope" USING btree ("order");
  CREATE INDEX "products_inbound_internal_links_scope_parent_idx" ON "products_inbound_internal_links_scope" USING btree ("parent_id");
  CREATE UNIQUE INDEX "internal_link_rules_managed_key_idx" ON "internal_link_rules" USING btree ("managed_key");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_inbound_internal_links_keywords" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_inbound_internal_links_scope" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_inbound_internal_links_keywords" CASCADE;
  DROP TABLE "products_inbound_internal_links_scope" CASCADE;
  DROP INDEX "internal_link_rules_managed_key_idx";
  ALTER TABLE "internal_link_rules_keywords" ALTER COLUMN "match_type" SET DEFAULT 'contains';
  ALTER TABLE "products" DROP COLUMN "inbound_internal_links_enabled";
  ALTER TABLE "products" DROP COLUMN "inbound_internal_links_max_insertions_per_page";
  ALTER TABLE "internal_link_rules" DROP COLUMN "managed_by";
  ALTER TABLE "internal_link_rules" DROP COLUMN "managed_key";
  ALTER TABLE "internal_link_rules" DROP COLUMN "managed_source_id";
  DROP TYPE "public"."enum_products_inbound_internal_links_scope";
  DROP TYPE "public"."enum_internal_link_rules_managed_by";`)
}
