import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blog_comments" ADD COLUMN IF NOT EXISTS "parent_id" integer;

  DO $$ BEGIN
    ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parent_id_blog_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog_comments"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  CREATE INDEX IF NOT EXISTS "blog_comments_parent_idx" ON "blog_comments" USING btree ("parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "blog_comments_parent_idx";
  ALTER TABLE "blog_comments" DROP CONSTRAINT IF EXISTS "blog_comments_parent_id_blog_comments_id_fk";
  ALTER TABLE "blog_comments" DROP COLUMN IF EXISTS "parent_id";`)
}
