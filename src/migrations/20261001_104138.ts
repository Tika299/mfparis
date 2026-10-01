import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_brands_inbound_internal_links_scope" AS ENUM('posts', 'products', 'categories', 'brands', 'post-categories');
  ALTER TYPE "public"."enum_internal_link_rules_managed_by" ADD VALUE 'brand';
  CREATE TABLE "brands_inbound_internal_links_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  CREATE TABLE "brands_inbound_internal_links_scope" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_brands_inbound_internal_links_scope",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "brands" ADD COLUMN "inbound_internal_links_enabled" boolean DEFAULT false;
  ALTER TABLE "brands" ADD COLUMN "inbound_internal_links_max_insertions_per_page" numeric DEFAULT 1;
  ALTER TABLE "brands_inbound_internal_links_keywords" ADD CONSTRAINT "brands_inbound_internal_links_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands_inbound_internal_links_scope" ADD CONSTRAINT "brands_inbound_internal_links_scope_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "brands_inbound_internal_links_keywords_order_idx" ON "brands_inbound_internal_links_keywords" USING btree ("_order");
  CREATE INDEX "brands_inbound_internal_links_keywords_parent_id_idx" ON "brands_inbound_internal_links_keywords" USING btree ("_parent_id");
  CREATE INDEX "brands_inbound_internal_links_scope_order_idx" ON "brands_inbound_internal_links_scope" USING btree ("order");
  CREATE INDEX "brands_inbound_internal_links_scope_parent_idx" ON "brands_inbound_internal_links_scope" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "brands_inbound_internal_links_keywords" CASCADE;
  DROP TABLE "brands_inbound_internal_links_scope" CASCADE;
  ALTER TABLE "internal_link_rules" ALTER COLUMN "managed_by" SET DATA TYPE text;
  DROP TYPE "public"."enum_internal_link_rules_managed_by";
  CREATE TYPE "public"."enum_internal_link_rules_managed_by" AS ENUM('manual', 'product');
  ALTER TABLE "internal_link_rules" ALTER COLUMN "managed_by" SET DATA TYPE "public"."enum_internal_link_rules_managed_by" USING "managed_by"::"public"."enum_internal_link_rules_managed_by";
  ALTER TABLE "brands" DROP COLUMN "inbound_internal_links_enabled";
  ALTER TABLE "brands" DROP COLUMN "inbound_internal_links_max_insertions_per_page";
  DROP TYPE "public"."enum_brands_inbound_internal_links_scope";`)
}
