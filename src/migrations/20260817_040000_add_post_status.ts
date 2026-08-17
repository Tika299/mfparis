import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
    ALTER TABLE "posts" ADD COLUMN "status" "enum_posts_status";
    UPDATE "posts" SET "status" = 'published' WHERE "status" IS NULL;
    ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'draft';
    CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "posts_status_idx";
    ALTER TABLE "posts" DROP COLUMN "status";
    DROP TYPE "public"."enum_posts_status";
  `)
}
