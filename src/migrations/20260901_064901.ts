import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_product_filter_groups_show_on" AS ENUM('products', 'categories', 'brands', 'search');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$
    BEGIN
      CREATE TYPE "public"."enum_product_filter_groups_source_type" AS ENUM('brand', 'category', 'attribute', 'fragrance-note', 'price');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$
    BEGIN
      CREATE TYPE "public"."enum_product_filter_groups_display_type" AS ENUM('checkbox', 'radio', 'select', 'chips', 'range');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "product_filter_groups" (
      "id" serial PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "query_key" varchar NOT NULL,
      "enabled" boolean DEFAULT true,
      "sort_order" numeric DEFAULT 100,
      "source_type" "enum_product_filter_groups_source_type" DEFAULT 'attribute' NOT NULL,
      "attribute_id" integer,
      "display_type" "enum_product_filter_groups_display_type" DEFAULT 'checkbox' NOT NULL,
      "max_options" numeric DEFAULT 50,
      "collapsed_by_default" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "product_filter_groups_show_on" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_product_filter_groups_show_on",
      "id" serial PRIMARY KEY NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "product_filter_groups_id" integer;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_filter_groups_show_on_parent_fk'
      ) THEN
        ALTER TABLE "product_filter_groups_show_on"
          ADD CONSTRAINT "product_filter_groups_show_on_parent_fk"
          FOREIGN KEY ("parent_id")
          REFERENCES "public"."product_filter_groups"("id")
          ON DELETE cascade
          ON UPDATE no action;
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_filter_groups_attribute_id_attributes_id_fk'
      ) THEN
        ALTER TABLE "product_filter_groups"
          ADD CONSTRAINT "product_filter_groups_attribute_id_attributes_id_fk"
          FOREIGN KEY ("attribute_id")
          REFERENCES "public"."attributes"("id")
          ON DELETE set null
          ON UPDATE no action;
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payload_locked_documents_rels_product_filter_groups_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_product_filter_groups_fk"
          FOREIGN KEY ("product_filter_groups_id")
          REFERENCES "public"."product_filter_groups"("id")
          ON DELETE cascade
          ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "product_filter_groups_show_on_order_idx"
      ON "product_filter_groups_show_on" USING btree ("order");

    CREATE INDEX IF NOT EXISTS "product_filter_groups_show_on_parent_idx"
      ON "product_filter_groups_show_on" USING btree ("parent_id");

    CREATE UNIQUE INDEX IF NOT EXISTS "product_filter_groups_query_key_idx"
      ON "product_filter_groups" USING btree ("query_key");

    CREATE INDEX IF NOT EXISTS "product_filter_groups_sort_order_idx"
      ON "product_filter_groups" USING btree ("sort_order");

    CREATE INDEX IF NOT EXISTS "product_filter_groups_attribute_idx"
      ON "product_filter_groups" USING btree ("attribute_id");

    CREATE INDEX IF NOT EXISTS "product_filter_groups_updated_at_idx"
      ON "product_filter_groups" USING btree ("updated_at");

    CREATE INDEX IF NOT EXISTS "product_filter_groups_created_at_idx"
      ON "product_filter_groups" USING btree ("created_at");

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_product_filter_groups_id_idx"
      ON "payload_locked_documents_rels" USING btree ("product_filter_groups_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_product_filter_groups_fk";

    ALTER TABLE IF EXISTS "product_filter_groups_show_on"
      DROP CONSTRAINT IF EXISTS "product_filter_groups_show_on_parent_fk";

    ALTER TABLE IF EXISTS "product_filter_groups"
      DROP CONSTRAINT IF EXISTS "product_filter_groups_attribute_id_attributes_id_fk";

    DROP INDEX IF EXISTS "product_filter_groups_show_on_order_idx";
    DROP INDEX IF EXISTS "product_filter_groups_show_on_parent_idx";
    DROP INDEX IF EXISTS "product_filter_groups_query_key_idx";
    DROP INDEX IF EXISTS "product_filter_groups_sort_order_idx";
    DROP INDEX IF EXISTS "product_filter_groups_attribute_idx";
    DROP INDEX IF EXISTS "product_filter_groups_updated_at_idx";
    DROP INDEX IF EXISTS "product_filter_groups_created_at_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_product_filter_groups_id_idx";

    DROP TABLE IF EXISTS "product_filter_groups_show_on" CASCADE;
    DROP TABLE IF EXISTS "product_filter_groups" CASCADE;

    ALTER TABLE IF EXISTS "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "product_filter_groups_id";

    DROP TYPE IF EXISTS "public"."enum_product_filter_groups_show_on";
    DROP TYPE IF EXISTS "public"."enum_product_filter_groups_source_type";
    DROP TYPE IF EXISTS "public"."enum_product_filter_groups_display_type";
  `)
}