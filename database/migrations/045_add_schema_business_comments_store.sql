-- ============================================================================
-- Migration 045: Add Business Semantics & Storefront Comments (deeplens_store)
-- Target Database: deeplens_store
-- Author: Naga (SQL / Data Specialist) - DeepLens Squad
-- Work Item Reference: ADO #1354 (Task 3: Idempotent Schema Business Comments)
-- Execution Model: Idempotent (COMMENT ON overwrites existing descriptions)
-- Relations Covered: 18 tables & views
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Relation: public."cart_items" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."cart_items" IS 'Line items contained within storefront shopping carts.';
COMMENT ON COLUMN public."cart_items"."id" IS 'Primary key identifier for cart_items.';
COMMENT ON COLUMN public."cart_items"."cart_id" IS 'Foreign key referencing carts.id.';
COMMENT ON COLUMN public."cart_items"."product_id" IS 'Product id attribute for cart_items.';
COMMENT ON COLUMN public."cart_items"."product_code" IS 'Product code attribute for cart_items.';
COMMENT ON COLUMN public."cart_items"."title" IS 'Display name or title of the cart_items entity.';
COMMENT ON COLUMN public."cart_items"."price" IS 'Monetary value in standard currency units (INR).';
COMMENT ON COLUMN public."cart_items"."original_price" IS 'Original price attribute for cart_items.';
COMMENT ON COLUMN public."cart_items"."quantity" IS 'Numeric quantity count.';
COMMENT ON COLUMN public."cart_items"."selected_color" IS 'Selected color attribute for cart_items.';
COMMENT ON COLUMN public."cart_items"."selected_size" IS 'Selected size attribute for cart_items.';
COMMENT ON COLUMN public."cart_items"."primary_image_uri" IS 'Primary image uri attribute for cart_items.';
COMMENT ON COLUMN public."cart_items"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."carts" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."carts" IS 'Active customer shopping carts for web storefront sessions.';
COMMENT ON COLUMN public."carts"."id" IS 'Primary key identifier for carts.';
COMMENT ON COLUMN public."carts"."device_id" IS 'Device id attribute for carts.';
COMMENT ON COLUMN public."carts"."share_token" IS 'Share token attribute for carts.';
COMMENT ON COLUMN public."carts"."total_amount" IS 'Total amount attribute for carts.';
COMMENT ON COLUMN public."carts"."total_mrp" IS 'Total mrp attribute for carts.';
COMMENT ON COLUMN public."carts"."total_discount" IS 'Total discount attribute for carts.';
COMMENT ON COLUMN public."carts"."item_count" IS 'Item count attribute for carts.';
COMMENT ON COLUMN public."carts"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."carts"."last_active_at" IS 'Last active at attribute for carts.';
COMMENT ON COLUMN public."carts"."expires_at" IS 'Expires at attribute for carts.';

-- ----------------------------------------------------------------------------
-- Relation: public."color_groups" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."color_groups" IS 'Color variant grouping linking related product variants under a unified visual palette on PDPs.';
COMMENT ON COLUMN public."color_groups"."id" IS 'Primary key identifier for color_groups.';
COMMENT ON COLUMN public."color_groups"."master_title" IS 'Master title attribute for color_groups.';
COMMENT ON COLUMN public."color_groups"."description" IS 'Descriptive text or notes regarding the color_groups record.';
COMMENT ON COLUMN public."color_groups"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."color_groups"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."media_assets" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."media_assets" IS 'Cached storefront media assets and CDN delivery URLs.';
COMMENT ON COLUMN public."media_assets"."id" IS 'Primary key identifier for media_assets.';
COMMENT ON COLUMN public."media_assets"."bucket_name" IS 'Bucket name attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."storage_key" IS 'Storage key attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."public_url" IS 'Public url attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."sha256_hash" IS 'Sha256 hash attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."byte_size" IS 'Byte size attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."mime_type" IS 'Mime type attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."media_type" IS 'Media type attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."width" IS 'Width attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."height" IS 'Height attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."duration_seconds" IS 'Duration seconds attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."aspect_ratio" IS 'Aspect ratio attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."owner_type" IS 'Owner type attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."owner_id" IS 'Owner id attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."derivative_type" IS 'Derivative type attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."parent_asset_id" IS 'Foreign key referencing media_assets.id.';
COMMENT ON COLUMN public."media_assets"."processing_status" IS 'Processing status attribute for media_assets.';
COMMENT ON COLUMN public."media_assets"."is_deleted" IS 'Boolean flag indicating whether the record has been soft-deleted.';
COMMENT ON COLUMN public."media_assets"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."media_assets"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."media_assets"."catalog_media_id" IS 'Catalog media id attribute for media_assets.';

