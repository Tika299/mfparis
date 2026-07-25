import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "brands_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "brands_indexable_facets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"meta_title" varchar,
  	"meta_description" varchar
  );
  
  CREATE TABLE "brands_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "categories_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "categories_indexable_facets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"meta_title" varchar,
  	"meta_description" varchar
  );
  
  CREATE TABLE "categories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "post_categories_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "post_categories_internal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "post_categories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer
  );
  
  ALTER TABLE "brands" ADD COLUMN "h1_override" varchar;
  ALTER TABLE "brands" ADD COLUMN "intro_html" varchar;
  ALTER TABLE "brands" ADD COLUMN "bottom_content_html" varchar;
  ALTER TABLE "brands" ADD COLUMN "noindex_when_empty" boolean DEFAULT true;
  ALTER TABLE "brands" ADD COLUMN "canonical_to_parent" boolean DEFAULT false;
  ALTER TABLE "brands" ADD COLUMN "thumbnail_id" integer;
  ALTER TABLE "brands" ADD COLUMN "og_image_id" integer;
  ALTER TABLE "categories" ADD COLUMN "h1_override" varchar;
  ALTER TABLE "categories" ADD COLUMN "intro_html" varchar;
  ALTER TABLE "categories" ADD COLUMN "bottom_content_html" varchar;
  ALTER TABLE "categories" ADD COLUMN "noindex_when_empty" boolean DEFAULT true;
  ALTER TABLE "categories" ADD COLUMN "canonical_to_parent" boolean DEFAULT false;
  ALTER TABLE "categories" ADD COLUMN "thumbnail_id" integer;
  ALTER TABLE "categories" ADD COLUMN "og_image_id" integer;
  ALTER TABLE "post_categories" ADD COLUMN "h1_override" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "intro_html" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "bottom_content_html" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "noindex_when_empty" boolean DEFAULT true;
  ALTER TABLE "post_categories" ADD COLUMN "thumbnail_id" integer;
  ALTER TABLE "post_categories" ADD COLUMN "og_image_id" integer;
  ALTER TABLE "brands_faq" ADD CONSTRAINT "brands_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands_indexable_facets" ADD CONSTRAINT "brands_indexable_facets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands_rels" ADD CONSTRAINT "brands_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands_rels" ADD CONSTRAINT "brands_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_faq" ADD CONSTRAINT "categories_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_indexable_facets" ADD CONSTRAINT "categories_indexable_facets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_categories_faq" ADD CONSTRAINT "post_categories_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_categories_internal_links" ADD CONSTRAINT "post_categories_internal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_categories_rels" ADD CONSTRAINT "post_categories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_categories_rels" ADD CONSTRAINT "post_categories_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "brands_faq_order_idx" ON "brands_faq" USING btree ("_order");
  CREATE INDEX "brands_faq_parent_id_idx" ON "brands_faq" USING btree ("_parent_id");
  CREATE INDEX "brands_indexable_facets_order_idx" ON "brands_indexable_facets" USING btree ("_order");
  CREATE INDEX "brands_indexable_facets_parent_id_idx" ON "brands_indexable_facets" USING btree ("_parent_id");
  CREATE INDEX "brands_rels_order_idx" ON "brands_rels" USING btree ("order");
  CREATE INDEX "brands_rels_parent_idx" ON "brands_rels" USING btree ("parent_id");
  CREATE INDEX "brands_rels_path_idx" ON "brands_rels" USING btree ("path");
  CREATE INDEX "brands_rels_products_id_idx" ON "brands_rels" USING btree ("products_id");
  CREATE INDEX "categories_faq_order_idx" ON "categories_faq" USING btree ("_order");
  CREATE INDEX "categories_faq_parent_id_idx" ON "categories_faq" USING btree ("_parent_id");
  CREATE INDEX "categories_indexable_facets_order_idx" ON "categories_indexable_facets" USING btree ("_order");
  CREATE INDEX "categories_indexable_facets_parent_id_idx" ON "categories_indexable_facets" USING btree ("_parent_id");
  CREATE INDEX "categories_rels_order_idx" ON "categories_rels" USING btree ("order");
  CREATE INDEX "categories_rels_parent_idx" ON "categories_rels" USING btree ("parent_id");
  CREATE INDEX "categories_rels_path_idx" ON "categories_rels" USING btree ("path");
  CREATE INDEX "categories_rels_products_id_idx" ON "categories_rels" USING btree ("products_id");
  CREATE INDEX "post_categories_faq_order_idx" ON "post_categories_faq" USING btree ("_order");
  CREATE INDEX "post_categories_faq_parent_id_idx" ON "post_categories_faq" USING btree ("_parent_id");
  CREATE INDEX "post_categories_internal_links_order_idx" ON "post_categories_internal_links" USING btree ("_order");
  CREATE INDEX "post_categories_internal_links_parent_id_idx" ON "post_categories_internal_links" USING btree ("_parent_id");
  CREATE INDEX "post_categories_rels_order_idx" ON "post_categories_rels" USING btree ("order");
  CREATE INDEX "post_categories_rels_parent_idx" ON "post_categories_rels" USING btree ("parent_id");
  CREATE INDEX "post_categories_rels_path_idx" ON "post_categories_rels" USING btree ("path");
  CREATE INDEX "post_categories_rels_posts_id_idx" ON "post_categories_rels" USING btree ("posts_id");
  ALTER TABLE "brands" ADD CONSTRAINT "brands_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "brands_thumbnail_idx" ON "brands" USING btree ("thumbnail_id");
  CREATE INDEX "brands_og_image_idx" ON "brands" USING btree ("og_image_id");
  CREATE INDEX "categories_thumbnail_idx" ON "categories" USING btree ("thumbnail_id");
  CREATE INDEX "categories_og_image_idx" ON "categories" USING btree ("og_image_id");
  CREATE INDEX "post_categories_thumbnail_idx" ON "post_categories" USING btree ("thumbnail_id");
  CREATE INDEX "post_categories_og_image_idx" ON "post_categories" USING btree ("og_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "brands_indexable_facets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "brands_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_indexable_facets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_categories_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_categories_internal_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_categories_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "brands_faq" CASCADE;
  DROP TABLE "brands_indexable_facets" CASCADE;
  DROP TABLE "brands_rels" CASCADE;
  DROP TABLE "categories_faq" CASCADE;
  DROP TABLE "categories_indexable_facets" CASCADE;
  DROP TABLE "categories_rels" CASCADE;
  DROP TABLE "post_categories_faq" CASCADE;
  DROP TABLE "post_categories_internal_links" CASCADE;
  DROP TABLE "post_categories_rels" CASCADE;
  ALTER TABLE "brands" DROP CONSTRAINT "brands_thumbnail_id_media_id_fk";
  
  ALTER TABLE "brands" DROP CONSTRAINT "brands_og_image_id_media_id_fk";
  
  ALTER TABLE "categories" DROP CONSTRAINT "categories_thumbnail_id_media_id_fk";
  
  ALTER TABLE "categories" DROP CONSTRAINT "categories_og_image_id_media_id_fk";
  
  ALTER TABLE "post_categories" DROP CONSTRAINT "post_categories_thumbnail_id_media_id_fk";
  
  ALTER TABLE "post_categories" DROP CONSTRAINT "post_categories_og_image_id_media_id_fk";
  
  DROP INDEX "brands_thumbnail_idx";
  DROP INDEX "brands_og_image_idx";
  DROP INDEX "categories_thumbnail_idx";
  DROP INDEX "categories_og_image_idx";
  DROP INDEX "post_categories_thumbnail_idx";
  DROP INDEX "post_categories_og_image_idx";
  ALTER TABLE "brands" DROP COLUMN "h1_override";
  ALTER TABLE "brands" DROP COLUMN "intro_html";
  ALTER TABLE "brands" DROP COLUMN "bottom_content_html";
  ALTER TABLE "brands" DROP COLUMN "noindex_when_empty";
  ALTER TABLE "brands" DROP COLUMN "canonical_to_parent";
  ALTER TABLE "brands" DROP COLUMN "thumbnail_id";
  ALTER TABLE "brands" DROP COLUMN "og_image_id";
  ALTER TABLE "categories" DROP COLUMN "h1_override";
  ALTER TABLE "categories" DROP COLUMN "intro_html";
  ALTER TABLE "categories" DROP COLUMN "bottom_content_html";
  ALTER TABLE "categories" DROP COLUMN "noindex_when_empty";
  ALTER TABLE "categories" DROP COLUMN "canonical_to_parent";
  ALTER TABLE "categories" DROP COLUMN "thumbnail_id";
  ALTER TABLE "categories" DROP COLUMN "og_image_id";
  ALTER TABLE "post_categories" DROP COLUMN "h1_override";
  ALTER TABLE "post_categories" DROP COLUMN "intro_html";
  ALTER TABLE "post_categories" DROP COLUMN "bottom_content_html";
  ALTER TABLE "post_categories" DROP COLUMN "noindex_when_empty";
  ALTER TABLE "post_categories" DROP COLUMN "thumbnail_id";
  ALTER TABLE "post_categories" DROP COLUMN "og_image_id";`)
}
