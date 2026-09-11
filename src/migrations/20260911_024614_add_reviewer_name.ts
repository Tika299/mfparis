import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "reviews" ADD COLUMN "reviewer_name" varchar;
  CREATE INDEX "reviews_reviewer_name_idx" ON "reviews" USING btree ("reviewer_name");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "reviews_reviewer_name_idx";
  ALTER TABLE "reviews" DROP COLUMN "reviewer_name";`)
}
