import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_internal_link_rules_keywords_match_type" AS ENUM('contains', 'phrase');
  CREATE TYPE "public"."enum_internal_link_rules_scope" AS ENUM('posts', 'products', 'categories', 'brands', 'post-categories');
  CREATE TYPE "public"."enum_internal_link_rules_priority" AS ENUM('primary_keyword', 'category', 'brand', 'product', 'post');
  CREATE TYPE "public"."enum_internal_link_rules_target_type" AS ENUM('custom_url', 'product', 'category', 'brand', 'post', 'post_category');
  CREATE TABLE "brands_internal_linking_exclude_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  CREATE TABLE "products_internal_linking_exclude_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  CREATE TABLE "categories_internal_linking_exclude_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  CREATE TABLE "posts_internal_linking_exclude_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  CREATE TABLE "post_categories_internal_linking_exclude_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  CREATE TABLE "internal_link_rules_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL,
  	"match_type" "enum_internal_link_rules_keywords_match_type" DEFAULT 'contains',
  	"weight" numeric DEFAULT 1
  );
  
  CREATE TABLE "internal_link_rules_scope" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_internal_link_rules_scope",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "internal_link_rules" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"priority" "enum_internal_link_rules_priority" DEFAULT 'primary_keyword' NOT NULL,
  	"target_type" "enum_internal_link_rules_target_type" DEFAULT 'custom_url' NOT NULL,
  	"target_url" varchar NOT NULL,
  	"max_insertions_per_page" numeric DEFAULT 1,
  	"total_insertions" numeric DEFAULT 0,
  	"last_used_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "brands" ADD COLUMN "internal_linking_disable_auto_links" boolean DEFAULT false;
  ALTER TABLE "brands" ADD COLUMN "internal_linking_max_links_override" numeric;
  ALTER TABLE "products" ADD COLUMN "internal_linking_disable_auto_links" boolean DEFAULT false;
  ALTER TABLE "products" ADD COLUMN "internal_linking_max_links_override" numeric;
  ALTER TABLE "categories" ADD COLUMN "internal_linking_disable_auto_links" boolean DEFAULT false;
  ALTER TABLE "categories" ADD COLUMN "internal_linking_max_links_override" numeric;
  ALTER TABLE "posts" ADD COLUMN "internal_linking_disable_auto_links" boolean DEFAULT false;
  ALTER TABLE "posts" ADD COLUMN "internal_linking_max_links_override" numeric;
  ALTER TABLE "post_categories" ADD COLUMN "internal_linking_disable_auto_links" boolean DEFAULT false;
  ALTER TABLE "post_categories" ADD COLUMN "internal_linking_max_links_override" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "internal_link_rules_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "internal_linking_enabled" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "internal_linking_preview_only" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "internal_linking_max_links_per_post" numeric DEFAULT 8;
  ALTER TABLE "site_settings" ADD COLUMN "internal_linking_max_links_per_product" numeric DEFAULT 5;
  ALTER TABLE "site_settings" ADD COLUMN "internal_linking_max_links_per_landing" numeric DEFAULT 8;
  ALTER TABLE "site_settings" ADD COLUMN "internal_linking_max_links_per_paragraph" numeric DEFAULT 1;
  ALTER TABLE "site_settings" ADD COLUMN "internal_linking_max_same_target_url" numeric DEFAULT 2;
  ALTER TABLE "site_settings" ADD COLUMN "internal_linking_max_same_anchor" numeric DEFAULT 1;
  ALTER TABLE "brands_internal_linking_exclude_keywords" ADD CONSTRAINT "brands_internal_linking_exclude_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_internal_linking_exclude_keywords" ADD CONSTRAINT "products_internal_linking_exclude_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_internal_linking_exclude_keywords" ADD CONSTRAINT "categories_internal_linking_exclude_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_internal_linking_exclude_keywords" ADD CONSTRAINT "posts_internal_linking_exclude_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_categories_internal_linking_exclude_keywords" ADD CONSTRAINT "post_categories_internal_linking_exclude_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "internal_link_rules_keywords" ADD CONSTRAINT "internal_link_rules_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."internal_link_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "internal_link_rules_scope" ADD CONSTRAINT "internal_link_rules_scope_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."internal_link_rules"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "brands_internal_linking_exclude_keywords_order_idx" ON "brands_internal_linking_exclude_keywords" USING btree ("_order");
  CREATE INDEX "brands_internal_linking_exclude_keywords_parent_id_idx" ON "brands_internal_linking_exclude_keywords" USING btree ("_parent_id");
  CREATE INDEX "products_internal_linking_exclude_keywords_order_idx" ON "products_internal_linking_exclude_keywords" USING btree ("_order");
  CREATE INDEX "products_internal_linking_exclude_keywords_parent_id_idx" ON "products_internal_linking_exclude_keywords" USING btree ("_parent_id");
  CREATE INDEX "categories_internal_linking_exclude_keywords_order_idx" ON "categories_internal_linking_exclude_keywords" USING btree ("_order");
  CREATE INDEX "categories_internal_linking_exclude_keywords_parent_id_idx" ON "categories_internal_linking_exclude_keywords" USING btree ("_parent_id");
  CREATE INDEX "posts_internal_linking_exclude_keywords_order_idx" ON "posts_internal_linking_exclude_keywords" USING btree ("_order");
  CREATE INDEX "posts_internal_linking_exclude_keywords_parent_id_idx" ON "posts_internal_linking_exclude_keywords" USING btree ("_parent_id");
  CREATE INDEX "post_categories_internal_linking_exclude_keywords_order_idx" ON "post_categories_internal_linking_exclude_keywords" USING btree ("_order");
  CREATE INDEX "post_categories_internal_linking_exclude_keywords_parent_id_idx" ON "post_categories_internal_linking_exclude_keywords" USING btree ("_parent_id");
  CREATE INDEX "internal_link_rules_keywords_order_idx" ON "internal_link_rules_keywords" USING btree ("_order");
  CREATE INDEX "internal_link_rules_keywords_parent_id_idx" ON "internal_link_rules_keywords" USING btree ("_parent_id");
  CREATE INDEX "internal_link_rules_scope_order_idx" ON "internal_link_rules_scope" USING btree ("order");
  CREATE INDEX "internal_link_rules_scope_parent_idx" ON "internal_link_rules_scope" USING btree ("parent_id");
  CREATE INDEX "internal_link_rules_enabled_idx" ON "internal_link_rules" USING btree ("enabled");
  CREATE INDEX "internal_link_rules_updated_at_idx" ON "internal_link_rules" USING btree ("updated_at");
  CREATE INDEX "internal_link_rules_created_at_idx" ON "internal_link_rules" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_internal_link_rules_fk" FOREIGN KEY ("internal_link_rules_id") REFERENCES "public"."internal_link_rules"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_internal_link_rules_id_idx" ON "payload_locked_documents_rels" USING btree ("internal_link_rules_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands_internal_linking_exclude_keywords" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_internal_linking_exclude_keywords" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_internal_linking_exclude_keywords" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_internal_linking_exclude_keywords" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_categories_internal_linking_exclude_keywords" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "internal_link_rules_keywords" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "internal_link_rules_scope" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "internal_link_rules" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "brands_internal_linking_exclude_keywords" CASCADE;
  DROP TABLE "products_internal_linking_exclude_keywords" CASCADE;
  DROP TABLE "categories_internal_linking_exclude_keywords" CASCADE;
  DROP TABLE "posts_internal_linking_exclude_keywords" CASCADE;
  DROP TABLE "post_categories_internal_linking_exclude_keywords" CASCADE;
  DROP TABLE "internal_link_rules_keywords" CASCADE;
  DROP TABLE "internal_link_rules_scope" CASCADE;
  DROP TABLE "internal_link_rules" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_internal_link_rules_fk";
  
  DROP INDEX "payload_locked_documents_rels_internal_link_rules_id_idx";
  ALTER TABLE "brands" DROP COLUMN "internal_linking_disable_auto_links";
  ALTER TABLE "brands" DROP COLUMN "internal_linking_max_links_override";
  ALTER TABLE "products" DROP COLUMN "internal_linking_disable_auto_links";
  ALTER TABLE "products" DROP COLUMN "internal_linking_max_links_override";
  ALTER TABLE "categories" DROP COLUMN "internal_linking_disable_auto_links";
  ALTER TABLE "categories" DROP COLUMN "internal_linking_max_links_override";
  ALTER TABLE "posts" DROP COLUMN "internal_linking_disable_auto_links";
  ALTER TABLE "posts" DROP COLUMN "internal_linking_max_links_override";
  ALTER TABLE "post_categories" DROP COLUMN "internal_linking_disable_auto_links";
  ALTER TABLE "post_categories" DROP COLUMN "internal_linking_max_links_override";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "internal_link_rules_id";
  ALTER TABLE "site_settings" DROP COLUMN "internal_linking_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "internal_linking_preview_only";
  ALTER TABLE "site_settings" DROP COLUMN "internal_linking_max_links_per_post";
  ALTER TABLE "site_settings" DROP COLUMN "internal_linking_max_links_per_product";
  ALTER TABLE "site_settings" DROP COLUMN "internal_linking_max_links_per_landing";
  ALTER TABLE "site_settings" DROP COLUMN "internal_linking_max_links_per_paragraph";
  ALTER TABLE "site_settings" DROP COLUMN "internal_linking_max_same_target_url";
  ALTER TABLE "site_settings" DROP COLUMN "internal_linking_max_same_anchor";
  DROP TYPE "public"."enum_internal_link_rules_keywords_match_type";
  DROP TYPE "public"."enum_internal_link_rules_scope";
  DROP TYPE "public"."enum_internal_link_rules_priority";
  DROP TYPE "public"."enum_internal_link_rules_target_type";`)
}
