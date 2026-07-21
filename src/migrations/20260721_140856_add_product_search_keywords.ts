import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ADD COLUMN "search_keywords" varchar;
  CREATE INDEX "products_search_keywords_idx" ON "products" USING btree ("search_keywords");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "products_search_keywords_idx";
  ALTER TABLE "products" DROP COLUMN "search_keywords";`)
}
