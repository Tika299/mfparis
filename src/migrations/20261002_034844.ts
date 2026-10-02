import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_internal_link_rules_managed_by" ADD VALUE 'category';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "internal_link_rules" ALTER COLUMN "managed_by" SET DATA TYPE text;
  DROP TYPE "public"."enum_internal_link_rules_managed_by";
  CREATE TYPE "public"."enum_internal_link_rules_managed_by" AS ENUM('manual', 'product', 'brand');
  ALTER TABLE "internal_link_rules" ALTER COLUMN "managed_by" SET DATA TYPE "public"."enum_internal_link_rules_managed_by" USING "managed_by"::"public"."enum_internal_link_rules_managed_by";`)
}
