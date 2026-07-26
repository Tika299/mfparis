import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP CONSTRAINT "posts_author_avatar_id_media_id_fk";
  
  DROP INDEX "posts_author_author_avatar_idx";
  ALTER TABLE "media" ADD COLUMN "description" varchar;
  ALTER TABLE "posts" DROP COLUMN "author_name";
  ALTER TABLE "posts" DROP COLUMN "author_title";
  ALTER TABLE "posts" DROP COLUMN "author_avatar_id";
  ALTER TABLE "posts" DROP COLUMN "author_url";
  ALTER TABLE "posts" DROP COLUMN "author_bio";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ADD COLUMN "author_name" varchar DEFAULT 'Marais de France';
  ALTER TABLE "posts" ADD COLUMN "author_title" varchar DEFAULT 'MF Paris Editorial';
  ALTER TABLE "posts" ADD COLUMN "author_avatar_id" integer;
  ALTER TABLE "posts" ADD COLUMN "author_url" varchar DEFAULT '/author/mfparis/';
  ALTER TABLE "posts" ADD COLUMN "author_bio" varchar DEFAULT 'Marais de France là đội ngũ yêu thích hương thơm, chia sẻ kinh nghiệm đánh giá nước hoa và mỹ phẩm nhằm giúp khách hàng lựa chọn sản phẩm phù hợp.';
  ALTER TABLE "posts" ADD CONSTRAINT "posts_author_avatar_id_media_id_fk" FOREIGN KEY ("author_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_author_author_avatar_idx" ON "posts" USING btree ("author_avatar_id");
  ALTER TABLE "media" DROP COLUMN "description";`)
}
