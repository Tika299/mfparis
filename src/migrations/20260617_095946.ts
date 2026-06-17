import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_display_location" AS ENUM('best-seller', 'combo', 'new-arrival', 'flash-sale');
  CREATE TYPE "public"."enum_products_seo_status" AS ENUM('active', 'temporarily_out_of_stock', 'discontinued_keep_page', 'discontinued_redirect');
  CREATE TYPE "public"."enum_products_product_type" AS ENUM('simple', 'variable');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('cod', 'bank_transfer', 'fundiin');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'confirmed', 'shipping', 'completed', 'cancelled', 'failed');
  CREATE TYPE "public"."enum_messages_sender" AS ENUM('customer', 'admin');
  CREATE TYPE "public"."enum_vouchers_status" AS ENUM('active', 'draft', 'inactive');
  CREATE TYPE "public"."enum_vouchers_type" AS ENUM('fixed', 'percent');
  CREATE TYPE "public"."enum_redirects_type" AS ENUM('301', '302');
  CREATE TYPE "public"."enum_attributes_scope" AS ENUM('general', 'fragrance', 'beauty');
  CREATE TYPE "public"."enum_attributes_value_type" AS ENUM('select', 'multi_select', 'number', 'range', 'boolean', 'text');
  CREATE TYPE "public"."enum_attributes_display_style" AS ENUM('checkbox', 'radio', 'dropdown', 'chips', 'range', 'color');
  CREATE TYPE "public"."enum_carts_status" AS ENUM('active', 'abandoned', 'converted', 'merged', 'expired');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_voucher_redemptions_status" AS ENUM('held', 'completed', 'cancelled');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar
  );
  
  CREATE TABLE "brands" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"logo_id" integer,
  	"description" jsonb,
  	"is_featured" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "products_specifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "products_product_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attribute_id" integer NOT NULL,
  	"numeric_value" numeric,
  	"boolean_value" boolean,
  	"text_value" varchar
  );
  
  CREATE TABLE "products_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"sku" varchar,
  	"is_default" boolean DEFAULT false,
  	"base_price" numeric,
  	"sale_price" numeric,
  	"stock" numeric DEFAULT 0,
  	"image_id" integer,
  	"is_active" boolean DEFAULT true
  );
  
  CREATE TABLE "products_display_location" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_display_location",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_status" "enum_products_seo_status" DEFAULT 'active' NOT NULL,
  	"related_product_id" integer,
  	"title" varchar NOT NULL,
  	"sku" varchar,
  	"brand_id" integer NOT NULL,
  	"product_type" "enum_products_product_type" DEFAULT 'simple',
  	"price_base_price" numeric NOT NULL,
  	"price_sale_price" numeric,
  	"price_stock" numeric DEFAULT 0,
  	"short_description" varchar,
  	"fragrance_profile_longevity_score" numeric,
  	"fragrance_profile_sillage_score" numeric,
  	"description" jsonb,
  	"is_combo" boolean DEFAULT false,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"slug" varchar NOT NULL,
  	"average_rating" numeric DEFAULT 0,
  	"review_count" numeric DEFAULT 0,
  	"status" "enum_products_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"attribute_values_id" integer,
  	"fragrance_notes_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"image_id" integer,
  	"description" jsonb,
  	"slug" varchar NOT NULL,
  	"parent_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"variant_id" varchar,
  	"product_title_snapshot" varchar NOT NULL,
  	"variant_name_snapshot" varchar,
  	"sku_snapshot" varchar,
  	"quantity" numeric NOT NULL,
  	"price_at_purchase" numeric NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"customer_info_full_name" varchar NOT NULL,
  	"customer_info_phone" varchar NOT NULL,
  	"customer_info_email" varchar,
  	"customer_info_address" varchar,
  	"customer_info_province" varchar,
  	"customer_info_district" varchar,
  	"customer_info_ward" varchar,
  	"total_amount" numeric NOT NULL,
  	"payment_method" "enum_orders_payment_method" DEFAULT 'cod',
  	"status" "enum_orders_status" DEFAULT 'pending',
  	"fundiin_transaction_id" varchar,
  	"fundiin_payment_status" varchar,
  	"fundiin_order_token" varchar,
  	"subtotal_amount" numeric,
  	"discount_amount" numeric DEFAULT 0,
  	"voucher_code" varchar,
  	"voucher_id_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"thumbnail_id" integer NOT NULL,
  	"content" jsonb,
  	"excerpt" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"post_categories_id" integer
  );
  
  CREATE TABLE "post_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"profile_id" integer NOT NULL,
  	"customer_name" varchar NOT NULL,
  	"sender" "enum_messages_sender" NOT NULL,
  	"content" varchar NOT NULL,
  	"is_read" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "chat_profiles_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "chat_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar,
  	"username" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "vouchers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"title" varchar,
  	"status" "enum_vouchers_status" DEFAULT 'active' NOT NULL,
  	"is_public" boolean DEFAULT false NOT NULL,
  	"type" "enum_vouchers_type" DEFAULT 'fixed' NOT NULL,
  	"value" numeric NOT NULL,
  	"min_order_amount" numeric DEFAULT 0,
  	"max_discount_amount" numeric DEFAULT 0,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"usage_limit" numeric DEFAULT 0,
  	"usage_limit_per_customer" numeric DEFAULT 0,
  	"used_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"type" "enum_redirects_type" DEFAULT '301' NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attributes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"scope" "enum_attributes_scope" DEFAULT 'general' NOT NULL,
  	"value_type" "enum_attributes_value_type" DEFAULT 'select' NOT NULL,
  	"unit" varchar,
  	"sort_order" numeric DEFAULT 0,
  	"filterable" boolean DEFAULT true,
  	"comparable" boolean DEFAULT true,
  	"variant_option" boolean DEFAULT false,
  	"allows_multiple" boolean DEFAULT false,
  	"display_style" "enum_attributes_display_style" DEFAULT 'checkbox',
  	"validation_min" numeric,
  	"validation_max" numeric,
  	"validation_step" numeric DEFAULT 1,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attributes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "attribute_values_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alias" varchar NOT NULL
  );
  
  CREATE TABLE "attribute_values_metadata" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "attribute_values" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"attribute_id" integer NOT NULL,
  	"label" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"numeric_value" numeric,
  	"boolean_value" boolean DEFAULT false,
  	"color_hex" varchar,
  	"image_id" integer,
  	"sort_order" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"variant_id" varchar,
  	"quantity" numeric DEFAULT 1 NOT NULL,
  	"product_title_snapshot" varchar,
  	"variant_name_snapshot" varchar,
  	"sku_snapshot" varchar,
  	"unit_price_snapshot" numeric,
  	"stock_snapshot" numeric,
  	"line_total" numeric
  );
  
  CREATE TABLE "carts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer,
  	"guest_id" varchar,
  	"status" "enum_carts_status" DEFAULT 'active' NOT NULL,
  	"voucher_id" integer,
  	"subtotal_amount" numeric DEFAULT 0,
  	"discount_amount" numeric DEFAULT 0,
  	"total_amount" numeric DEFAULT 0,
  	"last_activity_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"converted_order_id" integer,
  	"merged_into_cart_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "fragrance_notes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"icon_id" integer NOT NULL,
  	"description" varchar,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"user_id" integer,
  	"rating" numeric NOT NULL,
  	"comment" varchar,
  	"status" "enum_reviews_status" DEFAULT 'pending' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "voucher_redemptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"voucher_id" integer NOT NULL,
  	"order_id" integer NOT NULL,
  	"customer_id" integer,
  	"email" varchar,
  	"discount_amount" numeric NOT NULL,
  	"status" "enum_voucher_redemptions_status" DEFAULT 'held' NOT NULL,
  	"held_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"cancelled_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"brands_id" integer,
  	"products_id" integer,
  	"categories_id" integer,
  	"orders_id" integer,
  	"posts_id" integer,
  	"post_categories_id" integer,
  	"messages_id" integer,
  	"chat_profiles_id" integer,
  	"vouchers_id" integer,
  	"redirects_id" integer,
  	"attributes_id" integer,
  	"attribute_values_id" integer,
  	"carts_id" integer,
  	"fragrance_notes_id" integer,
  	"reviews_id" integer,
  	"voucher_redemptions_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"chat_profiles_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_hero_sliders" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_desktop_id" integer NOT NULL,
  	"image_tablet_id" integer NOT NULL,
  	"image_mobile_id" integer NOT NULL,
  	"link" varchar
  );
  
  CREATE TABLE "site_settings_header_nav_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"header_logo_id" integer,
  	"contact_phone" varchar,
  	"contact_zalo_link" varchar,
  	"contact_address" varchar,
  	"contact_facebook_url" varchar,
  	"flash_sale_enabled" boolean DEFAULT true,
  	"flash_sale_end_time" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"vouchers_id" integer
  );
  
  CREATE TABLE "about_page_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "about_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_title" varchar,
  	"hero_image_id" integer,
  	"story_heading" varchar,
  	"story_content" jsonb,
  	"story_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_specifications" ADD CONSTRAINT "products_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_product_attributes" ADD CONSTRAINT "products_product_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_product_attributes" ADD CONSTRAINT "products_product_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_display_location" ADD CONSTRAINT "products_display_location_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_attribute_values_fk" FOREIGN KEY ("attribute_values_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_fragrance_notes_fk" FOREIGN KEY ("fragrance_notes_id") REFERENCES "public"."fragrance_notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_voucher_id_id_vouchers_id_fk" FOREIGN KEY ("voucher_id_id") REFERENCES "public"."vouchers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_post_categories_fk" FOREIGN KEY ("post_categories_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_profile_id_chat_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."chat_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "chat_profiles_sessions" ADD CONSTRAINT "chat_profiles_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."chat_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attributes_rels" ADD CONSTRAINT "attributes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attributes_rels" ADD CONSTRAINT "attributes_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attribute_values_aliases" ADD CONSTRAINT "attribute_values_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attribute_values_metadata" ADD CONSTRAINT "attribute_values_metadata_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_merged_into_cart_id_carts_id_fk" FOREIGN KEY ("merged_into_cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fragrance_notes" ADD CONSTRAINT "fragrance_notes_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_post_categories_fk" FOREIGN KEY ("post_categories_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_messages_fk" FOREIGN KEY ("messages_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_profiles_fk" FOREIGN KEY ("chat_profiles_id") REFERENCES "public"."chat_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vouchers_fk" FOREIGN KEY ("vouchers_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attribute_values_fk" FOREIGN KEY ("attribute_values_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fragrance_notes_fk" FOREIGN KEY ("fragrance_notes_id") REFERENCES "public"."fragrance_notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_voucher_redemptions_fk" FOREIGN KEY ("voucher_redemptions_id") REFERENCES "public"."voucher_redemptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_chat_profiles_fk" FOREIGN KEY ("chat_profiles_id") REFERENCES "public"."chat_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_hero_sliders" ADD CONSTRAINT "site_settings_hero_sliders_image_desktop_id_media_id_fk" FOREIGN KEY ("image_desktop_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_hero_sliders" ADD CONSTRAINT "site_settings_hero_sliders_image_tablet_id_media_id_fk" FOREIGN KEY ("image_tablet_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_hero_sliders" ADD CONSTRAINT "site_settings_hero_sliders_image_mobile_id_media_id_fk" FOREIGN KEY ("image_mobile_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_hero_sliders" ADD CONSTRAINT "site_settings_hero_sliders_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_header_nav_items" ADD CONSTRAINT "site_settings_header_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_header_logo_id_media_id_fk" FOREIGN KEY ("header_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_vouchers_fk" FOREIGN KEY ("vouchers_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_values" ADD CONSTRAINT "about_page_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_story_image_id_media_id_fk" FOREIGN KEY ("story_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");
  CREATE INDEX "brands_logo_idx" ON "brands" USING btree ("logo_id");
  CREATE INDEX "brands_updated_at_idx" ON "brands" USING btree ("updated_at");
  CREATE INDEX "brands_created_at_idx" ON "brands" USING btree ("created_at");
  CREATE INDEX "products_images_order_idx" ON "products_images" USING btree ("_order");
  CREATE INDEX "products_images_parent_id_idx" ON "products_images" USING btree ("_parent_id");
  CREATE INDEX "products_images_image_idx" ON "products_images" USING btree ("image_id");
  CREATE INDEX "products_specifications_order_idx" ON "products_specifications" USING btree ("_order");
  CREATE INDEX "products_specifications_parent_id_idx" ON "products_specifications" USING btree ("_parent_id");
  CREATE INDEX "products_product_attributes_order_idx" ON "products_product_attributes" USING btree ("_order");
  CREATE INDEX "products_product_attributes_parent_id_idx" ON "products_product_attributes" USING btree ("_parent_id");
  CREATE INDEX "products_product_attributes_attribute_idx" ON "products_product_attributes" USING btree ("attribute_id");
  CREATE INDEX "products_variants_order_idx" ON "products_variants" USING btree ("_order");
  CREATE INDEX "products_variants_parent_id_idx" ON "products_variants" USING btree ("_parent_id");
  CREATE INDEX "products_variants_image_idx" ON "products_variants" USING btree ("image_id");
  CREATE INDEX "products_display_location_order_idx" ON "products_display_location" USING btree ("order");
  CREATE INDEX "products_display_location_parent_idx" ON "products_display_location" USING btree ("parent_id");
  CREATE INDEX "products_seo_status_idx" ON "products" USING btree ("seo_status");
  CREATE INDEX "products_related_product_idx" ON "products" USING btree ("related_product_id");
  CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_average_rating_idx" ON "products" USING btree ("average_rating");
  CREATE INDEX "products_review_count_idx" ON "products" USING btree ("review_count");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_categories_id_idx" ON "products_rels" USING btree ("categories_id");
  CREATE INDEX "products_rels_attribute_values_id_idx" ON "products_rels" USING btree ("attribute_values_id");
  CREATE INDEX "products_rels_fragrance_notes_id_idx" ON "products_rels" USING btree ("fragrance_notes_id");
  CREATE INDEX "products_rels_products_id_idx" ON "products_rels" USING btree ("products_id");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "orders_items" USING btree ("product_id");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_voucher_id_idx" ON "orders" USING btree ("voucher_id_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_thumbnail_idx" ON "posts" USING btree ("thumbnail_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_post_categories_id_idx" ON "posts_rels" USING btree ("post_categories_id");
  CREATE UNIQUE INDEX "post_categories_slug_idx" ON "post_categories" USING btree ("slug");
  CREATE INDEX "post_categories_updated_at_idx" ON "post_categories" USING btree ("updated_at");
  CREATE INDEX "post_categories_created_at_idx" ON "post_categories" USING btree ("created_at");
  CREATE INDEX "messages_profile_idx" ON "messages" USING btree ("profile_id");
  CREATE INDEX "messages_updated_at_idx" ON "messages" USING btree ("updated_at");
  CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");
  CREATE INDEX "chat_profiles_sessions_order_idx" ON "chat_profiles_sessions" USING btree ("_order");
  CREATE INDEX "chat_profiles_sessions_parent_id_idx" ON "chat_profiles_sessions" USING btree ("_parent_id");
  CREATE INDEX "chat_profiles_updated_at_idx" ON "chat_profiles" USING btree ("updated_at");
  CREATE INDEX "chat_profiles_created_at_idx" ON "chat_profiles" USING btree ("created_at");
  CREATE UNIQUE INDEX "chat_profiles_username_idx" ON "chat_profiles" USING btree ("username");
  CREATE UNIQUE INDEX "vouchers_code_idx" ON "vouchers" USING btree ("code");
  CREATE INDEX "vouchers_status_idx" ON "vouchers" USING btree ("status");
  CREATE INDEX "vouchers_is_public_idx" ON "vouchers" USING btree ("is_public");
  CREATE INDEX "vouchers_starts_at_idx" ON "vouchers" USING btree ("starts_at");
  CREATE INDEX "vouchers_ends_at_idx" ON "vouchers" USING btree ("ends_at");
  CREATE INDEX "vouchers_used_count_idx" ON "vouchers" USING btree ("used_count");
  CREATE INDEX "vouchers_updated_at_idx" ON "vouchers" USING btree ("updated_at");
  CREATE INDEX "vouchers_created_at_idx" ON "vouchers" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_active_idx" ON "redirects" USING btree ("active");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE UNIQUE INDEX "attributes_slug_idx" ON "attributes" USING btree ("slug");
  CREATE INDEX "attributes_is_active_idx" ON "attributes" USING btree ("is_active");
  CREATE INDEX "attributes_updated_at_idx" ON "attributes" USING btree ("updated_at");
  CREATE INDEX "attributes_created_at_idx" ON "attributes" USING btree ("created_at");
  CREATE INDEX "attributes_rels_order_idx" ON "attributes_rels" USING btree ("order");
  CREATE INDEX "attributes_rels_parent_idx" ON "attributes_rels" USING btree ("parent_id");
  CREATE INDEX "attributes_rels_path_idx" ON "attributes_rels" USING btree ("path");
  CREATE INDEX "attributes_rels_categories_id_idx" ON "attributes_rels" USING btree ("categories_id");
  CREATE INDEX "attribute_values_aliases_order_idx" ON "attribute_values_aliases" USING btree ("_order");
  CREATE INDEX "attribute_values_aliases_parent_id_idx" ON "attribute_values_aliases" USING btree ("_parent_id");
  CREATE INDEX "attribute_values_metadata_order_idx" ON "attribute_values_metadata" USING btree ("_order");
  CREATE INDEX "attribute_values_metadata_parent_id_idx" ON "attribute_values_metadata" USING btree ("_parent_id");
  CREATE INDEX "attribute_values_attribute_idx" ON "attribute_values" USING btree ("attribute_id");
  CREATE INDEX "attribute_values_slug_idx" ON "attribute_values" USING btree ("slug");
  CREATE INDEX "attribute_values_image_idx" ON "attribute_values" USING btree ("image_id");
  CREATE INDEX "attribute_values_is_active_idx" ON "attribute_values" USING btree ("is_active");
  CREATE INDEX "attribute_values_updated_at_idx" ON "attribute_values" USING btree ("updated_at");
  CREATE INDEX "attribute_values_created_at_idx" ON "attribute_values" USING btree ("created_at");
  CREATE INDEX "carts_items_order_idx" ON "carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "carts_items" USING btree ("product_id");
  CREATE INDEX "carts_user_idx" ON "carts" USING btree ("user_id");
  CREATE INDEX "carts_guest_id_idx" ON "carts" USING btree ("guest_id");
  CREATE INDEX "carts_status_idx" ON "carts" USING btree ("status");
  CREATE INDEX "carts_voucher_idx" ON "carts" USING btree ("voucher_id");
  CREATE INDEX "carts_last_activity_at_idx" ON "carts" USING btree ("last_activity_at");
  CREATE INDEX "carts_expires_at_idx" ON "carts" USING btree ("expires_at");
  CREATE INDEX "carts_converted_order_idx" ON "carts" USING btree ("converted_order_id");
  CREATE INDEX "carts_merged_into_cart_idx" ON "carts" USING btree ("merged_into_cart_id");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  CREATE UNIQUE INDEX "fragrance_notes_slug_idx" ON "fragrance_notes" USING btree ("slug");
  CREATE INDEX "fragrance_notes_icon_idx" ON "fragrance_notes" USING btree ("icon_id");
  CREATE INDEX "fragrance_notes_updated_at_idx" ON "fragrance_notes" USING btree ("updated_at");
  CREATE INDEX "fragrance_notes_created_at_idx" ON "fragrance_notes" USING btree ("created_at");
  CREATE INDEX "reviews_product_idx" ON "reviews" USING btree ("product_id");
  CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");
  CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX "voucher_redemptions_voucher_idx" ON "voucher_redemptions" USING btree ("voucher_id");
  CREATE INDEX "voucher_redemptions_order_idx" ON "voucher_redemptions" USING btree ("order_id");
  CREATE INDEX "voucher_redemptions_customer_idx" ON "voucher_redemptions" USING btree ("customer_id");
  CREATE INDEX "voucher_redemptions_email_idx" ON "voucher_redemptions" USING btree ("email");
  CREATE INDEX "voucher_redemptions_status_idx" ON "voucher_redemptions" USING btree ("status");
  CREATE INDEX "voucher_redemptions_held_at_idx" ON "voucher_redemptions" USING btree ("held_at");
  CREATE INDEX "voucher_redemptions_completed_at_idx" ON "voucher_redemptions" USING btree ("completed_at");
  CREATE INDEX "voucher_redemptions_cancelled_at_idx" ON "voucher_redemptions" USING btree ("cancelled_at");
  CREATE INDEX "voucher_redemptions_updated_at_idx" ON "voucher_redemptions" USING btree ("updated_at");
  CREATE INDEX "voucher_redemptions_created_at_idx" ON "voucher_redemptions" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("brands_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_post_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("post_categories_id");
  CREATE INDEX "payload_locked_documents_rels_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("messages_id");
  CREATE INDEX "payload_locked_documents_rels_chat_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("chat_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_vouchers_id_idx" ON "payload_locked_documents_rels" USING btree ("vouchers_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("attributes_id");
  CREATE INDEX "payload_locked_documents_rels_attribute_values_id_idx" ON "payload_locked_documents_rels" USING btree ("attribute_values_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_locked_documents_rels_fragrance_notes_id_idx" ON "payload_locked_documents_rels" USING btree ("fragrance_notes_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_voucher_redemptions_id_idx" ON "payload_locked_documents_rels" USING btree ("voucher_redemptions_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_chat_profiles_id_idx" ON "payload_preferences_rels" USING btree ("chat_profiles_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_hero_sliders_order_idx" ON "site_settings_hero_sliders" USING btree ("_order");
  CREATE INDEX "site_settings_hero_sliders_parent_id_idx" ON "site_settings_hero_sliders" USING btree ("_parent_id");
  CREATE INDEX "site_settings_hero_sliders_image_desktop_idx" ON "site_settings_hero_sliders" USING btree ("image_desktop_id");
  CREATE INDEX "site_settings_hero_sliders_image_tablet_idx" ON "site_settings_hero_sliders" USING btree ("image_tablet_id");
  CREATE INDEX "site_settings_hero_sliders_image_mobile_idx" ON "site_settings_hero_sliders" USING btree ("image_mobile_id");
  CREATE INDEX "site_settings_header_nav_items_order_idx" ON "site_settings_header_nav_items" USING btree ("_order");
  CREATE INDEX "site_settings_header_nav_items_parent_id_idx" ON "site_settings_header_nav_items" USING btree ("_parent_id");
  CREATE INDEX "site_settings_header_header_logo_idx" ON "site_settings" USING btree ("header_logo_id");
  CREATE INDEX "site_settings_rels_order_idx" ON "site_settings_rels" USING btree ("order");
  CREATE INDEX "site_settings_rels_parent_idx" ON "site_settings_rels" USING btree ("parent_id");
  CREATE INDEX "site_settings_rels_path_idx" ON "site_settings_rels" USING btree ("path");
  CREATE INDEX "site_settings_rels_vouchers_id_idx" ON "site_settings_rels" USING btree ("vouchers_id");
  CREATE INDEX "about_page_values_order_idx" ON "about_page_values" USING btree ("_order");
  CREATE INDEX "about_page_values_parent_id_idx" ON "about_page_values" USING btree ("_parent_id");
  CREATE INDEX "about_page_hero_hero_image_idx" ON "about_page" USING btree ("hero_image_id");
  CREATE INDEX "about_page_story_story_image_idx" ON "about_page" USING btree ("story_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "brands" CASCADE;
  DROP TABLE "products_images" CASCADE;
  DROP TABLE "products_specifications" CASCADE;
  DROP TABLE "products_product_attributes" CASCADE;
  DROP TABLE "products_variants" CASCADE;
  DROP TABLE "products_display_location" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "post_categories" CASCADE;
  DROP TABLE "messages" CASCADE;
  DROP TABLE "chat_profiles_sessions" CASCADE;
  DROP TABLE "chat_profiles" CASCADE;
  DROP TABLE "vouchers" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "attributes" CASCADE;
  DROP TABLE "attributes_rels" CASCADE;
  DROP TABLE "attribute_values_aliases" CASCADE;
  DROP TABLE "attribute_values_metadata" CASCADE;
  DROP TABLE "attribute_values" CASCADE;
  DROP TABLE "carts_items" CASCADE;
  DROP TABLE "carts" CASCADE;
  DROP TABLE "fragrance_notes" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "voucher_redemptions" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_hero_sliders" CASCADE;
  DROP TABLE "site_settings_header_nav_items" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_rels" CASCADE;
  DROP TABLE "about_page_values" CASCADE;
  DROP TABLE "about_page" CASCADE;
  DROP TYPE "public"."enum_products_display_location";
  DROP TYPE "public"."enum_products_seo_status";
  DROP TYPE "public"."enum_products_product_type";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum_orders_payment_method";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_messages_sender";
  DROP TYPE "public"."enum_vouchers_status";
  DROP TYPE "public"."enum_vouchers_type";
  DROP TYPE "public"."enum_redirects_type";
  DROP TYPE "public"."enum_attributes_scope";
  DROP TYPE "public"."enum_attributes_value_type";
  DROP TYPE "public"."enum_attributes_display_style";
  DROP TYPE "public"."enum_carts_status";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_voucher_redemptions_status";`)
}
