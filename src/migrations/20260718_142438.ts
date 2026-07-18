import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_blog_comments_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TABLE "blog_comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"post_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"comment" varchar NOT NULL,
  	"status" "enum_blog_comments_status" DEFAULT 'pending' NOT NULL,
  	"ip_address" varchar,
  	"user_agent" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blog_comments_id" integer;
  ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "blog_comments_post_idx" ON "blog_comments" USING btree ("post_id");
  CREATE INDEX "blog_comments_email_idx" ON "blog_comments" USING btree ("email");
  CREATE INDEX "blog_comments_status_idx" ON "blog_comments" USING btree ("status");
  CREATE INDEX "blog_comments_updated_at_idx" ON "blog_comments" USING btree ("updated_at");
  CREATE INDEX "blog_comments_created_at_idx" ON "blog_comments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_comments_fk" FOREIGN KEY ("blog_comments_id") REFERENCES "public"."blog_comments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_blog_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_comments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blog_comments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "blog_comments" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blog_comments_fk";
  
  DROP INDEX "payload_locked_documents_rels_blog_comments_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "blog_comments_id";
  DROP TYPE "public"."enum_blog_comments_status";`)
}
