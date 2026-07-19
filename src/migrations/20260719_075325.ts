import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "blog_authors" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "slug" varchar NOT NULL,
    "title" varchar DEFAULT 'MF Paris Editorial',
    "avatar_id" integer,
    "bio" varchar,
    "url" varchar,
    "is_default" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "blog_authors_same_as" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "url" varchar NOT NULL
  );

  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "author_profile_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "blog_authors_id" integer;

  DO $$ BEGIN
    ALTER TABLE "blog_authors_same_as" ADD CONSTRAINT "blog_authors_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_authors"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    ALTER TABLE "blog_authors" ADD CONSTRAINT "blog_authors_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    ALTER TABLE "posts" ADD CONSTRAINT "posts_author_profile_id_blog_authors_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."blog_authors"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_authors_fk" FOREIGN KEY ("blog_authors_id") REFERENCES "public"."blog_authors"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  CREATE INDEX IF NOT EXISTS "blog_authors_same_as_order_idx" ON "blog_authors_same_as" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "blog_authors_same_as_parent_id_idx" ON "blog_authors_same_as" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "blog_authors_slug_idx" ON "blog_authors" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "blog_authors_avatar_idx" ON "blog_authors" USING btree ("avatar_id");
  CREATE INDEX IF NOT EXISTS "blog_authors_is_default_idx" ON "blog_authors" USING btree ("is_default");
  CREATE INDEX IF NOT EXISTS "blog_authors_updated_at_idx" ON "blog_authors" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "blog_authors_created_at_idx" ON "blog_authors" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "posts_author_profile_idx" ON "posts" USING btree ("author_profile_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blog_authors_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_authors_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_author_profile_id_blog_authors_id_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_blog_authors_fk";
  ALTER TABLE "blog_authors_same_as" DROP CONSTRAINT IF EXISTS "blog_authors_same_as_parent_id_fk";
  ALTER TABLE "blog_authors" DROP CONSTRAINT IF EXISTS "blog_authors_avatar_id_media_id_fk";

  DROP INDEX IF EXISTS "posts_author_profile_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_blog_authors_id_idx";
  DROP INDEX IF EXISTS "blog_authors_same_as_order_idx";
  DROP INDEX IF EXISTS "blog_authors_same_as_parent_id_idx";
  DROP INDEX IF EXISTS "blog_authors_slug_idx";
  DROP INDEX IF EXISTS "blog_authors_avatar_idx";
  DROP INDEX IF EXISTS "blog_authors_is_default_idx";
  DROP INDEX IF EXISTS "blog_authors_updated_at_idx";
  DROP INDEX IF EXISTS "blog_authors_created_at_idx";

  ALTER TABLE "posts" DROP COLUMN IF EXISTS "author_profile_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "blog_authors_id";
  DROP TABLE IF EXISTS "blog_authors_same_as" CASCADE;
  DROP TABLE IF EXISTS "blog_authors" CASCADE;`)
}
