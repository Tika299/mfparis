import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "about_page_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "about_page_difference_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "about_page_service_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar
  );
  
  ALTER TABLE "about_page" ALTER COLUMN "hero_title" SET DEFAULT 'Câu Chuyện Thương Hiệu';
  ALTER TABLE "about_page" ALTER COLUMN "story_heading" SET DEFAULT 'Marais de France';
  ALTER TABLE "about_page" ADD COLUMN "hero_eyebrow" varchar DEFAULT 'Since 2018 · MF Paris';
  ALTER TABLE "about_page" ADD COLUMN "hero_subtitle" varchar DEFAULT 'Marais de France đồng hành cùng vẻ đẹp chính hãng, an toàn và giàu cảm hứng từ nước Pháp đến người Việt.';
  ALTER TABLE "about_page" ADD COLUMN "hero_product_image_id" integer;
  ALTER TABLE "about_page" ADD COLUMN "story_eyebrow" varchar DEFAULT 'Hành trình của chúng tôi';
  ALTER TABLE "about_page" ADD COLUMN "story_summary" varchar DEFAULT 'Một thương hiệu được xây dựng từ niềm tin vào cái đẹp chân thật, nguồn gốc minh bạch và trải nghiệm mua sắm tử tế.';
  ALTER TABLE "about_page" ADD COLUMN "story_signature" varchar DEFAULT 'Marais de France';
  ALTER TABLE "about_page" ADD COLUMN "difference_eyebrow" varchar DEFAULT 'Vì sao chọn chúng tôi?';
  ALTER TABLE "about_page" ADD COLUMN "difference_heading" varchar DEFAULT 'Giá trị làm nên sự khác biệt';
  ALTER TABLE "about_page" ADD COLUMN "difference_intro" varchar DEFAULT 'Chúng tôi không ngừng tìm hiểu và phát triển để bạn luôn cảm nhận được sự khác biệt từ sản phẩm chính hãng.';
  ALTER TABLE "about_page" ADD COLUMN "difference_cta_label" varchar DEFAULT 'Khám phá ngay';
  ALTER TABLE "about_page" ADD COLUMN "difference_cta_href" varchar DEFAULT '/about';
  ALTER TABLE "about_page" ADD COLUMN "showroom_image_id" integer;
  ALTER TABLE "about_page" ADD COLUMN "showroom_heading" varchar DEFAULT 'Đến tận nơi, thử tận tay, chọn đúng sản phẩm dành cho bạn.';
  ALTER TABLE "about_page" ADD COLUMN "showroom_cta_label" varchar DEFAULT 'Khám phá ngay';
  ALTER TABLE "about_page" ADD COLUMN "showroom_cta_href" varchar DEFAULT '/he-thong-cua-hang';
  ALTER TABLE "about_page" ADD COLUMN "showroom_location_title" varchar DEFAULT 'Marais de France';
  ALTER TABLE "about_page" ADD COLUMN "showroom_location_text" varchar DEFAULT '220/24 Nguyễn Oanh, Phường Gò Vấp, TP.HCM';
  ALTER TABLE "about_page" ADD COLUMN "showroom_channels_title" varchar DEFAULT 'Phục vụ toàn quốc';
  ALTER TABLE "about_page" ADD COLUMN "showroom_channels_text" varchar DEFAULT 'Website, Facebook, TikTok Shop, Shopee, Lazada và các kênh chính thức.';
  ALTER TABLE "about_page_hero_stats" ADD CONSTRAINT "about_page_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_difference_cards" ADD CONSTRAINT "about_page_difference_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_difference_cards" ADD CONSTRAINT "about_page_difference_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_service_highlights" ADD CONSTRAINT "about_page_service_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "about_page_hero_stats_order_idx" ON "about_page_hero_stats" USING btree ("_order");
  CREATE INDEX "about_page_hero_stats_parent_id_idx" ON "about_page_hero_stats" USING btree ("_parent_id");
  CREATE INDEX "about_page_difference_cards_order_idx" ON "about_page_difference_cards" USING btree ("_order");
  CREATE INDEX "about_page_difference_cards_parent_id_idx" ON "about_page_difference_cards" USING btree ("_parent_id");
  CREATE INDEX "about_page_difference_cards_image_idx" ON "about_page_difference_cards" USING btree ("image_id");
  CREATE INDEX "about_page_service_highlights_order_idx" ON "about_page_service_highlights" USING btree ("_order");
  CREATE INDEX "about_page_service_highlights_parent_id_idx" ON "about_page_service_highlights" USING btree ("_parent_id");
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_hero_product_image_id_media_id_fk" FOREIGN KEY ("hero_product_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_showroom_image_id_media_id_fk" FOREIGN KEY ("showroom_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "about_page_hero_hero_product_image_idx" ON "about_page" USING btree ("hero_product_image_id");
  CREATE INDEX "about_page_showroom_showroom_image_idx" ON "about_page" USING btree ("showroom_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "about_page_hero_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about_page_difference_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about_page_service_highlights" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "about_page_hero_stats" CASCADE;
  DROP TABLE "about_page_difference_cards" CASCADE;
  DROP TABLE "about_page_service_highlights" CASCADE;
  ALTER TABLE "about_page" DROP CONSTRAINT "about_page_hero_product_image_id_media_id_fk";
  
  ALTER TABLE "about_page" DROP CONSTRAINT "about_page_showroom_image_id_media_id_fk";
  
  DROP INDEX "about_page_hero_hero_product_image_idx";
  DROP INDEX "about_page_showroom_showroom_image_idx";
  ALTER TABLE "about_page" ALTER COLUMN "hero_title" DROP DEFAULT;
  ALTER TABLE "about_page" ALTER COLUMN "story_heading" DROP DEFAULT;
  ALTER TABLE "about_page" DROP COLUMN "hero_eyebrow";
  ALTER TABLE "about_page" DROP COLUMN "hero_subtitle";
  ALTER TABLE "about_page" DROP COLUMN "hero_product_image_id";
  ALTER TABLE "about_page" DROP COLUMN "story_eyebrow";
  ALTER TABLE "about_page" DROP COLUMN "story_summary";
  ALTER TABLE "about_page" DROP COLUMN "story_signature";
  ALTER TABLE "about_page" DROP COLUMN "difference_eyebrow";
  ALTER TABLE "about_page" DROP COLUMN "difference_heading";
  ALTER TABLE "about_page" DROP COLUMN "difference_intro";
  ALTER TABLE "about_page" DROP COLUMN "difference_cta_label";
  ALTER TABLE "about_page" DROP COLUMN "difference_cta_href";
  ALTER TABLE "about_page" DROP COLUMN "showroom_image_id";
  ALTER TABLE "about_page" DROP COLUMN "showroom_heading";
  ALTER TABLE "about_page" DROP COLUMN "showroom_cta_label";
  ALTER TABLE "about_page" DROP COLUMN "showroom_cta_href";
  ALTER TABLE "about_page" DROP COLUMN "showroom_location_title";
  ALTER TABLE "about_page" DROP COLUMN "showroom_location_text";
  ALTER TABLE "about_page" DROP COLUMN "showroom_channels_title";
  ALTER TABLE "about_page" DROP COLUMN "showroom_channels_text";`)
}
