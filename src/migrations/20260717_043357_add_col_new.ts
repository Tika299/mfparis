import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "posts_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "posts_seo_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  ALTER TABLE "about_page" ALTER COLUMN "story_video_title" SET DEFAULT 'Video giới thiệu Marais de France';
  ALTER TABLE "posts" ADD COLUMN "author_name" varchar DEFAULT 'Marais de France';
  ALTER TABLE "posts" ADD COLUMN "author_title" varchar DEFAULT 'MF Paris Editorial';
  ALTER TABLE "posts" ADD COLUMN "author_avatar_id" integer;
  ALTER TABLE "posts" ADD COLUMN "author_url" varchar DEFAULT '/author/mfparis/';
  ALTER TABLE "posts" ADD COLUMN "author_bio" varchar DEFAULT 'Marais de France là đội ngũ yêu thích hương thơm, chia sẻ kinh nghiệm đánh giá nước hoa và mỹ phẩm nhằm giúp khách hàng lựa chọn sản phẩm phù hợp.';
  ALTER TABLE "posts" ADD COLUMN "reviewer_name" varchar DEFAULT 'Marais de France';
  ALTER TABLE "posts" ADD COLUMN "reviewer_title" varchar DEFAULT 'Content Reviewer';
  ALTER TABLE "posts" ADD COLUMN "reviewer_url" varchar DEFAULT '/about';
  ALTER TABLE "posts" ADD COLUMN "reviewer_reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "posts" ADD COLUMN "view_count" numeric DEFAULT 0;
  ALTER TABLE "posts" ADD COLUMN "rating_average" numeric DEFAULT 0;
  ALTER TABLE "posts" ADD COLUMN "rating_count" numeric DEFAULT 0;
  ALTER TABLE "posts" ADD COLUMN "rating_total" numeric DEFAULT 0;
  ALTER TABLE "products_faq" ADD CONSTRAINT "products_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_faq" ADD CONSTRAINT "posts_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_seo_keywords" ADD CONSTRAINT "posts_seo_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_faq_order_idx" ON "products_faq" USING btree ("_order");
  CREATE INDEX "products_faq_parent_id_idx" ON "products_faq" USING btree ("_parent_id");
  CREATE INDEX "posts_faq_order_idx" ON "posts_faq" USING btree ("_order");
  CREATE INDEX "posts_faq_parent_id_idx" ON "posts_faq" USING btree ("_parent_id");
  CREATE INDEX "posts_seo_keywords_order_idx" ON "posts_seo_keywords" USING btree ("_order");
  CREATE INDEX "posts_seo_keywords_parent_id_idx" ON "posts_seo_keywords" USING btree ("_parent_id");
  ALTER TABLE "posts" ADD CONSTRAINT "posts_author_avatar_id_media_id_fk" FOREIGN KEY ("author_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_author_author_avatar_idx" ON "posts" USING btree ("author_avatar_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_seo_keywords" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_faq" CASCADE;
  DROP TABLE "posts_faq" CASCADE;
  DROP TABLE "posts_seo_keywords" CASCADE;
  ALTER TABLE "posts" DROP CONSTRAINT "posts_author_avatar_id_media_id_fk";
  
  DROP INDEX "posts_author_author_avatar_idx";
  ALTER TABLE "about_page" ALTER COLUMN "story_video_title" SET DEFAULT 'Video gioi thieu Marais de France';
  ALTER TABLE "posts" DROP COLUMN "author_name";
  ALTER TABLE "posts" DROP COLUMN "author_title";
  ALTER TABLE "posts" DROP COLUMN "author_avatar_id";
  ALTER TABLE "posts" DROP COLUMN "author_url";
  ALTER TABLE "posts" DROP COLUMN "author_bio";
  ALTER TABLE "posts" DROP COLUMN "reviewer_name";
  ALTER TABLE "posts" DROP COLUMN "reviewer_title";
  ALTER TABLE "posts" DROP COLUMN "reviewer_url";
  ALTER TABLE "posts" DROP COLUMN "reviewer_reviewed_at";
  ALTER TABLE "posts" DROP COLUMN "view_count";
  ALTER TABLE "posts" DROP COLUMN "rating_average";
  ALTER TABLE "posts" DROP COLUMN "rating_count";
  ALTER TABLE "posts" DROP COLUMN "rating_total";`)
}