-- ----------------------------------------------------------------------------
-- Relation: public."orders" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."orders" IS 'Storefront checkout orders captured directly from web and mobile shoppers.';
COMMENT ON COLUMN public."orders"."id" IS 'Primary key identifier for orders.';
COMMENT ON COLUMN public."orders"."order_number" IS 'Order number attribute for orders.';
COMMENT ON COLUMN public."orders"."device_id" IS 'Device id attribute for orders.';
COMMENT ON COLUMN public."orders"."customer_name" IS 'Customer name attribute for orders.';
COMMENT ON COLUMN public."orders"."customer_phone" IS 'Customer phone attribute for orders.';
COMMENT ON COLUMN public."orders"."customer_email" IS 'Customer email attribute for orders.';
COMMENT ON COLUMN public."orders"."shipping_address" IS 'Shipping address attribute for orders.';
COMMENT ON COLUMN public."orders"."total_amount" IS 'Total amount attribute for orders.';
COMMENT ON COLUMN public."orders"."payment_status" IS 'Payment status attribute for orders.';
COMMENT ON COLUMN public."orders"."order_status" IS 'Order status attribute for orders.';
COMMENT ON COLUMN public."orders"."items" IS 'Items attribute for orders.';
COMMENT ON COLUMN public."orders"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."orders"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."product_audits" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product_audits" IS 'Storefront product view, click, and interaction audit log.';
COMMENT ON COLUMN public."product_audits"."id" IS 'Primary key identifier for product_audits.';
COMMENT ON COLUMN public."product_audits"."product_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."product_audits"."action_type" IS 'Action type attribute for product_audits.';
COMMENT ON COLUMN public."product_audits"."field_name" IS 'Field name attribute for product_audits.';
COMMENT ON COLUMN public."product_audits"."old_value" IS 'Old value attribute for product_audits.';
COMMENT ON COLUMN public."product_audits"."new_value" IS 'New value attribute for product_audits.';
COMMENT ON COLUMN public."product_audits"."author_email" IS 'Author email attribute for product_audits.';
COMMENT ON COLUMN public."product_audits"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."product_waitlists" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product_waitlists" IS 'Customer out-of-stock waitlist requests with notification triggers.';
COMMENT ON COLUMN public."product_waitlists"."id" IS 'Primary key identifier for product_waitlists.';
COMMENT ON COLUMN public."product_waitlists"."product_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."product_waitlists"."customer_id" IS 'Customer id attribute for product_waitlists.';
COMMENT ON COLUMN public."product_waitlists"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."products" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."products" IS 'Canonical apparel and saree catalog registry.';
COMMENT ON COLUMN public."products"."id" IS 'Master product primary key.';
COMMENT ON COLUMN public."products"."vayyari_product_id" IS 'Vayyari product id attribute for products.';
COMMENT ON COLUMN public."products"."product_code" IS 'Product code attribute for products.';
COMMENT ON COLUMN public."products"."title" IS 'Merchandising title (e.g. `"Pure Katan Silk Banarasi Saree"`).';
COMMENT ON COLUMN public."products"."description" IS 'Rich product copy and draping details.';
COMMENT ON COLUMN public."products"."category_name" IS 'Category name attribute for products.';
COMMENT ON COLUMN public."products"."fabric" IS 'Primary material (e.g., `''Katan Silk''`, `''Organza''`, `''Georgette''`).';
COMMENT ON COLUMN public."products"."base_cost" IS 'Base cost attribute for products.';
COMMENT ON COLUMN public."products"."mrp" IS 'Mrp attribute for products.';
COMMENT ON COLUMN public."products"."sale_price" IS 'Sale price attribute for products.';
COMMENT ON COLUMN public."products"."lifecycle_status" IS 'Lifecycle status attribute for products.';
COMMENT ON COLUMN public."products"."stock_quantity" IS 'Stock quantity attribute for products.';
COMMENT ON COLUMN public."products"."color_group_id" IS 'Foreign key referencing color_groups.id.';
COMMENT ON COLUMN public."products"."colorway_name" IS 'Colorway name attribute for products.';
COMMENT ON COLUMN public."products"."color_hex" IS 'Color hex attribute for products.';
COMMENT ON COLUMN public."products"."swatch_template" IS 'Swatch template attribute for products.';
COMMENT ON COLUMN public."products"."media_order" IS 'Media order attribute for products.';
COMMENT ON COLUMN public."products"."tags" IS 'Tags attribute for products.';
COMMENT ON COLUMN public."products"."is_published" IS 'Indicates availability on downstream Storefront.';
COMMENT ON COLUMN public."products"."published_at" IS 'Published at attribute for products.';
COMMENT ON COLUMN public."products"."created_at" IS 'Ingestion timestamp.';
COMMENT ON COLUMN public."products"."updated_at" IS 'Attribute modification timestamp.';
COMMENT ON COLUMN public."products"."color_groups" IS 'Color groups attribute for products.';
COMMENT ON COLUMN public."products"."parent_catalog_id" IS 'Parent catalog id attribute for products.';
COMMENT ON COLUMN public."products"."catalog_color_group_id" IS 'Catalog color group id attribute for products.';
COMMENT ON COLUMN public."products"."parent_product_code" IS 'Parent product code attribute for products.';
COMMENT ON COLUMN public."products"."previous_lifecycle_status" IS 'Previous lifecycle status attribute for products.';
COMMENT ON COLUMN public."products"."take_down_expires_at" IS 'Take down expires at attribute for products.';
COMMENT ON COLUMN public."products"."is_re_evaluation_pending" IS 'Is re evaluation pending attribute for products.';
COMMENT ON COLUMN public."products"."skus" IS 'Skus attribute for products.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_customer_sessions" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_customer_sessions" IS 'Active authenticated storefront customer browser and mobile sessions.';
COMMENT ON COLUMN public."store_customer_sessions"."session_token" IS 'Primary key identifier for store_customer_sessions.';
COMMENT ON COLUMN public."store_customer_sessions"."user_id" IS 'Foreign key referencing store_customers.id.';
COMMENT ON COLUMN public."store_customer_sessions"."phone" IS 'Contact telephone number (E.164 formatted with country prefix).';
COMMENT ON COLUMN public."store_customer_sessions"."device_id" IS 'Device id attribute for store_customer_sessions.';
COMMENT ON COLUMN public."store_customer_sessions"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."store_customer_sessions"."expires_at" IS 'Expires at attribute for store_customer_sessions.';
COMMENT ON COLUMN public."store_customer_sessions"."last_active_at" IS 'Last active at attribute for store_customer_sessions.';
COMMENT ON COLUMN public."store_customer_sessions"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_customers" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_customers" IS 'Registered and anonymous storefront customer accounts.';
COMMENT ON COLUMN public."store_customers"."id" IS 'Primary key identifier for store_customers.';
COMMENT ON COLUMN public."store_customers"."phone" IS 'Contact telephone number (E.164 formatted with country prefix).';
COMMENT ON COLUMN public."store_customers"."full_name" IS 'Full name attribute for store_customers.';
COMMENT ON COLUMN public."store_customers"."email" IS 'Contact electronic mail address.';
COMMENT ON COLUMN public."store_customers"."default_address" IS 'Default address attribute for store_customers.';
COMMENT ON COLUMN public."store_customers"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."store_customers"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_devices" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_devices" IS 'Client hardware profiling and behavioral identity clustering.';
COMMENT ON COLUMN public."store_devices"."device_id" IS 'Primary device identifier (UUID or hardware fingerprint).';
COMMENT ON COLUMN public."store_devices"."fingerprint_hash" IS 'Canvas/audio hardware fingerprint hash.';
COMMENT ON COLUMN public."store_devices"."platform" IS 'Client operating system/platform: `''web''`, `''ios''`, `''android''`.';
COMMENT ON COLUMN public."store_devices"."os" IS 'OS version (e.g. `''iOS 18.1''`, `''Windows 11''`).';
COMMENT ON COLUMN public."store_devices"."model" IS 'Model attribute for store_devices.';
COMMENT ON COLUMN public."store_devices"."browser" IS 'User agent browser (e.g. `''Mobile Safari''`).';
COMMENT ON COLUMN public."store_devices"."screen_resolution" IS 'Screen dimensions (e.g. `''390x844''`).';
COMMENT ON COLUMN public."store_devices"."first_seen_at" IS 'Initial visit timestamp.';
COMMENT ON COLUMN public."store_devices"."last_seen_at" IS 'Most recent interaction timestamp.';
COMMENT ON COLUMN public."store_devices"."last_ip" IS 'Last ip attribute for store_devices.';
COMMENT ON COLUMN public."store_devices"."last_user_id" IS 'Last user id attribute for store_devices.';
COMMENT ON COLUMN public."store_devices"."total_events" IS 'Cumulative telemetry signals recorded.';
COMMENT ON COLUMN public."store_devices"."metadata" IS 'Arbitrary JSON metadata and dynamic properties.';
COMMENT ON COLUMN public."store_devices"."primary_user_id" IS 'Verified customer identifier upon login.';
COMMENT ON COLUMN public."store_devices"."is_identified" IS 'True when authenticated and linked to a verified customer phone number.';
COMMENT ON COLUMN public."store_devices"."household_cluster_id" IS 'Household cluster id attribute for store_devices.';
COMMENT ON COLUMN public."store_devices"."total_sessions" IS 'Distinct user browsing sessions.';
COMMENT ON COLUMN public."store_devices"."total_orders" IS 'Cumulative orders placed by this device.';
COMMENT ON COLUMN public."store_devices"."lifetime_value" IS 'Net customer revenue generated.';
COMMENT ON COLUMN public."store_devices"."taste_profile" IS 'Algorithmic preference weights (e.g. favorite fabrics, color families).';

