import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands" ALTER COLUMN "description" SET DATA TYPE varchar;
  ALTER TABLE "products" ALTER COLUMN "description" SET DATA TYPE varchar;
  ALTER TABLE "categories" ALTER COLUMN "description" SET DATA TYPE varchar;
  ALTER TABLE "posts" ALTER COLUMN "content" SET DATA TYPE varchar;
  ALTER TABLE "about_page" ALTER COLUMN "story_content" SET DATA TYPE varchar;
  ALTER TABLE "about_page" ALTER COLUMN "story_video_title" SET DEFAULT 'Video gioi thieu Marais de France';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands" ALTER COLUMN "description" SET DATA TYPE jsonb;
  ALTER TABLE "products" ALTER COLUMN "description" SET DATA TYPE jsonb;
  ALTER TABLE "categories" ALTER COLUMN "description" SET DATA TYPE jsonb;
  ALTER TABLE "posts" ALTER COLUMN "content" SET DATA TYPE jsonb;
  ALTER TABLE "about_page" ALTER COLUMN "story_content" SET DATA TYPE jsonb;
  ALTER TABLE "about_page" ALTER COLUMN "story_video_title" SET DEFAULT 'Video giới thiệu Marais de France';`)
}
