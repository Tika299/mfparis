import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "contact_google_map_url" varchar;
  ALTER TABLE "about_page" ADD COLUMN "story_video_url" varchar;
  ALTER TABLE "about_page" ADD COLUMN "story_video_title" varchar DEFAULT 'Video giới thiệu Marais de France';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "contact_google_map_url";
  ALTER TABLE "about_page" DROP COLUMN "story_video_url";
  ALTER TABLE "about_page" DROP COLUMN "story_video_title";`)
}