-- ----------------------------------------------------------------------------
-- Relation: public."store_identity_links" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_identity_links" IS 'Customer identity link associations linking device UUIDs to verified phone numbers.';
COMMENT ON COLUMN public."store_identity_links"."id" IS 'Primary key identifier for store_identity_links.';
COMMENT ON COLUMN public."store_identity_links"."device_id" IS 'Foreign key referencing store_devices.device_id.';
COMMENT ON COLUMN public."store_identity_links"."user_id" IS 'Identifier of the associated user account.';
COMMENT ON COLUMN public."store_identity_links"."confidence_score" IS 'Confidence score attribute for store_identity_links.';
COMMENT ON COLUMN public."store_identity_links"."link_source" IS 'Link source attribute for store_identity_links.';
COMMENT ON COLUMN public."store_identity_links"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."store_identity_links"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."store_identity_links"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_otp_requests" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_otp_requests" IS 'One-Time Password (OTP) verification tokens and rate limiting for phone login.';
COMMENT ON COLUMN public."store_otp_requests"."id" IS 'Primary key identifier for store_otp_requests.';
COMMENT ON COLUMN public."store_otp_requests"."phone" IS 'Contact telephone number (E.164 formatted with country prefix).';
COMMENT ON COLUMN public."store_otp_requests"."device_id" IS 'Device id attribute for store_otp_requests.';
COMMENT ON COLUMN public."store_otp_requests"."otp_hash" IS 'Otp hash attribute for store_otp_requests.';
COMMENT ON COLUMN public."store_otp_requests"."salt" IS 'Salt attribute for store_otp_requests.';
COMMENT ON COLUMN public."store_otp_requests"."attempts_count" IS 'Attempts count attribute for store_otp_requests.';
COMMENT ON COLUMN public."store_otp_requests"."is_verified" IS 'Is verified attribute for store_otp_requests.';
COMMENT ON COLUMN public."store_otp_requests"."expires_at" IS 'Expires at attribute for store_otp_requests.';
COMMENT ON COLUMN public."store_otp_requests"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_session_summaries" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_session_summaries" IS 'Aggregated session duration, pageview count, and conversion funnel metrics.';
COMMENT ON COLUMN public."store_session_summaries"."session_id" IS 'Primary key identifier for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."device_id" IS 'Foreign key referencing store_devices.device_id.';
COMMENT ON COLUMN public."store_session_summaries"."user_id" IS 'Identifier of the associated user account.';
COMMENT ON COLUMN public."store_session_summaries"."start_time" IS 'Start time attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."end_time" IS 'End time attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."duration_seconds" IS 'Duration seconds attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."landing_page" IS 'Landing page attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."exit_page" IS 'Exit page attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."utm_source" IS 'Utm source attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."utm_campaign" IS 'Utm campaign attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."total_page_views" IS 'Total page views attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."products_viewed" IS 'Products viewed attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."swatches_explored" IS 'Swatches explored attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."bag_additions" IS 'Bag additions attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."reached_checkout" IS 'Reached checkout attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."converted" IS 'Converted attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."order_id" IS 'Order id attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."session_journey" IS 'Session journey attribute for store_session_summaries.';
COMMENT ON COLUMN public."store_session_summaries"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_telemetry_hourly_metrics" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_telemetry_hourly_metrics" IS '6-hour aggregated IST rollups for business observability.';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."bucket_hour" IS 'Floor of the hour in Indian Standard Time (IST).';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."hour_of_day_ist" IS 'Hour index in IST (0 to 23) for diurnal heatmaps.';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."day_of_week_ist" IS 'Day of week index (0=Sunday to 6=Saturday).';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."active_devices" IS 'Count of unique active device IDs in this hour.';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."active_users" IS 'Count of authenticated customer accounts active.';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."total_events" IS 'Cumulative clickstream signals ingested.';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."total_sessions" IS 'Active browsing sessions during the hour.';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."platform_breakdown" IS 'JSON breakdown of events by device platform (`{"web": 450, "mobile_web": 820}`).';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."created_at" IS 'Aggregation computation timestamp.';
COMMENT ON COLUMN public."store_telemetry_hourly_metrics"."updated_at" IS 'Last rollup update timestamp.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_telemetry_signals" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_telemetry_signals" IS 'Raw high-frequency telemetry event stream capturing client-side interactions.';
COMMENT ON COLUMN public."store_telemetry_signals"."id" IS 'Primary key identifier for store_telemetry_signals.';
COMMENT ON COLUMN public."store_telemetry_signals"."device_id" IS 'Foreign key referencing store_devices.device_id.';
COMMENT ON COLUMN public."store_telemetry_signals"."session_id" IS 'Session id attribute for store_telemetry_signals.';
COMMENT ON COLUMN public."store_telemetry_signals"."user_id" IS 'Identifier of the associated user account.';
COMMENT ON COLUMN public."store_telemetry_signals"."signal_type" IS 'Signal type attribute for store_telemetry_signals.';
COMMENT ON COLUMN public."store_telemetry_signals"."properties" IS 'Arbitrary JSON metadata and dynamic properties.';
COMMENT ON COLUMN public."store_telemetry_signals"."client_timestamp" IS 'Client timestamp attribute for store_telemetry_signals.';
COMMENT ON COLUMN public."store_telemetry_signals"."server_timestamp" IS 'Server timestamp attribute for store_telemetry_signals.';
COMMENT ON COLUMN public."store_telemetry_signals"."ip" IS 'Ip attribute for store_telemetry_signals.';

