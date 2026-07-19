import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "blog_authors_same_as" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "blog_authors" (
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
  
  ALTER TABLE "posts" ADD COLUMN "author_profile_id" integer;
  ALTER TABLE "blog_comments" ADD COLUMN "parent_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blog_authors_id" integer;
  ALTER TABLE "blog_authors_same_as" ADD CONSTRAINT "blog_authors_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_authors" ADD CONSTRAINT "blog_authors_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "blog_authors_same_as_order_idx" ON "blog_authors_same_as" USING btree ("_order");
  CREATE INDEX "blog_authors_same_as_parent_id_idx" ON "blog_authors_same_as" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "blog_authors_slug_idx" ON "blog_authors" USING btree ("slug");
  CREATE INDEX "blog_authors_avatar_idx" ON "blog_authors" USING btree ("avatar_id");
  CREATE INDEX "blog_authors_is_default_idx" ON "blog_authors" USING btree ("is_default");
  CREATE INDEX "blog_authors_updated_at_idx" ON "blog_authors" USING btree ("updated_at");
  CREATE INDEX "blog_authors_created_at_idx" ON "blog_authors" USING btree ("created_at");
  ALTER TABLE "posts" ADD CONSTRAINT "posts_author_profile_id_blog_authors_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."blog_authors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parent_id_blog_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog_comments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_authors_fk" FOREIGN KEY ("blog_authors_id") REFERENCES "public"."blog_authors"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_author_profile_idx" ON "posts" USING btree ("author_profile_id");
  CREATE INDEX "blog_comments_parent_idx" ON "blog_comments" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_blog_authors_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_authors_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blog_authors_same_as" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blog_authors" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "blog_authors_same_as" CASCADE;
  DROP TABLE "blog_authors" CASCADE;
  ALTER TABLE "posts" DROP CONSTRAINT "posts_author_profile_id_blog_authors_id_fk";
  
  ALTER TABLE "blog_comments" DROP CONSTRAINT "blog_comments_parent_id_blog_comments_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blog_authors_fk";
  
  DROP INDEX "posts_author_profile_idx";
  DROP INDEX "blog_comments_parent_idx";
  DROP INDEX "payload_locked_documents_rels_blog_authors_id_idx";
  ALTER TABLE "posts" DROP COLUMN "author_profile_id";
  ALTER TABLE "blog_comments" DROP COLUMN "parent_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "blog_authors_id";`)
}
