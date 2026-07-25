import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_categories_taxonomy_type" AS ENUM('category', 'collection', 'support', 'temporary-node', 'facet', 'removed');
  CREATE TYPE "public"."enum_categories_seo_index" AS ENUM('index', 'conditional-index', 'noindex-temporary', 'noindex', 'noindex-after-move');
  CREATE TYPE "public"."enum_categories_implementation_priority" AS ENUM('P0', 'P1', 'P2', 'P3');
  CREATE TYPE "public"."enum_categories_implementation_status" AS ENUM('planned', 'in-progress', 'done', 'needs-gsc-review', 'deferred');
  CREATE TYPE "public"."enum_categories_redirect_status" AS ENUM('keep', '301', '410-noindex', 'noindex', 'keep-noindex', 'review');
  CREATE TYPE "public"."enum_post_categories_taxonomy_type" AS ENUM('category', 'collection', 'support', 'temporary-node', 'facet', 'removed');
  CREATE TYPE "public"."enum_post_categories_seo_index" AS ENUM('index', 'conditional-index', 'noindex-temporary', 'noindex', 'noindex-after-move');
  CREATE TYPE "public"."enum_post_categories_implementation_priority" AS ENUM('P0', 'P1', 'P2', 'P3');
  CREATE TYPE "public"."enum_post_categories_implementation_status" AS ENUM('planned', 'in-progress', 'done', 'needs-gsc-review', 'deferred');
  CREATE TYPE "public"."enum_post_categories_redirect_status" AS ENUM('keep', '301', '410-noindex', 'noindex', 'keep-noindex', 'review');
  ALTER TABLE "categories" ADD COLUMN "display_name" varchar;
  ALTER TABLE "categories" ADD COLUMN "taxonomy_type" "enum_categories_taxonomy_type" DEFAULT 'category';
  ALTER TABLE "categories" ADD COLUMN "seo_index" "enum_categories_seo_index" DEFAULT 'index';
  ALTER TABLE "categories" ADD COLUMN "silo_parent_label" varchar;
  ALTER TABLE "categories" ADD COLUMN "menu_placement" varchar;
  ALTER TABLE "categories" ADD COLUMN "implementation_priority" "enum_categories_implementation_priority";
  ALTER TABLE "categories" ADD COLUMN "implementation_status" "enum_categories_implementation_status" DEFAULT 'planned';
  ALTER TABLE "categories" ADD COLUMN "silo_action" varchar;
  ALTER TABLE "categories" ADD COLUMN "redirect_status" "enum_categories_redirect_status";
  ALTER TABLE "categories" ADD COLUMN "redirect_to" varchar;
  ALTER TABLE "categories" ADD COLUMN "silo_notes" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "parent_id" integer;
  ALTER TABLE "post_categories" ADD COLUMN "display_name" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "taxonomy_type" "enum_post_categories_taxonomy_type" DEFAULT 'category';
  ALTER TABLE "post_categories" ADD COLUMN "seo_index" "enum_post_categories_seo_index" DEFAULT 'index';
  ALTER TABLE "post_categories" ADD COLUMN "silo_parent_label" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "menu_placement" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "implementation_priority" "enum_post_categories_implementation_priority";
  ALTER TABLE "post_categories" ADD COLUMN "implementation_status" "enum_post_categories_implementation_status" DEFAULT 'planned';
  ALTER TABLE "post_categories" ADD COLUMN "silo_action" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "redirect_status" "enum_post_categories_redirect_status";
  ALTER TABLE "post_categories" ADD COLUMN "redirect_to" varchar;
  ALTER TABLE "post_categories" ADD COLUMN "silo_notes" varchar;
  ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_parent_id_post_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."post_categories"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "post_categories_parent_idx" ON "post_categories" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "post_categories" DROP CONSTRAINT "post_categories_parent_id_post_categories_id_fk";
  
  DROP INDEX "post_categories_parent_idx";
  ALTER TABLE "categories" DROP COLUMN "display_name";
  ALTER TABLE "categories" DROP COLUMN "taxonomy_type";
  ALTER TABLE "categories" DROP COLUMN "seo_index";
  ALTER TABLE "categories" DROP COLUMN "silo_parent_label";
  ALTER TABLE "categories" DROP COLUMN "menu_placement";
  ALTER TABLE "categories" DROP COLUMN "implementation_priority";
  ALTER TABLE "categories" DROP COLUMN "implementation_status";
  ALTER TABLE "categories" DROP COLUMN "silo_action";
  ALTER TABLE "categories" DROP COLUMN "redirect_status";
  ALTER TABLE "categories" DROP COLUMN "redirect_to";
  ALTER TABLE "categories" DROP COLUMN "silo_notes";
  ALTER TABLE "post_categories" DROP COLUMN "parent_id";
  ALTER TABLE "post_categories" DROP COLUMN "display_name";
  ALTER TABLE "post_categories" DROP COLUMN "taxonomy_type";
  ALTER TABLE "post_categories" DROP COLUMN "seo_index";
  ALTER TABLE "post_categories" DROP COLUMN "silo_parent_label";
  ALTER TABLE "post_categories" DROP COLUMN "menu_placement";
  ALTER TABLE "post_categories" DROP COLUMN "implementation_priority";
  ALTER TABLE "post_categories" DROP COLUMN "implementation_status";
  ALTER TABLE "post_categories" DROP COLUMN "silo_action";
  ALTER TABLE "post_categories" DROP COLUMN "redirect_status";
  ALTER TABLE "post_categories" DROP COLUMN "redirect_to";
  ALTER TABLE "post_categories" DROP COLUMN "silo_notes";
  DROP TYPE "public"."enum_categories_taxonomy_type";
  DROP TYPE "public"."enum_categories_seo_index";
  DROP TYPE "public"."enum_categories_implementation_priority";
  DROP TYPE "public"."enum_categories_implementation_status";
  DROP TYPE "public"."enum_categories_redirect_status";
  DROP TYPE "public"."enum_post_categories_taxonomy_type";
  DROP TYPE "public"."enum_post_categories_seo_index";
  DROP TYPE "public"."enum_post_categories_implementation_priority";
  DROP TYPE "public"."enum_post_categories_implementation_status";
  DROP TYPE "public"."enum_post_categories_redirect_status";`)
}