-- ----------------------------------------------------------------------------
-- Relation: public."v_media_storage_summary" (VIEW)
-- ----------------------------------------------------------------------------
COMMENT ON VIEW public."v_media_storage_summary" IS 'Storefront view summarizing media storage usage and asset counts.';
COMMENT ON COLUMN public."v_media_storage_summary"."owner_type" IS 'Owner type attribute for v_media_storage_summary.';
COMMENT ON COLUMN public."v_media_storage_summary"."derivative_type" IS 'Derivative type attribute for v_media_storage_summary.';
COMMENT ON COLUMN public."v_media_storage_summary"."asset_count" IS 'Asset count attribute for v_media_storage_summary.';
COMMENT ON COLUMN public."v_media_storage_summary"."total_bytes" IS 'Total bytes attribute for v_media_storage_summary.';
COMMENT ON COLUMN public."v_media_storage_summary"."total_mb" IS 'Total mb attribute for v_media_storage_summary.';

-- ----------------------------------------------------------------------------
-- Relation: public."wishlists" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."wishlists" IS 'Customer saved wishlist items.';
COMMENT ON COLUMN public."wishlists"."id" IS 'Primary key identifier for wishlists.';
COMMENT ON COLUMN public."wishlists"."device_id" IS 'Device id attribute for wishlists.';
COMMENT ON COLUMN public."wishlists"."product_id" IS 'Product id attribute for wishlists.';
COMMENT ON COLUMN public."wishlists"."product_code" IS 'Product code attribute for wishlists.';
COMMENT ON COLUMN public."wishlists"."title" IS 'Display name or title of the wishlists entity.';
COMMENT ON COLUMN public."wishlists"."price" IS 'Monetary value in standard currency units (INR).';
COMMENT ON COLUMN public."wishlists"."primary_image_uri" IS 'Primary image uri attribute for wishlists.';
COMMENT ON COLUMN public."wishlists"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."wishlists"."expires_at" IS 'Expires at attribute for wishlists.';

COMMIT;
