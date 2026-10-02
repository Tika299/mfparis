import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_internal_link_scan_runs_source_types" AS ENUM('posts', 'products', 'categories', 'brands');
  CREATE TYPE "public"."enum_internal_link_scan_runs_status" AS ENUM('running', 'completed', 'failed', 'cancelled');
  CREATE TYPE "public"."enum_internal_link_scan_results_row_type" AS ENUM('page', 'inserted', 'skipped');
  CREATE TYPE "public"."enum_internal_link_scan_results_source_type" AS ENUM('posts', 'products', 'categories', 'brands');
  CREATE TYPE "public"."enum_internal_link_scan_results_review_status" AS ENUM('new', 'reviewed', 'resolved', 'dismissed');
  CREATE TABLE "internal_link_scan_runs_source_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_internal_link_scan_runs_source_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "internal_link_scan_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_internal_link_scan_runs_status" DEFAULT 'running' NOT NULL,
  	"requested_by_id" integer,
  	"current_source_type_index" numeric DEFAULT 0,
  	"current_page" numeric DEFAULT 1,
  	"pages_scanned" numeric DEFAULT 0,
  	"fields_scanned" numeric DEFAULT 0,
  	"candidate_links" numeric DEFAULT 0,
  	"inserted_candidates" numeric DEFAULT 0,
  	"skipped_candidates" numeric DEFAULT 0,
  	"issue_count" numeric DEFAULT 0,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"finished_at" timestamp(3) with time zone,
  	"error_message" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "internal_link_scan_results" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"record_key" varchar NOT NULL,
  	"scan_run_id" integer NOT NULL,
  	"row_type" "enum_internal_link_scan_results_row_type" NOT NULL,
  	"source_type" "enum_internal_link_scan_results_source_type" NOT NULL,
  	"source_id" varchar NOT NULL,
  	"source_title" varchar,
  	"source_url" varchar NOT NULL,
  	"source_field" varchar NOT NULL,
  	"source_field_label" varchar,
  	"word_count" numeric,
  	"link_count" numeric,
  	"links_per_hundred_words" numeric,
  	"rule_id" integer,
  	"rule_title" varchar,
  	"keyword" varchar,
  	"anchor_text" varchar,
  	"target_url" varchar,
  	"paragraph_index" numeric,
  	"context_excerpt" varchar,
  	"skip_reason" varchar,
  	"issue_flags" jsonb,
  	"review_status" "enum_internal_link_scan_results_review_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "internal_link_scan_runs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "internal_link_scan_results_id" integer;
  ALTER TABLE "internal_link_scan_runs_source_types" ADD CONSTRAINT "internal_link_scan_runs_source_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."internal_link_scan_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "internal_link_scan_runs" ADD CONSTRAINT "internal_link_scan_runs_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "internal_link_scan_results" ADD CONSTRAINT "internal_link_scan_results_scan_run_id_internal_link_scan_runs_id_fk" FOREIGN KEY ("scan_run_id") REFERENCES "public"."internal_link_scan_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "internal_link_scan_results" ADD CONSTRAINT "internal_link_scan_results_rule_id_internal_link_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."internal_link_rules"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "internal_link_scan_runs_source_types_order_idx" ON "internal_link_scan_runs_source_types" USING btree ("order");
  CREATE INDEX "internal_link_scan_runs_source_types_parent_idx" ON "internal_link_scan_runs_source_types" USING btree ("parent_id");
  CREATE INDEX "internal_link_scan_runs_status_idx" ON "internal_link_scan_runs" USING btree ("status");
  CREATE INDEX "internal_link_scan_runs_requested_by_idx" ON "internal_link_scan_runs" USING btree ("requested_by_id");
  CREATE INDEX "internal_link_scan_runs_started_at_idx" ON "internal_link_scan_runs" USING btree ("started_at");
  CREATE INDEX "internal_link_scan_runs_finished_at_idx" ON "internal_link_scan_runs" USING btree ("finished_at");
  CREATE INDEX "internal_link_scan_runs_updated_at_idx" ON "internal_link_scan_runs" USING btree ("updated_at");
  CREATE INDEX "internal_link_scan_runs_created_at_idx" ON "internal_link_scan_runs" USING btree ("created_at");
  CREATE UNIQUE INDEX "internal_link_scan_results_record_key_idx" ON "internal_link_scan_results" USING btree ("record_key");
  CREATE INDEX "internal_link_scan_results_scan_run_idx" ON "internal_link_scan_results" USING btree ("scan_run_id");
  CREATE INDEX "internal_link_scan_results_row_type_idx" ON "internal_link_scan_results" USING btree ("row_type");
  CREATE INDEX "internal_link_scan_results_source_type_idx" ON "internal_link_scan_results" USING btree ("source_type");
  CREATE INDEX "internal_link_scan_results_source_id_idx" ON "internal_link_scan_results" USING btree ("source_id");
  CREATE INDEX "internal_link_scan_results_source_title_idx" ON "internal_link_scan_results" USING btree ("source_title");
  CREATE INDEX "internal_link_scan_results_source_url_idx" ON "internal_link_scan_results" USING btree ("source_url");
  CREATE INDEX "internal_link_scan_results_rule_idx" ON "internal_link_scan_results" USING btree ("rule_id");
  CREATE INDEX "internal_link_scan_results_keyword_idx" ON "internal_link_scan_results" USING btree ("keyword");
  CREATE INDEX "internal_link_scan_results_target_url_idx" ON "internal_link_scan_results" USING btree ("target_url");
  CREATE INDEX "internal_link_scan_results_review_status_idx" ON "internal_link_scan_results" USING btree ("review_status");
  CREATE INDEX "internal_link_scan_results_updated_at_idx" ON "internal_link_scan_results" USING btree ("updated_at");
  CREATE INDEX "internal_link_scan_results_created_at_idx" ON "internal_link_scan_results" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_internal_link_scan_runs_fk" FOREIGN KEY ("internal_link_scan_runs_id") REFERENCES "public"."internal_link_scan_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_internal_link_scan_results_fk" FOREIGN KEY ("internal_link_scan_results_id") REFERENCES "public"."internal_link_scan_results"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_internal_link_scan_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("internal_link_scan_runs_id");
  CREATE INDEX "payload_locked_documents_rels_internal_link_scan_results_idx" ON "payload_locked_documents_rels" USING btree ("internal_link_scan_results_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "internal_link_scan_runs_source_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "internal_link_scan_runs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "internal_link_scan_results" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "internal_link_scan_runs_source_types" CASCADE;
  DROP TABLE "internal_link_scan_runs" CASCADE;
  DROP TABLE "internal_link_scan_results" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_internal_link_scan_runs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_internal_link_scan_results_fk";
  
  DROP INDEX "payload_locked_documents_rels_internal_link_scan_runs_id_idx";
  DROP INDEX "payload_locked_documents_rels_internal_link_scan_results_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "internal_link_scan_runs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "internal_link_scan_results_id";
  DROP TYPE "public"."enum_internal_link_scan_runs_source_types";
  DROP TYPE "public"."enum_internal_link_scan_runs_status";
  DROP TYPE "public"."enum_internal_link_scan_results_row_type";
  DROP TYPE "public"."enum_internal_link_scan_results_source_type";
  DROP TYPE "public"."enum_internal_link_scan_results_review_status";`)
}
