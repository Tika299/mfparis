import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_internal_link_logs_source_type" AS ENUM('posts', 'products', 'categories', 'brands', 'post-categories');
  CREATE TABLE "internal_link_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"summary" varchar NOT NULL,
  	"log_key" varchar NOT NULL,
  	"source_type" "enum_internal_link_logs_source_type" NOT NULL,
  	"source_id" varchar NOT NULL,
  	"source_title" varchar,
  	"source_url" varchar NOT NULL,
  	"rule_id" integer,
  	"rule_title" varchar,
  	"keyword" varchar NOT NULL,
  	"anchor_text" varchar,
  	"target_url" varchar NOT NULL,
  	"inserted_count" numeric DEFAULT 0,
  	"skipped_count" numeric DEFAULT 0,
  	"total_inserted_count" numeric DEFAULT 0,
  	"preview_count" numeric DEFAULT 0,
  	"skip_reasons" varchar,
  	"last_text_preview" varchar,
  	"last_run_id" varchar,
  	"last_checked_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "internal_link_logs_id" integer;
  ALTER TABLE "internal_link_logs" ADD CONSTRAINT "internal_link_logs_rule_id_internal_link_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."internal_link_rules"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "internal_link_logs_log_key_idx" ON "internal_link_logs" USING btree ("log_key");
  CREATE INDEX "internal_link_logs_source_type_idx" ON "internal_link_logs" USING btree ("source_type");
  CREATE INDEX "internal_link_logs_source_id_idx" ON "internal_link_logs" USING btree ("source_id");
  CREATE INDEX "internal_link_logs_source_url_idx" ON "internal_link_logs" USING btree ("source_url");
  CREATE INDEX "internal_link_logs_rule_idx" ON "internal_link_logs" USING btree ("rule_id");
  CREATE INDEX "internal_link_logs_keyword_idx" ON "internal_link_logs" USING btree ("keyword");
  CREATE INDEX "internal_link_logs_target_url_idx" ON "internal_link_logs" USING btree ("target_url");
  CREATE INDEX "internal_link_logs_last_run_id_idx" ON "internal_link_logs" USING btree ("last_run_id");
  CREATE INDEX "internal_link_logs_last_checked_at_idx" ON "internal_link_logs" USING btree ("last_checked_at");
  CREATE INDEX "internal_link_logs_updated_at_idx" ON "internal_link_logs" USING btree ("updated_at");
  CREATE INDEX "internal_link_logs_created_at_idx" ON "internal_link_logs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_internal_link_logs_fk" FOREIGN KEY ("internal_link_logs_id") REFERENCES "public"."internal_link_logs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_internal_link_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("internal_link_logs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "internal_link_logs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "internal_link_logs" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_internal_link_logs_fk";
  
  DROP INDEX "payload_locked_documents_rels_internal_link_logs_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "internal_link_logs_id";
  DROP TYPE "public"."enum_internal_link_logs_source_type";`)
}
