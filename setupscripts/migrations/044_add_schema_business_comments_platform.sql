-- ============================================================================
-- Migration 044: Add Business Semantics & Schema Comments (deeplens_platform)
-- Target Database: deeplens_platform
-- Author: Naga (SQL / Data Specialist) - DeepLens Squad
-- Work Item Reference: ADO #1354 (Task 3: Idempotent Schema Business Comments)
-- Execution Model: Idempotent (COMMENT ON overwrites existing descriptions)
-- Relations Covered: 116 tables & views
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Relation: public."__EFMigrationsHistory" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."__EFMigrationsHistory" IS 'Entity Framework Core migration ledger recording executed database schema migrations.';
COMMENT ON COLUMN public."__EFMigrationsHistory"."migration_id" IS 'Primary key identifier for __EFMigrationsHistory.';
COMMENT ON COLUMN public."__EFMigrationsHistory"."product_version" IS 'Product version attribute for __EFMigrationsHistory.';

-- ----------------------------------------------------------------------------
-- Relation: public."api_usage_logs" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."api_usage_logs" IS 'Inbound API request logging tracking endpoint latency, IP address, and status codes.';
COMMENT ON COLUMN public."api_usage_logs"."id" IS 'Primary key identifier for api_usage_logs.';
COMMENT ON COLUMN public."api_usage_logs"."tenant_id" IS 'Multi-tenant isolation identifier.';
COMMENT ON COLUMN public."api_usage_logs"."endpoint" IS 'Endpoint attribute for api_usage_logs.';
COMMENT ON COLUMN public."api_usage_logs"."method" IS 'Method attribute for api_usage_logs.';
COMMENT ON COLUMN public."api_usage_logs"."status_code" IS 'Status code attribute for api_usage_logs.';
COMMENT ON COLUMN public."api_usage_logs"."response_time_ms" IS 'Response time ms attribute for api_usage_logs.';
COMMENT ON COLUMN public."api_usage_logs"."user_id" IS 'Identifier of the associated user account.';
COMMENT ON COLUMN public."api_usage_logs"."timestamp" IS 'Timestamp attribute for api_usage_logs.';
COMMENT ON COLUMN public."api_usage_logs"."metadata" IS 'Arbitrary JSON metadata and dynamic properties.';

-- ----------------------------------------------------------------------------
-- Relation: public."app_settings" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."app_settings" IS 'Global application key-value configuration registry for platform services.';
COMMENT ON COLUMN public."app_settings"."key" IS 'Primary key identifier for app_settings.';
COMMENT ON COLUMN public."app_settings"."value" IS 'Value attribute for app_settings.';
COMMENT ON COLUMN public."app_settings"."section" IS 'Section attribute for app_settings.';
COMMENT ON COLUMN public."app_settings"."label" IS 'Label attribute for app_settings.';
COMMENT ON COLUMN public."app_settings"."description" IS 'Descriptive text or notes regarding the app_settings record.';
COMMENT ON COLUMN public."app_settings"."is_secret" IS 'Is secret attribute for app_settings.';
COMMENT ON COLUMN public."app_settings"."data_type" IS 'Data type attribute for app_settings.';
COMMENT ON COLUMN public."app_settings"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."attachments" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."attachments" IS 'Centralized MinIO file asset registry tracking S3 buckets, object keys, and MIME types.';
COMMENT ON COLUMN public."attachments"."id" IS 'The unique ID used to reference this file in other tables';
COMMENT ON COLUMN public."attachments"."bucket_name" IS 'Bucket name attribute for attachments.';
COMMENT ON COLUMN public."attachments"."object_key" IS 'The full path/key inside the MinIO bucket';
COMMENT ON COLUMN public."attachments"."content_type" IS 'Content type attribute for attachments.';
COMMENT ON COLUMN public."attachments"."file_size_bytes" IS 'File size bytes attribute for attachments.';
COMMENT ON COLUMN public."attachments"."original_filename" IS 'Original filename attribute for attachments.';
COMMENT ON COLUMN public."attachments"."metadata" IS 'Arbitrary JSON metadata and dynamic properties.';
COMMENT ON COLUMN public."attachments"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."attachments"."category" IS 'Category attribute for attachments.';
COMMENT ON COLUMN public."attachments"."subcategory" IS 'Subcategory attribute for attachments.';

-- ----------------------------------------------------------------------------
-- Relation: public."campaign_wabroadcast" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."campaign_wabroadcast" IS 'Customer opt-in governance for WhatsApp promotional campaigns.';
COMMENT ON COLUMN public."campaign_wabroadcast"."id" IS 'Subscription record identifier.';
COMMENT ON COLUMN public."campaign_wabroadcast"."customer_id" IS 'FK referencing `customers.id`.';
COMMENT ON COLUMN public."campaign_wabroadcast"."channel_id" IS 'FK referencing `comm_broadcast_channels.id`.';
COMMENT ON COLUMN public."campaign_wabroadcast"."status" IS 'Consent state: `''OPTED_IN''` vs `''OPTED_OUT''`.';
COMMENT ON COLUMN public."campaign_wabroadcast"."opted_in_at" IS 'Verification timestamp of opt-in consent.';
COMMENT ON COLUMN public."campaign_wabroadcast"."opted_out_at" IS 'Timestamp when customer revoked consent.';
COMMENT ON COLUMN public."campaign_wabroadcast"."notes" IS 'Operator remarks (e.g. `"Subscribed via Storefront checkout checkbox"`).';
COMMENT ON COLUMN public."campaign_wabroadcast"."created_at" IS 'Subscription record creation timestamp.';
COMMENT ON COLUMN public."campaign_wabroadcast"."updated_at" IS 'Consent status update timestamp.';

-- ----------------------------------------------------------------------------
-- Relation: public."categories" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."categories" IS 'Taxonomy category hierarchy tree organizing products into primary and secondary classifications.';
COMMENT ON COLUMN public."categories"."id" IS 'Primary key identifier for categories.';
COMMENT ON COLUMN public."categories"."name" IS 'Display name or title of the categories entity.';
COMMENT ON COLUMN public."categories"."slug" IS 'Slug attribute for categories.';
COMMENT ON COLUMN public."categories"."metadata_json" IS 'Metadata json attribute for categories.';
COMMENT ON COLUMN public."categories"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."categories"."icon_name" IS 'Icon name attribute for categories.';
COMMENT ON COLUMN public."categories"."classification_keywords" IS 'Classification keywords attribute for categories.';

-- ----------------------------------------------------------------------------
-- Relation: public."category" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."category" IS 'Legacy singular category master table; maintained for backward compatibility.';
COMMENT ON COLUMN public."category"."id" IS 'Primary key identifier for category.';
COMMENT ON COLUMN public."category"."name" IS 'Display name or title of the category entity.';
COMMENT ON COLUMN public."category"."slug" IS 'Slug attribute for category.';
COMMENT ON COLUMN public."category"."metadata_json" IS 'Metadata json attribute for category.';

-- ----------------------------------------------------------------------------
-- Relation: public."comm_broadcast_channels" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comm_broadcast_channels" IS 'Broadcast communication channel definitions and rate limiting quotas.';
COMMENT ON COLUMN public."comm_broadcast_channels"."id" IS 'Primary key identifier for comm_broadcast_channels.';
COMMENT ON COLUMN public."comm_broadcast_channels"."name" IS 'Display name or title of the comm_broadcast_channels entity.';
COMMENT ON COLUMN public."comm_broadcast_channels"."description" IS 'Descriptive text or notes regarding the comm_broadcast_channels record.';
COMMENT ON COLUMN public."comm_broadcast_channels"."channel_type" IS 'Channel type attribute for comm_broadcast_channels.';
COMMENT ON COLUMN public."comm_broadcast_channels"."metadata" IS 'Arbitrary JSON metadata and dynamic properties.';
COMMENT ON COLUMN public."comm_broadcast_channels"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."comm_broadcast_channels"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."comm_broadcast_purposes" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comm_broadcast_purposes" IS 'Business purpose categories for marketing broadcasts (promotional, transactional, alert).';
COMMENT ON COLUMN public."comm_broadcast_purposes"."id" IS 'Primary key identifier for comm_broadcast_purposes.';
COMMENT ON COLUMN public."comm_broadcast_purposes"."purpose_key" IS 'Purpose key attribute for comm_broadcast_purposes.';
COMMENT ON COLUMN public."comm_broadcast_purposes"."channel_id" IS 'Foreign key referencing comm_broadcast_channels.id.';
COMMENT ON COLUMN public."comm_broadcast_purposes"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."comm_campaign_variables" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comm_campaign_variables" IS 'Dynamic parameter placeholders used for WhatsApp template personalization.';
COMMENT ON COLUMN public."comm_campaign_variables"."purpose_key" IS 'Primary key identifier for comm_campaign_variables.';
COMMENT ON COLUMN public."comm_campaign_variables"."variable_key" IS 'Primary key identifier for comm_campaign_variables.';
COMMENT ON COLUMN public."comm_campaign_variables"."variable_value" IS 'Variable value attribute for comm_campaign_variables.';
COMMENT ON COLUMN public."comm_campaign_variables"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."comm_campaign_variables"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."comm_channel_subscriptions" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comm_channel_subscriptions" IS 'Customer subscription opt-in status per communication channel.';
COMMENT ON COLUMN public."comm_channel_subscriptions"."id" IS 'Primary key identifier for comm_channel_subscriptions.';
COMMENT ON COLUMN public."comm_channel_subscriptions"."channel_id" IS 'Foreign key referencing comm_broadcast_channels.id.';
COMMENT ON COLUMN public."comm_channel_subscriptions"."customer_id" IS 'Customer id attribute for comm_channel_subscriptions.';
COMMENT ON COLUMN public."comm_channel_subscriptions"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."comm_channel_types" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comm_channel_types" IS 'Supported channel type definitions (WhatsApp, SMS, Email, Push).';
COMMENT ON COLUMN public."comm_channel_types"."type_key" IS 'Primary key identifier for comm_channel_types.';
COMMENT ON COLUMN public."comm_channel_types"."name" IS 'Display name or title of the comm_channel_types entity.';
COMMENT ON COLUMN public."comm_channel_types"."member_limit" IS 'Member limit attribute for comm_channel_types.';
COMMENT ON COLUMN public."comm_channel_types"."description" IS 'Descriptive text or notes regarding the comm_channel_types record.';

-- ----------------------------------------------------------------------------
-- Relation: public."comm_purpose_customer_steps" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comm_purpose_customer_steps" IS 'Tracking individual customer progress through automated communication drip steps.';
COMMENT ON COLUMN public."comm_purpose_customer_steps"."id" IS 'Primary key identifier for comm_purpose_customer_steps.';
COMMENT ON COLUMN public."comm_purpose_customer_steps"."purpose_key" IS 'Foreign key referencing comm_purposes.purpose_key.';
COMMENT ON COLUMN public."comm_purpose_customer_steps"."customer_id" IS 'Foreign key referencing customers.id.';
COMMENT ON COLUMN public."comm_purpose_customer_steps"."step_id" IS 'Foreign key referencing comm_purpose_steps.id.';
COMMENT ON COLUMN public."comm_purpose_customer_steps"."status" IS 'Lifecycle status indicator for comm_purpose_customer_steps.';
COMMENT ON COLUMN public."comm_purpose_customer_steps"."completed_at" IS 'Completed at attribute for comm_purpose_customer_steps.';
COMMENT ON COLUMN public."comm_purpose_customer_steps"."sent_message" IS 'Sent message attribute for comm_purpose_customer_steps.';
COMMENT ON COLUMN public."comm_purpose_customer_steps"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."comm_purpose_customer_steps"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."comm_purpose_steps" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comm_purpose_steps" IS 'Sequential drip campaign step configurations and delay triggers.';
COMMENT ON COLUMN public."comm_purpose_steps"."id" IS 'Primary key identifier for comm_purpose_steps.';
COMMENT ON COLUMN public."comm_purpose_steps"."purpose_key" IS 'Foreign key referencing comm_purposes.purpose_key.';
COMMENT ON COLUMN public."comm_purpose_steps"."step_number" IS 'Step number attribute for comm_purpose_steps.';
COMMENT ON COLUMN public."comm_purpose_steps"."description" IS 'Descriptive text or notes regarding the comm_purpose_steps record.';
COMMENT ON COLUMN public."comm_purpose_steps"."action" IS 'Action attribute for comm_purpose_steps.';
COMMENT ON COLUMN public."comm_purpose_steps"."message_templates" IS 'Message templates attribute for comm_purpose_steps.';
COMMENT ON COLUMN public."comm_purpose_steps"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."comm_purpose_steps"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."comm_purpose_subscriptions" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comm_purpose_subscriptions" IS 'Customer subscription preferences for specific communication campaign purposes.';
COMMENT ON COLUMN public."comm_purpose_subscriptions"."id" IS 'Primary key identifier for comm_purpose_subscriptions.';
COMMENT ON COLUMN public."comm_purpose_subscriptions"."purpose_key" IS 'Foreign key referencing comm_purposes.purpose_key.';
COMMENT ON COLUMN public."comm_purpose_subscriptions"."customer_id" IS 'Customer id attribute for comm_purpose_subscriptions.';
COMMENT ON COLUMN public."comm_purpose_subscriptions"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."comm_purposes" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comm_purposes" IS 'High-level communication journey definitions (e.g. Abandoned Cart Recovery).';
COMMENT ON COLUMN public."comm_purposes"."purpose_key" IS 'Primary key identifier for comm_purposes.';
COMMENT ON COLUMN public."comm_purposes"."name" IS 'Display name or title of the comm_purposes entity.';
COMMENT ON COLUMN public."comm_purposes"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."comments" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."comments" IS 'Internal operator notes and conversation comments attached to orders or customers.';
COMMENT ON COLUMN public."comments"."id" IS 'Primary key identifier for comments.';
COMMENT ON COLUMN public."comments"."entity_type" IS 'Entity type attribute for comments.';
COMMENT ON COLUMN public."comments"."entity_id" IS 'Entity id attribute for comments.';
COMMENT ON COLUMN public."comments"."author_id" IS 'Author id attribute for comments.';
COMMENT ON COLUMN public."comments"."content" IS 'Content attribute for comments.';
COMMENT ON COLUMN public."comments"."attachment_ids" IS 'Array of UUIDs referring to the centralized attachments table';
COMMENT ON COLUMN public."comments"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."comments"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."competitor_videos" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."competitor_videos" IS 'Harvested social posts, viral reels, and engagement metrics.';
COMMENT ON COLUMN public."competitor_videos"."id" IS 'Video record unique identifier.';
COMMENT ON COLUMN public."competitor_videos"."watchlist_id" IS 'FK referencing `competitor_watchlist.id`.';
COMMENT ON COLUMN public."competitor_videos"."platform" IS 'Social network: `''instagram''`, `''youtube''`.';
COMMENT ON COLUMN public."competitor_videos"."platform_video_id" IS 'External reel/video ID (e.g. Instagram shortcode).';
COMMENT ON COLUMN public."competitor_videos"."url" IS 'Public post permalink.';
COMMENT ON COLUMN public."competitor_videos"."title" IS 'Video title or headline.';
COMMENT ON COLUMN public."competitor_videos"."description" IS 'Full caption text, hashtags, and price mentions.';
COMMENT ON COLUMN public."competitor_videos"."posted_at" IS 'Post publication timestamp on social network.';
COMMENT ON COLUMN public."competitor_videos"."like_count" IS 'Cumulative likes.';
COMMENT ON COLUMN public."competitor_videos"."comment_count" IS 'Cumulative comments.';
COMMENT ON COLUMN public."competitor_videos"."share_count" IS 'Cumulative shares.';
COMMENT ON COLUMN public."competitor_videos"."repost_count" IS 'Cumulative reposts.';
COMMENT ON COLUMN public."competitor_videos"."media_type" IS 'Asset format: `''reel''`, `''video''`, `''carousel''`, `''image''`.';
COMMENT ON COLUMN public."competitor_videos"."thumbnail_url" IS 'Remote thumbnail link.';
COMMENT ON COLUMN public."competitor_videos"."media_url" IS 'Remote video stream URL.';
COMMENT ON COLUMN public."competitor_videos"."is_reel" IS 'Is reel attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."category" IS 'Category attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."raw_metadata" IS 'Raw metadata attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."tagged_sku_ids" IS 'Tagged sku ids attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."ai_suggested_sku_ids" IS 'Ai suggested sku ids attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."tagging_confidence" IS 'Tagging confidence attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."tagging_notes" IS 'Tagging notes attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."download_status" IS 'Archival state: `''pending''`, `''downloaded''`, `''failed''`.';
COMMENT ON COLUMN public."competitor_videos"."download_error" IS 'Download error attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."downloaded_at" IS 'Downloaded at attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."scraped_at" IS 'Ingestion timestamp.';
COMMENT ON COLUMN public."competitor_videos"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."competitor_videos"."storage_path" IS 'MinIO archived video MP4 file path.';
COMMENT ON COLUMN public."competitor_videos"."product_id" IS 'DeepLens catalog product linked for sourcing.';
COMMENT ON COLUMN public."competitor_videos"."youtube_video_id" IS 'Youtube video id attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."youtube_url" IS 'Youtube url attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."youtube_sync_status" IS 'Youtube sync status attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."scheduled_publish_time" IS 'Scheduled publish time attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."status" IS 'Lifecycle status indicator for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."suspend_until" IS 'Suspend until attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."last_reviewed_at" IS 'Last reviewed at attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."collaborators" IS 'List of co-creator usernames tagged on post.';
COMMENT ON COLUMN public."competitor_videos"."collab_curation_status" IS 'Review state of collaborators: `''pending''`, `''approved''`.';
COMMENT ON COLUMN public."competitor_videos"."target_collab_accounts" IS 'Target collab accounts attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."is_boosted" IS 'True if post exhibits paid ad boosting markers.';
COMMENT ON COLUMN public."competitor_videos"."boosted_metrics" IS 'Boosted metrics attribute for competitor_videos.';
COMMENT ON COLUMN public."competitor_videos"."deleted_on_instagram" IS 'Flags if post was removed by the creator.';

-- ----------------------------------------------------------------------------
-- Relation: public."competitor_watchlist" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."competitor_watchlist" IS 'Social intelligence target accounts across Instagram and YouTube.';
COMMENT ON COLUMN public."competitor_watchlist"."id" IS 'Profile unique identifier.';
COMMENT ON COLUMN public."competitor_watchlist"."platform" IS 'Target network: `''instagram''` or `''youtube''`.';
COMMENT ON COLUMN public."competitor_watchlist"."username" IS 'Social account handle (e.g. `''competitor_sarees''`).';
COMMENT ON COLUMN public."competitor_watchlist"."display_name" IS 'Public brand profile name.';
COMMENT ON COLUMN public."competitor_watchlist"."profile_pic_url" IS 'External CDN profile picture link.';
COMMENT ON COLUMN public."competitor_watchlist"."bio" IS 'Bio attribute for competitor_watchlist.';
COMMENT ON COLUMN public."competitor_watchlist"."enabled" IS 'Enabled attribute for competitor_watchlist.';
COMMENT ON COLUMN public."competitor_watchlist"."follower_count" IS 'Social audience size.';
COMMENT ON COLUMN public."competitor_watchlist"."following_count" IS 'Following count.';
COMMENT ON COLUMN public."competitor_watchlist"."post_count" IS 'Published media count.';
COMMENT ON COLUMN public."competitor_watchlist"."last_scraped_at" IS 'Most recent successful crawl execution.';
COMMENT ON COLUMN public."competitor_watchlist"."created_at" IS 'Profile creation timestamp.';
COMMENT ON COLUMN public."competitor_watchlist"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."competitor_watchlist"."is_active" IS 'Active scraping status.';
COMMENT ON COLUMN public."competitor_watchlist"."external_id" IS 'Platform internal numeric account ID.';
COMMENT ON COLUMN public."competitor_watchlist"."is_data_deleted" IS 'Is data deleted attribute for competitor_watchlist.';
COMMENT ON COLUMN public."competitor_watchlist"."profile_pic_storage_path" IS 'MinIO archived profile avatar path.';
COMMENT ON COLUMN public."competitor_watchlist"."is_pinned" IS 'Spotlight profile pinned on analytics dashboard.';
COMMENT ON COLUMN public."competitor_watchlist"."profile_category" IS 'Profile category attribute for competitor_watchlist.';
COMMENT ON COLUMN public."competitor_watchlist"."is_competitor" IS 'True for business competitors; false for benchmark accounts.';
COMMENT ON COLUMN public."competitor_watchlist"."tracking_tier" IS 'Scraping priority: `''focus''`, `''vip''`, `''standard''`.';
COMMENT ON COLUMN public."competitor_watchlist"."competitor_niche" IS 'Competitor niche attribute for competitor_watchlist.';
COMMENT ON COLUMN public."competitor_watchlist"."tracking_frequency_hours" IS 'Scrape frequency in hours (e.g. 6, 12, 24).';
COMMENT ON COLUMN public."competitor_watchlist"."channel_type" IS 'Merchandising role: `''focus''`, `''benchmark''`, `''supplier''`.';
COMMENT ON COLUMN public."competitor_watchlist"."category_focus" IS 'Category focus attribute for competitor_watchlist.';
COMMENT ON COLUMN public."competitor_watchlist"."target_demography" IS 'Target demography attribute for competitor_watchlist.';
COMMENT ON COLUMN public."competitor_watchlist"."cadence_config" IS 'Automated posting and crawl frequency parameters.';

-- ----------------------------------------------------------------------------
-- Relation: public."copy_snippets" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."copy_snippets" IS 'Curated marketing copywriting snippets, emojis, and sales hooks for message creation.';
COMMENT ON COLUMN public."copy_snippets"."id" IS 'Primary key identifier for copy_snippets.';
COMMENT ON COLUMN public."copy_snippets"."label" IS 'Label attribute for copy_snippets.';
COMMENT ON COLUMN public."copy_snippets"."emoji" IS 'Emoji attribute for copy_snippets.';
COMMENT ON COLUMN public."copy_snippets"."color" IS 'Color attribute for copy_snippets.';
COMMENT ON COLUMN public."copy_snippets"."content" IS 'Content attribute for copy_snippets.';
COMMENT ON COLUMN public."copy_snippets"."sort_order" IS 'Numeric sequence index for UI presentation ordering.';
COMMENT ON COLUMN public."copy_snippets"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."copy_snippets"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."copy_snippets"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."country_codes" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."country_codes" IS 'ISO standard country codes and international dialing prefixes for customer phone localization.';
COMMENT ON COLUMN public."country_codes"."code" IS 'Primary key identifier for country_codes.';
COMMENT ON COLUMN public."country_codes"."name" IS 'Display name or title of the country_codes entity.';
COMMENT ON COLUMN public."country_codes"."dial_code" IS 'Dial code attribute for country_codes.';

-- ----------------------------------------------------------------------------
-- Relation: public."customer_addresses" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."customer_addresses" IS 'Multi-address directory for customer fulfillment.';
COMMENT ON COLUMN public."customer_addresses"."id" IS 'Address unique identifier.';
COMMENT ON COLUMN public."customer_addresses"."customer_id" IS 'FK referencing `customers.id` (`ON DELETE CASCADE`).';
COMMENT ON COLUMN public."customer_addresses"."name" IS 'Recipient name at delivery destination.';
COMMENT ON COLUMN public."customer_addresses"."phone" IS 'Contact phone for delivery driver.';
COMMENT ON COLUMN public."customer_addresses"."line1" IS 'Complete street address, house/flat number, landmark.';
COMMENT ON COLUMN public."customer_addresses"."pincode" IS '6-digit Indian postal code.';
COMMENT ON COLUMN public."customer_addresses"."is_default" IS 'True if this is the default address. Invariant: max 1 per customer.';
COMMENT ON COLUMN public."customer_addresses"."created_at" IS 'Address creation timestamp.';
COMMENT ON COLUMN public."customer_addresses"."updated_at" IS 'Last address update timestamp.';

-- ----------------------------------------------------------------------------
-- Relation: public."customer_languages" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."customer_languages" IS 'Customer language preference selections for localized WhatsApp communication.';
COMMENT ON COLUMN public."customer_languages"."customer_id" IS 'Primary key identifier for customer_languages.';
COMMENT ON COLUMN public."customer_languages"."language_code" IS 'Primary key identifier for customer_languages.';

-- ----------------------------------------------------------------------------
-- Relation: public."customer_languages_master" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."customer_languages_master" IS 'Master list of supported communication languages (Telugu, Hindi, Tamil, English).';
COMMENT ON COLUMN public."customer_languages_master"."code" IS 'Primary key identifier for customer_languages_master.';
COMMENT ON COLUMN public."customer_languages_master"."name" IS 'Display name or title of the customer_languages_master entity.';
COMMENT ON COLUMN public."customer_languages_master"."is_default" IS 'Is default attribute for customer_languages_master.';

-- ----------------------------------------------------------------------------
-- Relation: public."customers" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."customers" IS 'Unified customer and reseller profile registry.';
COMMENT ON COLUMN public."customers"."id" IS 'Canonical customer UUID.';
COMMENT ON COLUMN public."customers"."first_name" IS 'Customer given name.';
COMMENT ON COLUMN public."customers"."last_name" IS 'Customer family name.';
COMMENT ON COLUMN public."customers"."phone_number" IS 'Normalized E.164 phone number. Primary WhatsApp commerce key.';
COMMENT ON COLUMN public."customers"."instagram_id" IS 'Primary Instagram handle.';
COMMENT ON COLUMN public."customers"."email" IS 'Email address.';
COMMENT ON COLUMN public."customers"."notes" IS 'CRM operator notes and VIP buyer preferences.';
COMMENT ON COLUMN public."customers"."created_at" IS 'Account creation timestamp.';
COMMENT ON COLUMN public."customers"."updated_at" IS 'Last profile update timestamp.';
COMMENT ON COLUMN public."customers"."customer_id" IS 'Sequential integer customer code.';
COMMENT ON COLUMN public."customers"."referral_code" IS 'Unique 5-char hex referral code (e.g. `00A1F`).';
COMMENT ON COLUMN public."customers"."gender" IS 'Customer gender.';
COMMENT ON COLUMN public."customers"."is_archived" IS 'Deactivated or banned customer record.';
COMMENT ON COLUMN public."customers"."is_follower" IS 'True if verified follower of brand Instagram profile.';

-- ----------------------------------------------------------------------------
-- Relation: public."engagement_snapshots" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."engagement_snapshots" IS 'Time-series engagement snapshots (likes, comments, views) captured across posts.';
COMMENT ON COLUMN public."engagement_snapshots"."id" IS 'Primary key identifier for engagement_snapshots.';
COMMENT ON COLUMN public."engagement_snapshots"."video_id" IS 'Foreign key referencing competitor_videos.id.';
COMMENT ON COLUMN public."engagement_snapshots"."view_count" IS 'View count attribute for engagement_snapshots.';
COMMENT ON COLUMN public."engagement_snapshots"."like_count" IS 'Like count attribute for engagement_snapshots.';
COMMENT ON COLUMN public."engagement_snapshots"."comment_count" IS 'Comment count attribute for engagement_snapshots.';
COMMENT ON COLUMN public."engagement_snapshots"."share_count" IS 'Share count attribute for engagement_snapshots.';
COMMENT ON COLUMN public."engagement_snapshots"."repost_count" IS 'Repost count attribute for engagement_snapshots.';
COMMENT ON COLUMN public."engagement_snapshots"."video_age_hours" IS 'Video age hours attribute for engagement_snapshots.';
COMMENT ON COLUMN public."engagement_snapshots"."tracking_phase" IS 'Tracking phase attribute for engagement_snapshots.';
COMMENT ON COLUMN public."engagement_snapshots"."snapshot_at" IS 'Snapshot at attribute for engagement_snapshots.';

-- ----------------------------------------------------------------------------
-- Relation: public."entity_attachments" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."entity_attachments" IS 'Polymorphic attachment junction linking binary assets to arbitrary business entities.';
COMMENT ON COLUMN public."entity_attachments"."id" IS 'Primary key identifier for entity_attachments.';
COMMENT ON COLUMN public."entity_attachments"."attachment_id" IS 'Foreign key referencing attachments.id.';
COMMENT ON COLUMN public."entity_attachments"."entity_type" IS 'The name of the table or business entity (e.g., order, category)';
COMMENT ON COLUMN public."entity_attachments"."entity_id" IS 'The primary key of the related entity (stored as string for flexibility)';
COMMENT ON COLUMN public."entity_attachments"."tag" IS 'Tag attribute for entity_attachments.';
COMMENT ON COLUMN public."entity_attachments"."sort_order" IS 'Numeric sequence index for UI presentation ordering.';
COMMENT ON COLUMN public."entity_attachments"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."follower_snapshots" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."follower_snapshots" IS 'Daily follower count snapshots tracking competitor account growth velocity.';
COMMENT ON COLUMN public."follower_snapshots"."id" IS 'Primary key identifier for follower_snapshots.';
COMMENT ON COLUMN public."follower_snapshots"."watchlist_id" IS 'Foreign key referencing competitor_watchlist.id.';
COMMENT ON COLUMN public."follower_snapshots"."follower_count" IS 'Follower count attribute for follower_snapshots.';
COMMENT ON COLUMN public."follower_snapshots"."following_count" IS 'Following count attribute for follower_snapshots.';
COMMENT ON COLUMN public."follower_snapshots"."follower_following_ratio" IS 'Follower following ratio attribute for follower_snapshots.';
COMMENT ON COLUMN public."follower_snapshots"."engagement_rate" IS 'Engagement rate attribute for follower_snapshots.';
COMMENT ON COLUMN public."follower_snapshots"."snapshot_at" IS 'Snapshot at attribute for follower_snapshots.';

-- ----------------------------------------------------------------------------
-- Relation: public."image" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."image" IS 'Legacy image metadata table; superseded by centralized media and attachments.';
COMMENT ON COLUMN public."image"."id" IS 'Primary key identifier for image.';
COMMENT ON COLUMN public."image"."variant_id" IS 'Foreign key referencing product_variant.id.';
COMMENT ON COLUMN public."image"."product_id" IS 'Product id attribute for image.';
COMMENT ON COLUMN public."image"."color" IS 'Color attribute for image.';
COMMENT ON COLUMN public."image"."storage_path" IS 'Storage path attribute for image.';
COMMENT ON COLUMN public."image"."original_filename" IS 'Original filename attribute for image.';
COMMENT ON COLUMN public."image"."file_size_bytes" IS 'File size bytes attribute for image.';
COMMENT ON COLUMN public."image"."mime_type" IS 'Mime type attribute for image.';
COMMENT ON COLUMN public."image"."status" IS 'Lifecycle status indicator for image.';
COMMENT ON COLUMN public."image"."vector_id" IS 'Vector id attribute for image.';
COMMENT ON COLUMN public."image"."p_hash" IS 'P hash attribute for image.';
COMMENT ON COLUMN public."image"."is_default" IS 'Is default attribute for image.';
COMMENT ON COLUMN public."image"."quality_score" IS 'Quality score attribute for image.';
COMMENT ON COLUMN public."image"."features_extracted" IS 'Features extracted attribute for image.';
COMMENT ON COLUMN public."image"."indexed" IS 'Indexed attribute for image.';
COMMENT ON COLUMN public."image"."uploaded_at" IS 'Uploaded at attribute for image.';
COMMENT ON COLUMN public."image"."metadata_json" IS 'Metadata json attribute for image.';

-- ----------------------------------------------------------------------------
-- Relation: public."infisical_projects" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."infisical_projects" IS 'Infisical secret manager project references for environment isolation.';
COMMENT ON COLUMN public."infisical_projects"."id" IS 'Primary key identifier for infisical_projects.';
COMMENT ON COLUMN public."infisical_projects"."tenant_id" IS 'Multi-tenant isolation identifier.';
COMMENT ON COLUMN public."infisical_projects"."project_id" IS 'Project id attribute for infisical_projects.';
COMMENT ON COLUMN public."infisical_projects"."project_name" IS 'Project name attribute for infisical_projects.';
COMMENT ON COLUMN public."infisical_projects"."environment" IS 'Environment attribute for infisical_projects.';
COMMENT ON COLUMN public."infisical_projects"."client_id" IS 'Client id attribute for infisical_projects.';
COMMENT ON COLUMN public."infisical_projects"."client_secret_encrypted" IS 'Client secret encrypted attribute for infisical_projects.';
COMMENT ON COLUMN public."infisical_projects"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."infisical_projects"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."infisical_projects"."last_sync" IS 'Last sync attribute for infisical_projects.';

-- ----------------------------------------------------------------------------
-- Relation: public."infisical_secrets" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."infisical_secrets" IS 'Synced secret key-value references managed securely via Infisical vault.';
COMMENT ON COLUMN public."infisical_secrets"."id" IS 'Primary key identifier for infisical_secrets.';
COMMENT ON COLUMN public."infisical_secrets"."project_id" IS 'Foreign key referencing infisical_projects.id.';
COMMENT ON COLUMN public."infisical_secrets"."secret_key" IS 'Secret key attribute for infisical_secrets.';
COMMENT ON COLUMN public."infisical_secrets"."secret_version" IS 'Secret version attribute for infisical_secrets.';
COMMENT ON COLUMN public."infisical_secrets"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."infisical_secrets"."last_accessed" IS 'Last accessed attribute for infisical_secrets.';
COMMENT ON COLUMN public."infisical_secrets"."access_count" IS 'Access count attribute for infisical_secrets.';

-- ----------------------------------------------------------------------------
-- Relation: public."ingestion_meta" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."ingestion_meta" IS 'Metadata and watermark tracking for social media batch ingestion pipelines.';
COMMENT ON COLUMN public."ingestion_meta"."id" IS 'Primary key identifier for ingestion_meta.';
COMMENT ON COLUMN public."ingestion_meta"."key" IS 'Key attribute for ingestion_meta.';
COMMENT ON COLUMN public."ingestion_meta"."value" IS 'Value attribute for ingestion_meta.';
COMMENT ON COLUMN public."ingestion_meta"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."instagram_accounts" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."instagram_accounts" IS 'Managed Instagram bot and scraper account pool used for rotation and rate-limit evasion.';
COMMENT ON COLUMN public."instagram_accounts"."id" IS 'Primary key identifier for instagram_accounts.';
COMMENT ON COLUMN public."instagram_accounts"."platform" IS 'Platform attribute for instagram_accounts.';
COMMENT ON COLUMN public."instagram_accounts"."platform_account_id" IS 'Platform account id attribute for instagram_accounts.';
COMMENT ON COLUMN public."instagram_accounts"."username" IS 'Username attribute for instagram_accounts.';
COMMENT ON COLUMN public."instagram_accounts"."full_name" IS 'Full name attribute for instagram_accounts.';
COMMENT ON COLUMN public."instagram_accounts"."profile_picture_url" IS 'Profile picture url attribute for instagram_accounts.';
COMMENT ON COLUMN public."instagram_accounts"."first_seen_at" IS 'First seen at attribute for instagram_accounts.';
COMMENT ON COLUMN public."instagram_accounts"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."instagram_accounts"."customer_id" IS 'Foreign key referencing customers.id.';
COMMENT ON COLUMN public."instagram_accounts"."is_primary" IS 'Is primary attribute for instagram_accounts.';
COMMENT ON COLUMN public."instagram_accounts"."is_follower" IS 'Is follower attribute for instagram_accounts.';
COMMENT ON COLUMN public."instagram_accounts"."followed_at" IS 'Followed at attribute for instagram_accounts.';

-- ----------------------------------------------------------------------------
-- Relation: public."instagram_competitor_outlier_snapshots" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."instagram_competitor_outlier_snapshots" IS 'Pre-computed viral outlier snapshots flagged by statistical anomaly detection.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."id" IS 'Primary key identifier for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."post_id" IS 'Foreign key referencing competitor_videos.id.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."profile_id" IS 'Foreign key referencing competitor_watchlist.id.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."day_offset" IS 'Day offset attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."evaluation_date" IS 'Evaluation date attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."view_count" IS 'View count attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."like_count" IS 'Like count attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."comment_count" IS 'Comment count attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."share_count" IS 'Share count attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."velocity_score" IS 'Velocity score attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."profile_baseline_likes" IS 'Profile baseline likes attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."profile_baseline_views" IS 'Profile baseline views attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."niche_baseline_likes" IS 'Niche baseline likes attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."niche_baseline_views" IS 'Niche baseline views attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."outlier_score" IS 'Outlier score attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."virality_multiplier" IS 'Virality multiplier attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."outlier_tier" IS 'Outlier tier attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."is_inspiration_candidate" IS 'Is inspiration candidate attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."audio_track_title" IS 'Audio track title attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."caption_hook" IS 'Caption hook attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."detected_keywords" IS 'Detected keywords attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."ai_analysis_summary" IS 'Ai analysis summary attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."is_day1_breakout" IS 'Is day1 breakout attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."is_delayed_breakout" IS 'Is delayed breakout attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."day1_view_multiplier" IS 'Day1 view multiplier attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."delta_multiplier" IS 'Delta multiplier attribute for instagram_competitor_outlier_snapshots.';
COMMENT ON COLUMN public."instagram_competitor_outlier_snapshots"."breakout_archetype" IS 'Breakout archetype attribute for instagram_competitor_outlier_snapshots.';

-- ----------------------------------------------------------------------------
-- Relation: public."instagram_post_daily_metrics" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."instagram_post_daily_metrics" IS 'Longitudinal daily metric snapshots for trend detection.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."id" IS 'Metric snapshot identifier.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."post_id" IS 'Foreign key referencing `competitor_videos.id`.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."profile_id" IS 'Foreign key referencing `competitor_watchlist.id`.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."day_offset" IS 'Days since publication: `0` (day of post), `1`, `2`, `7`, `30`.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."snapshot_date" IS 'Calendar date of metric recording.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."snapshot_timestamp" IS 'Snapshot timestamp attribute for instagram_post_daily_metrics.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."view_count" IS 'Recorded views at snapshot.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."like_count" IS 'Recorded likes at snapshot.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."comment_count" IS 'Recorded comments at snapshot.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."share_count" IS 'Recorded shares at snapshot.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."save_count" IS 'Recorded saves at snapshot.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."repost_count" IS 'Repost count attribute for instagram_post_daily_metrics.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."daily_delta_views" IS 'Views accumulated since prior day snapshot.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."daily_delta_likes" IS 'Likes accumulated since prior day snapshot.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."daily_delta_comments" IS 'Daily delta comments attribute for instagram_post_daily_metrics.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."daily_delta_shares" IS 'Daily delta shares attribute for instagram_post_daily_metrics.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."velocity_score" IS 'Calculated viral momentum index.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."engagement_rate" IS 'Engagement percentage relative to follower baseline.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."raw_metadata" IS 'Raw metadata attribute for instagram_post_daily_metrics.';
COMMENT ON COLUMN public."instagram_post_daily_metrics"."created_at" IS 'Snapshot creation timestamp.';

-- ----------------------------------------------------------------------------
-- Relation: public."instagram_post_wa_shares" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."instagram_post_wa_shares" IS 'Correlation tracking linking scraped Instagram posts with WhatsApp marketing shares.';
COMMENT ON COLUMN public."instagram_post_wa_shares"."id" IS 'Primary key identifier for instagram_post_wa_shares.';
COMMENT ON COLUMN public."instagram_post_wa_shares"."post_id" IS 'Foreign key referencing competitor_videos.id.';
COMMENT ON COLUMN public."instagram_post_wa_shares"."target" IS 'Target attribute for instagram_post_wa_shares.';
COMMENT ON COLUMN public."instagram_post_wa_shares"."group_name" IS 'Group name attribute for instagram_post_wa_shares.';
COMMENT ON COLUMN public."instagram_post_wa_shares"."notes" IS 'Descriptive text or notes regarding the instagram_post_wa_shares record.';
COMMENT ON COLUMN public."instagram_post_wa_shares"."shared_by" IS 'Shared by attribute for instagram_post_wa_shares.';
COMMENT ON COLUMN public."instagram_post_wa_shares"."shared_at" IS 'Shared at attribute for instagram_post_wa_shares.';
COMMENT ON COLUMN public."instagram_post_wa_shares"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."instagram_product_links" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."instagram_product_links" IS 'Mapping linking scraped Instagram media items directly to catalog products.';
COMMENT ON COLUMN public."instagram_product_links"."id" IS 'Primary key identifier for instagram_product_links.';
COMMENT ON COLUMN public."instagram_product_links"."post_id" IS 'Foreign key referencing competitor_videos.id.';
COMMENT ON COLUMN public."instagram_product_links"."product_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."instagram_product_links"."link_type" IS 'Link type attribute for instagram_product_links.';
COMMENT ON COLUMN public."instagram_product_links"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."instagram_product_links"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."instagram_profile_cache" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."instagram_profile_cache" IS 'Cached Instagram competitor profile biographies, avatar URLs, and metrics.';
COMMENT ON COLUMN public."instagram_profile_cache"."username" IS 'Primary key identifier for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."user_id" IS 'Identifier of the associated user account.';
COMMENT ON COLUMN public."instagram_profile_cache"."full_name" IS 'Full name attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."biography" IS 'Biography attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."followers_count" IS 'Followers count attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."following_count" IS 'Following count attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."posts_count" IS 'Posts count attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."profile_pic_url" IS 'Profile pic url attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."external_url" IS 'External url attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."is_private" IS 'Is private attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."is_verified" IS 'Is verified attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."scraped_at" IS 'Scraped at attribute for instagram_profile_cache.';
COMMENT ON COLUMN public."instagram_profile_cache"."raw_json" IS 'Raw json attribute for instagram_profile_cache.';

-- ----------------------------------------------------------------------------
-- Relation: public."llm_corrections" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."llm_corrections" IS 'Operator feedback and correction log used for fine-tuning LLM product extraction prompts.';
COMMENT ON COLUMN public."llm_corrections"."id" IS 'Primary key identifier for llm_corrections.';
COMMENT ON COLUMN public."llm_corrections"."product_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."llm_corrections"."source_text" IS 'Source text attribute for llm_corrections.';
COMMENT ON COLUMN public."llm_corrections"."previous_state" IS 'Previous state attribute for llm_corrections.';
COMMENT ON COLUMN public."llm_corrections"."new_state" IS 'New state attribute for llm_corrections.';
COMMENT ON COLUMN public."llm_corrections"."use_for_training" IS 'Use for training attribute for llm_corrections.';
COMMENT ON COLUMN public."llm_corrections"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."llm_logs" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."llm_logs" IS 'Audit log of LLM completion requests, prompt tokens, completion tokens, latency, and model names.';
COMMENT ON COLUMN public."llm_logs"."id" IS 'Primary key identifier for llm_logs.';
COMMENT ON COLUMN public."llm_logs"."endpoint" IS 'Endpoint attribute for llm_logs.';
COMMENT ON COLUMN public."llm_logs"."prompt" IS 'Prompt attribute for llm_logs.';
COMMENT ON COLUMN public."llm_logs"."response" IS 'Response attribute for llm_logs.';
COMMENT ON COLUMN public."llm_logs"."latency_ms" IS 'Latency ms attribute for llm_logs.';
COMMENT ON COLUMN public."llm_logs"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."master_profile_categories" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."master_profile_categories" IS 'High-level niche taxonomy categories for competitor profiling.';
COMMENT ON COLUMN public."master_profile_categories"."id" IS 'Primary key identifier for master_profile_categories.';
COMMENT ON COLUMN public."master_profile_categories"."name" IS 'Display name or title of the master_profile_categories entity.';
COMMENT ON COLUMN public."master_profile_categories"."display_order" IS 'Numeric sequence index for UI presentation ordering.';

-- ----------------------------------------------------------------------------
-- Relation: public."media" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."media" IS 'Centralized multi-resolution visual and video asset registry.';
COMMENT ON COLUMN public."media"."id" IS 'Asset unique identifier.';
COMMENT ON COLUMN public."media"."storage_path" IS 'MinIO/S3 object path (e.g. `catalog/products/2026/04/p_104.webp`).';
COMMENT ON COLUMN public."media"."media_type" IS 'Asset type: `1 = Image, 2 = Video / Reel, 3 = Document`.';
COMMENT ON COLUMN public."media"."original_filename" IS 'Original uploaded filename.';
COMMENT ON COLUMN public."media"."file_size_bytes" IS 'File size in bytes.';
COMMENT ON COLUMN public."media"."mime_type" IS 'Standard MIME type (e.g. `''image/webp''`, `''video/mp4''`).';
COMMENT ON COLUMN public."media"."status" IS 'Processing state: `0=Uploaded, 1=Processed, 2=Indexed, 98=PendingDelete, 99=Failed`.';
COMMENT ON COLUMN public."media"."vector_id" IS 'Qdrant vector collection reference for visual similarity search.';
COMMENT ON COLUMN public."media"."phash" IS '64-bit perceptual hash for near-duplicate image pruning.';
COMMENT ON COLUMN public."media"."quality_score" IS 'Computed aesthetic quality score (0.00 to 1.00).';
COMMENT ON COLUMN public."media"."width" IS 'Pixel width.';
COMMENT ON COLUMN public."media"."height" IS 'Pixel height.';
COMMENT ON COLUMN public."media"."duration_seconds" IS 'Video clip runtime.';
COMMENT ON COLUMN public."media"."thumbnail_path" IS 'Standard 300px thumbnail path.';
COMMENT ON COLUMN public."media"."preview_path" IS 'Preview path attribute for media.';
COMMENT ON COLUMN public."media"."features_extracted" IS 'True when deep visual features have been computed.';
COMMENT ON COLUMN public."media"."indexed" IS 'True when vector is indexed in Qdrant.';
COMMENT ON COLUMN public."media"."uploaded_at" IS 'Ingestion timestamp.';
COMMENT ON COLUMN public."media"."metadata_json" IS 'Media metadata: EXIF data, codec, FPS.';
COMMENT ON COLUMN public."media"."category" IS 'Category attribute for media.';
COMMENT ON COLUMN public."media"."subcategory" IS 'Subcategory attribute for media.';
COMMENT ON COLUMN public."media"."thumbnail_s" IS 'Small 150px WebP thumbnail.';
COMMENT ON COLUMN public."media"."thumbnail_m" IS 'Medium 300px WebP thumbnail.';
COMMENT ON COLUMN public."media"."thumbnail_l" IS 'Large 600px WebP thumbnail.';
COMMENT ON COLUMN public."media"."blur_data" IS 'Low-resolution Base64 placeholder blur string for progressive UI loading.';
COMMENT ON COLUMN public."media"."color" IS 'Detected dominant hex color code.';
COMMENT ON COLUMN public."media"."is_compressed_thumbnail" IS 'Flags modern WebP compressed thumbnail generation.';

-- ----------------------------------------------------------------------------
-- Relation: public."media_deletion_log" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."media_deletion_log" IS 'Audit log of deleted MinIO objects and derivative WebP assets.';
COMMENT ON COLUMN public."media_deletion_log"."id" IS 'Primary key identifier for media_deletion_log.';
COMMENT ON COLUMN public."media_deletion_log"."media_id" IS 'Media id attribute for media_deletion_log.';
COMMENT ON COLUMN public."media_deletion_log"."storage_path" IS 'Storage path attribute for media_deletion_log.';
COMMENT ON COLUMN public."media_deletion_log"."thumbnail_s" IS 'Thumbnail s attribute for media_deletion_log.';
COMMENT ON COLUMN public."media_deletion_log"."thumbnail_m" IS 'Thumbnail m attribute for media_deletion_log.';
COMMENT ON COLUMN public."media_deletion_log"."thumbnail_l" IS 'Thumbnail l attribute for media_deletion_log.';
COMMENT ON COLUMN public."media_deletion_log"."queued_at" IS 'Queued at attribute for media_deletion_log.';
COMMENT ON COLUMN public."media_deletion_log"."processed_at" IS 'Processed at attribute for media_deletion_log.';
COMMENT ON COLUMN public."media_deletion_log"."status" IS 'Lifecycle status indicator for media_deletion_log.';
COMMENT ON COLUMN public."media_deletion_log"."error_message" IS 'Error message attribute for media_deletion_log.';

-- ----------------------------------------------------------------------------
-- Relation: public."media_deletion_queue" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."media_deletion_queue" IS 'Asynchronous FIFO queue for background MinIO and vector database file cleanup.';
COMMENT ON COLUMN public."media_deletion_queue"."id" IS 'Primary key identifier for media_deletion_queue.';
COMMENT ON COLUMN public."media_deletion_queue"."media_id" IS 'Media id attribute for media_deletion_queue.';
COMMENT ON COLUMN public."media_deletion_queue"."storage_path" IS 'Storage path attribute for media_deletion_queue.';
COMMENT ON COLUMN public."media_deletion_queue"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."media_links" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."media_links" IS 'Association links connecting media assets to products, stories, or competitor items.';
COMMENT ON COLUMN public."media_links"."id" IS 'Primary key identifier for media_links.';
COMMENT ON COLUMN public."media_links"."media_id" IS 'Foreign key referencing media.id.';
COMMENT ON COLUMN public."media_links"."entity_id" IS 'Entity id attribute for media_links.';
COMMENT ON COLUMN public."media_links"."entity_type" IS 'Entity type attribute for media_links.';
COMMENT ON COLUMN public."media_links"."display_order" IS 'Numeric sequence index for UI presentation ordering.';
COMMENT ON COLUMN public."media_links"."is_primary" IS 'Is primary attribute for media_links.';
COMMENT ON COLUMN public."media_links"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."media_preferences" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."media_preferences" IS 'System media compression, resolution, and format transcoding preferences.';
COMMENT ON COLUMN public."media_preferences"."id" IS 'Primary key identifier for media_preferences.';
COMMENT ON COLUMN public."media_preferences"."category" IS 'Category attribute for media_preferences.';
COMMENT ON COLUMN public."media_preferences"."subcategory" IS 'Subcategory attribute for media_preferences.';
COMMENT ON COLUMN public."media_preferences"."thumbnail_sizes" IS 'Thumbnail sizes attribute for media_preferences.';
COMMENT ON COLUMN public."media_preferences"."default_retention" IS 'Default retention attribute for media_preferences.';
COMMENT ON COLUMN public."media_preferences"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."media_preferences"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."media_preferences"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."meta_configurations" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."meta_configurations" IS 'Configuration parameters for Meta Graph API, WhatsApp Cloud API, and Instagram Webhooks.';
COMMENT ON COLUMN public."meta_configurations"."id" IS 'Primary key identifier for meta_configurations.';
COMMENT ON COLUMN public."meta_configurations"."name" IS 'Display name or title of the meta_configurations entity.';
COMMENT ON COLUMN public."meta_configurations"."app_id" IS 'App id attribute for meta_configurations.';
COMMENT ON COLUMN public."meta_configurations"."app_secret" IS 'App secret attribute for meta_configurations.';
COMMENT ON COLUMN public."meta_configurations"."ig_biz_id" IS 'Ig biz id attribute for meta_configurations.';
COMMENT ON COLUMN public."meta_configurations"."is_default" IS 'Is default attribute for meta_configurations.';
COMMENT ON COLUMN public."meta_configurations"."last_refreshed_at" IS 'Last refreshed at attribute for meta_configurations.';
COMMENT ON COLUMN public."meta_configurations"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."meta_configurations"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."meta_configurations"."call_count" IS 'Call count attribute for meta_configurations.';
COMMENT ON COLUMN public."meta_configurations"."total_time" IS 'Total time attribute for meta_configurations.';
COMMENT ON COLUMN public."meta_configurations"."total_cpu" IS 'Total cpu attribute for meta_configurations.';
COMMENT ON COLUMN public."meta_configurations"."long_access_token" IS 'Long access token attribute for meta_configurations.';

-- ----------------------------------------------------------------------------
-- Relation: public."ndr_tasks" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."ndr_tasks" IS 'Non-Delivery Report (NDR) operational tasks for managing re-delivery attempts and RTO prevention.';
COMMENT ON COLUMN public."ndr_tasks"."id" IS 'Primary key identifier for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."shipment_id" IS 'Foreign key referencing shipments.id.';
COMMENT ON COLUMN public."ndr_tasks"."awb_number" IS 'Awb number attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."ndr_reason" IS 'Ndr reason attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."ndr_code" IS 'Ndr code attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."customer_phone" IS 'Customer phone attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."customer_feedback" IS 'Customer feedback attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."action_status" IS 'Action status attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."chosen_action" IS 'Chosen action attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."reattempt_date" IS 'Reattempt date attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."remarks" IS 'Remarks attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."dispatched_to_delhivery" IS 'Dispatched to delhivery attribute for ndr_tasks.';
COMMENT ON COLUMN public."ndr_tasks"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."ndr_tasks"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."orderId" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."orderId" IS 'Root master record for customer purchase orders across all channels.';
COMMENT ON COLUMN public."orderId"."id" IS 'Internal primary key for relational joins with items and groups.';
COMMENT ON COLUMN public."orderId"."order_id" IS 'Business-facing order code (e.g. `ORD-2026-10492`). Displayed on invoices.';
COMMENT ON COLUMN public."orderId"."source_id" IS 'Acquisition source foreign key referencing `order_sources.id` (1=WhatsApp, 2=Instagram).';
COMMENT ON COLUMN public."orderId"."payment_mode_id" IS 'Payment method foreign key referencing `payment_modes.id` (1=COD, 2=Prepaid).';
COMMENT ON COLUMN public."orderId"."created_at" IS 'Order creation timestamp (UTC).';
COMMENT ON COLUMN public."orderId"."customer_phone" IS 'Primary contact number. Primary lookup key for WhatsApp commerce.';
COMMENT ON COLUMN public."orderId"."source_handle" IS 'Handle/username on origin platform (Instagram handle or WhatsApp sender).';
COMMENT ON COLUMN public."orderId"."instagram_user_id" IS 'Social platform external ID.';
COMMENT ON COLUMN public."orderId"."customer_address" IS 'Raw unformatted address captured during chat/checkout.';
COMMENT ON COLUMN public."orderId"."transaction_id" IS 'Payment gateway or UPI reference transaction ID.';
COMMENT ON COLUMN public."orderId"."instagram_handle" IS 'Associated Instagram handle.';
COMMENT ON COLUMN public."orderId"."is_deleted" IS 'Soft-deletion flag preserving audit integrity.';
COMMENT ON COLUMN public."orderId"."customer_id" IS 'Foreign key referencing master `customers.id`.';
COMMENT ON COLUMN public."orderId"."customer_name" IS 'Recipient customer or business name.';
COMMENT ON COLUMN public."orderId"."advance_paid" IS 'Prepaid deposit amount (mandatory for partial-COD shipments).';
COMMENT ON COLUMN public."orderId"."cod_balance" IS 'Cash amount to be collected by delivery agent upon handover.';
COMMENT ON COLUMN public."orderId"."total_amount" IS 'Total order gross monetary value inclusive of taxes and shipping.';
COMMENT ON COLUMN public."orderId"."shipping_charges" IS 'Shipping fees assessed to customer.';
COMMENT ON COLUMN public."orderId"."shipping_street" IS 'Parsed street address line.';
COMMENT ON COLUMN public."orderId"."shipping_city" IS 'Delivery destination city.';
COMMENT ON COLUMN public."orderId"."shipping_state" IS 'Destination state/province.';
COMMENT ON COLUMN public."orderId"."shipping_pincode" IS '6-digit Indian postal code; used for Delhivery serviceability verification.';
COMMENT ON COLUMN public."orderId"."is_serviceable" IS 'Indicates whether courier partner can service the designated pincode.';
COMMENT ON COLUMN public."orderId"."status" IS 'Root order state: `0=Unconfirmed, 1=Confirmed, 2=Processing, 3=Dispatched, 4=Delivered, 5=Cancelled`.';
COMMENT ON COLUMN public."orderId"."need_label" IS 'Global order flag indicating courier shipping label generation is required.';
COMMENT ON COLUMN public."orderId"."order_type" IS 'Distinguishes `''Customer''` (B2C) from `''Reseller''` (B2B wholesale).';
COMMENT ON COLUMN public."orderId"."reseller_name" IS 'Reseller company name when `order_type = ''Reseller''`. Printed as sender on white-label labels.';
COMMENT ON COLUMN public."orderId"."is_address_reviewed" IS 'Quality gate: confirms shipping address has passed review prior to courier booking.';

-- ----------------------------------------------------------------------------
-- Relation: public."orderItem" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."orderItem" IS 'Specific product items and customization specifications under an order.';
COMMENT ON COLUMN public."orderItem"."id" IS 'Internal line item identifier.';
COMMENT ON COLUMN public."orderItem"."order_id_ref" IS 'Foreign key referencing `orderId.id`.';
COMMENT ON COLUMN public."orderItem"."item_index" IS 'Ordinal position within the order (1, 2, 3...).';
COMMENT ON COLUMN public."orderItem"."quantity" IS 'Purchased item count.';
COMMENT ON COLUMN public."orderItem"."price" IS 'Legacy price field.';
COMMENT ON COLUMN public."orderItem"."created_at" IS 'Line item record creation timestamp.';
COMMENT ON COLUMN public."orderItem"."product_id" IS 'Catalog product UUID reference.';
COMMENT ON COLUMN public."orderItem"."comments" IS 'Custom tailoring or buyer notes (e.g., `"Blouse size 38, fall-pico required"`).';
COMMENT ON COLUMN public."orderItem"."unit_price" IS 'Price per single unit.';
COMMENT ON COLUMN public."orderItem"."subtotal" IS 'Calculated subtotal: `quantity * unit_price`.';
COMMENT ON COLUMN public."orderItem"."vendor_id" IS 'Sourcing supplier for this specific item.';
COMMENT ON COLUMN public."orderItem"."source_type" IS 'Sourcing channel: `''catalog''`, `''custom''`, `''dropship''`.';
COMMENT ON COLUMN public."orderItem"."product_title" IS 'Product title snapshot at moment of purchase.';
COMMENT ON COLUMN public."orderItem"."item_id" IS 'Specific SKU code or variant identifier.';
COMMENT ON COLUMN public."orderItem"."order_grp_id_ref" IS 'Foreign key linking line item to its specific `order_groups.order_grp_id`.';
COMMENT ON COLUMN public."orderItem"."label_url" IS 'Individual item packing slip or label URL.';

-- ----------------------------------------------------------------------------
-- Relation: public."order_groups" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."order_groups" IS 'Partitions master orders by vendor for independent fulfillment and tracking.';
COMMENT ON COLUMN public."order_groups"."id" IS 'Internal primary key.';
COMMENT ON COLUMN public."order_groups"."order_grp_id" IS 'Unique vendor group code (e.g. `ORD-10492-GRP-1`).';
COMMENT ON COLUMN public."order_groups"."order_id_ref" IS 'Foreign key referencing internal `orderId.id` (`ON DELETE CASCADE`).';
COMMENT ON COLUMN public."order_groups"."order_id" IS 'Master business order code.';
COMMENT ON COLUMN public."order_groups"."vendor_id" IS 'Sourcing vendor/supplier unique identifier.';
COMMENT ON COLUMN public."order_groups"."vendor_name" IS 'Vendor trade name.';
COMMENT ON COLUMN public."order_groups"."need_label" IS 'Group-level toggle indicating label readiness.';
COMMENT ON COLUMN public."order_groups"."awb_number" IS 'Assigned courier Air Waybill tracking number.';
COMMENT ON COLUMN public."order_groups"."label_url" IS 'S3/MinIO PDF download URL for the courier shipping label.';
COMMENT ON COLUMN public."order_groups"."status" IS 'Fulfillment stage: `''unconfirmed''`, `''confirmed''`, `''processing''`, `''placed''`, `''dispatched''`, `''delivered''`.';
COMMENT ON COLUMN public."order_groups"."tracking_sub_status" IS 'Detailed courier tracking milestone (e.g., `''In Transit''`, `''Out for Delivery''`, `''NDR Open''`).';
COMMENT ON COLUMN public."order_groups"."created_at" IS 'Group generation timestamp.';
COMMENT ON COLUMN public."order_groups"."updated_at" IS 'Last fulfillment status update.';

-- ----------------------------------------------------------------------------
-- Relation: public."order_sources" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."order_sources" IS 'Master lookup table of acquisition channels (WhatsApp, Instagram, Web, Direct).';
COMMENT ON COLUMN public."order_sources"."id" IS 'Primary key identifier for order_sources.';
COMMENT ON COLUMN public."order_sources"."name" IS 'Display name or title of the order_sources entity.';

-- ----------------------------------------------------------------------------
-- Relation: public."payment_modes" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."payment_modes" IS 'Master lookup table of payment methods (COD, Partial COD, Prepaid, UPI).';
COMMENT ON COLUMN public."payment_modes"."id" IS 'Primary key identifier for payment_modes.';
COMMENT ON COLUMN public."payment_modes"."name" IS 'Display name or title of the payment_modes entity.';

-- ----------------------------------------------------------------------------
-- Relation: public."permissions" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."permissions" IS 'Granular security permission definitions for API routes and platform features.';
COMMENT ON COLUMN public."permissions"."id" IS 'Primary key identifier for permissions.';
COMMENT ON COLUMN public."permissions"."code" IS 'Code attribute for permissions.';
COMMENT ON COLUMN public."permissions"."name" IS 'Display name or title of the permissions entity.';
COMMENT ON COLUMN public."permissions"."category" IS 'Category attribute for permissions.';
COMMENT ON COLUMN public."permissions"."description" IS 'Descriptive text or notes regarding the permissions record.';
COMMENT ON COLUMN public."permissions"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."platform_configs" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."platform_configs" IS 'Environment-specific platform infrastructure configurations and flags.';
COMMENT ON COLUMN public."platform_configs"."key" IS 'Primary key identifier for platform_configs.';
COMMENT ON COLUMN public."platform_configs"."value" IS 'Value attribute for platform_configs.';
COMMENT ON COLUMN public."platform_configs"."description" IS 'Descriptive text or notes regarding the platform_configs record.';
COMMENT ON COLUMN public."platform_configs"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."platform_configs"."updated_by" IS 'Updated by attribute for platform_configs.';

-- ----------------------------------------------------------------------------
-- Relation: public."post_comments" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."post_comments" IS 'Scraped or inbound customer comments from social posts and stories.';
COMMENT ON COLUMN public."post_comments"."id" IS 'Primary key identifier for post_comments.';
COMMENT ON COLUMN public."post_comments"."video_id" IS 'Foreign key referencing competitor_videos.id.';
COMMENT ON COLUMN public."post_comments"."account_id" IS 'Foreign key referencing instagram_accounts.id.';
COMMENT ON COLUMN public."post_comments"."platform_comment_id" IS 'Platform comment id attribute for post_comments.';
COMMENT ON COLUMN public."post_comments"."parent_platform_comment_id" IS 'Parent platform comment id attribute for post_comments.';
COMMENT ON COLUMN public."post_comments"."comment_text" IS 'Comment text attribute for post_comments.';
COMMENT ON COLUMN public."post_comments"."posted_at" IS 'Posted at attribute for post_comments.';
COMMENT ON COLUMN public."post_comments"."like_count" IS 'Like count attribute for post_comments.';
COMMENT ON COLUMN public."post_comments"."is_hidden" IS 'Is hidden attribute for post_comments.';
COMMENT ON COLUMN public."post_comments"."raw_metadata" IS 'Raw metadata attribute for post_comments.';
COMMENT ON COLUMN public."post_comments"."scraped_at" IS 'Scraped at attribute for post_comments.';

-- ----------------------------------------------------------------------------
-- Relation: public."post_planner_assignments" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."post_planner_assignments" IS 'Editorial calendar schedule linking curated media to broadcast dates and channels.';
COMMENT ON COLUMN public."post_planner_assignments"."id" IS 'Primary key identifier for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."product_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."post_planner_assignments"."watchlist_id" IS 'Foreign key referencing competitor_watchlist.id.';
COMMENT ON COLUMN public."post_planner_assignments"."channel_type" IS 'Channel type attribute for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."status" IS 'Lifecycle status indicator for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."planning_status" IS 'Planning status attribute for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."scheduled_at" IS 'Scheduled at attribute for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."published_at" IS 'Published at attribute for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."published_url" IS 'Published url attribute for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."external_post_id" IS 'External post id attribute for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."caption_used" IS 'Caption used attribute for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."selected_media_urls" IS 'Selected media urls attribute for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."error_message" IS 'Error message attribute for post_planner_assignments.';
COMMENT ON COLUMN public."post_planner_assignments"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."post_planner_assignments"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."price_history" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."price_history" IS 'Historical price tracking log capturing MRP, MSP, wholesale cost, and discount changes.';
COMMENT ON COLUMN public."price_history"."id" IS 'Primary key identifier for price_history.';
COMMENT ON COLUMN public."price_history"."listing_id" IS 'Listing id attribute for price_history.';
COMMENT ON COLUMN public."price_history"."price" IS 'Monetary value in standard currency units (INR).';
COMMENT ON COLUMN public."price_history"."currency" IS 'Currency attribute for price_history.';
COMMENT ON COLUMN public."price_history"."effective_date" IS 'Effective date attribute for price_history.';
COMMENT ON COLUMN public."price_history"."seller_listing_id" IS 'Foreign key referencing seller_listing.id.';

-- ----------------------------------------------------------------------------
-- Relation: public."product" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product" IS 'Legacy core product table; maintained for backward compatibility with EF Core pipelines.';
COMMENT ON COLUMN public."product"."id" IS 'Primary key identifier for product.';
COMMENT ON COLUMN public."product"."category_id" IS 'Foreign key referencing category.id.';
COMMENT ON COLUMN public."product"."base_sku" IS 'Base sku attribute for product.';
COMMENT ON COLUMN public."product"."title" IS 'Display name or title of the product entity.';
COMMENT ON COLUMN public."product"."fabric" IS 'Fabric attribute for product.';
COMMENT ON COLUMN public."product"."stitch_type" IS 'Stitch type attribute for product.';
COMMENT ON COLUMN public."product"."work_heaviness" IS 'Work heaviness attribute for product.';
COMMENT ON COLUMN public."product"."tags" IS 'Tags attribute for product.';
COMMENT ON COLUMN public."product"."unified_attributes" IS 'Unified attributes attribute for product.';
COMMENT ON COLUMN public."product"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."product"."is_starred" IS 'Is starred attribute for product.';
COMMENT ON COLUMN public."product"."is_media_review_required" IS 'Is media review required attribute for product.';

-- ----------------------------------------------------------------------------
-- Relation: public."product_merge_candidates" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product_merge_candidates" IS 'Algorithmic candidate matches flagged for potential visual or descriptive deduplication.';
COMMENT ON COLUMN public."product_merge_candidates"."id" IS 'Primary key identifier for product_merge_candidates.';
COMMENT ON COLUMN public."product_merge_candidates"."product_a_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."product_merge_candidates"."product_b_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."product_merge_candidates"."similarity_score" IS 'Similarity score attribute for product_merge_candidates.';
COMMENT ON COLUMN public."product_merge_candidates"."status" IS 'Lifecycle status indicator for product_merge_candidates.';
COMMENT ON COLUMN public."product_merge_candidates"."detected_at" IS 'Detected at attribute for product_merge_candidates.';
COMMENT ON COLUMN public."product_merge_candidates"."resolved_at" IS 'Resolved at attribute for product_merge_candidates.';
COMMENT ON COLUMN public."product_merge_candidates"."resolved_by" IS 'Resolved by attribute for product_merge_candidates.';

-- ----------------------------------------------------------------------------
-- Relation: public."product_merges" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product_merges" IS 'Audit ledger recording confirmed merges of duplicate product listings into canonical master products.';
COMMENT ON COLUMN public."product_merges"."source_id" IS 'Primary key identifier for product_merges.';
COMMENT ON COLUMN public."product_merges"."target_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."product_merges"."merged_at" IS 'Merged at attribute for product_merges.';
COMMENT ON COLUMN public."product_merges"."metadata" IS 'Arbitrary JSON metadata and dynamic properties.';

-- ----------------------------------------------------------------------------
-- Relation: public."product_publishing_events" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product_publishing_events" IS 'Outbox and audit event log tracking product publication to external storefronts and channels.';
COMMENT ON COLUMN public."product_publishing_events"."id" IS 'Primary key identifier for product_publishing_events.';
COMMENT ON COLUMN public."product_publishing_events"."product_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."product_publishing_events"."platform" IS 'Platform attribute for product_publishing_events.';
COMMENT ON COLUMN public."product_publishing_events"."account_id" IS 'Account id attribute for product_publishing_events.';
COMMENT ON COLUMN public."product_publishing_events"."account_name" IS 'Account name attribute for product_publishing_events.';
COMMENT ON COLUMN public."product_publishing_events"."published_url" IS 'Published url attribute for product_publishing_events.';
COMMENT ON COLUMN public."product_publishing_events"."external_post_id" IS 'External post id attribute for product_publishing_events.';
COMMENT ON COLUMN public."product_publishing_events"."description_used" IS 'Description used attribute for product_publishing_events.';
COMMENT ON COLUMN public."product_publishing_events"."status" IS 'Lifecycle status indicator for product_publishing_events.';
COMMENT ON COLUMN public."product_publishing_events"."published_at" IS 'Published at attribute for product_publishing_events.';
COMMENT ON COLUMN public."product_publishing_events"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."product_share_logs" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product_share_logs" IS 'Telemetry log tracking customer and reseller social sharing of product links.';
COMMENT ON COLUMN public."product_share_logs"."id" IS 'Primary key identifier for product_share_logs.';
COMMENT ON COLUMN public."product_share_logs"."product_id" IS 'Product id attribute for product_share_logs.';
COMMENT ON COLUMN public."product_share_logs"."platform" IS 'Platform attribute for product_share_logs.';
COMMENT ON COLUMN public."product_share_logs"."shared_at" IS 'Shared at attribute for product_share_logs.';
COMMENT ON COLUMN public."product_share_logs"."description_used" IS 'Description used attribute for product_share_logs.';

-- ----------------------------------------------------------------------------
-- Relation: public."product_unmerges_audit" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product_unmerges_audit" IS 'Audit trail logging rollbacks of previous product merge operations.';
COMMENT ON COLUMN public."product_unmerges_audit"."id" IS 'Primary key identifier for product_unmerges_audit.';
COMMENT ON COLUMN public."product_unmerges_audit"."source_id" IS 'Source id attribute for product_unmerges_audit.';
COMMENT ON COLUMN public."product_unmerges_audit"."target_id" IS 'Target id attribute for product_unmerges_audit.';
COMMENT ON COLUMN public."product_unmerges_audit"."merged_at" IS 'Merged at attribute for product_unmerges_audit.';
COMMENT ON COLUMN public."product_unmerges_audit"."metadata" IS 'Arbitrary JSON metadata and dynamic properties.';
COMMENT ON COLUMN public."product_unmerges_audit"."unmerged_at" IS 'Unmerged at attribute for product_unmerges_audit.';
COMMENT ON COLUMN public."product_unmerges_audit"."unmerged_by" IS 'Unmerged by attribute for product_unmerges_audit.';
COMMENT ON COLUMN public."product_unmerges_audit"."notes" IS 'Descriptive text or notes regarding the product_unmerges_audit record.';

-- ----------------------------------------------------------------------------
-- Relation: public."product_variant" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product_variant" IS 'Legacy variant mapping table; superseded by pluralized product_variants.';
COMMENT ON COLUMN public."product_variant"."id" IS 'Primary key identifier for product_variant.';
COMMENT ON COLUMN public."product_variant"."product_id" IS 'Foreign key referencing product.id.';
COMMENT ON COLUMN public."product_variant"."variant_sku" IS 'Variant sku attribute for product_variant.';
COMMENT ON COLUMN public."product_variant"."color" IS 'Color attribute for product_variant.';
COMMENT ON COLUMN public."product_variant"."fabric" IS 'Fabric attribute for product_variant.';
COMMENT ON COLUMN public."product_variant"."stitch_type" IS 'Stitch type attribute for product_variant.';
COMMENT ON COLUMN public."product_variant"."work_heaviness" IS 'Work heaviness attribute for product_variant.';
COMMENT ON COLUMN public."product_variant"."search_keywords" IS 'Search keywords attribute for product_variant.';
COMMENT ON COLUMN public."product_variant"."attributes_json" IS 'Attributes json attribute for product_variant.';
COMMENT ON COLUMN public."product_variant"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."product_variants" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."product_variants" IS 'SKU-level variant registry tracking colorways, sizes, dimensions, fabric options, and stock status.';
COMMENT ON COLUMN public."product_variants"."id" IS 'Primary key identifier for product_variants.';
COMMENT ON COLUMN public."product_variants"."product_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."product_variants"."variant_sku" IS 'Variant sku attribute for product_variants.';
COMMENT ON COLUMN public."product_variants"."color" IS 'Color attribute for product_variants.';
COMMENT ON COLUMN public."product_variants"."fabric" IS 'Fabric attribute for product_variants.';
COMMENT ON COLUMN public."product_variants"."stitch_type" IS 'Stitch type attribute for product_variants.';
COMMENT ON COLUMN public."product_variants"."work_heaviness" IS 'Work heaviness attribute for product_variants.';
COMMENT ON COLUMN public."product_variants"."search_keywords" IS 'Search keywords attribute for product_variants.';
COMMENT ON COLUMN public."product_variants"."attributes_json" IS 'Attributes json attribute for product_variants.';
COMMENT ON COLUMN public."product_variants"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."products" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."products" IS 'Canonical apparel and saree catalog registry.';
COMMENT ON COLUMN public."products"."id" IS 'Master product primary key.';
COMMENT ON COLUMN public."products"."category_id" IS 'Taxonomy FK referencing `categories.id`.';
COMMENT ON COLUMN public."products"."base_sku" IS 'Base product style SKU (e.g. `VF-BAN-104`).';
COMMENT ON COLUMN public."products"."title" IS 'Merchandising title (e.g. `"Pure Katan Silk Banarasi Saree"`).';
COMMENT ON COLUMN public."products"."tags" IS 'Tags attribute for products.';
COMMENT ON COLUMN public."products"."unified_attributes" IS 'Structured attributes: weave technique, border style, blouse included.';
COMMENT ON COLUMN public."products"."created_at" IS 'Ingestion timestamp.';
COMMENT ON COLUMN public."products"."sequence_id" IS 'Integer sequence for legacy inventory tracking.';
COMMENT ON COLUMN public."products"."is_deleted" IS 'Soft-deletion flag.';
COMMENT ON COLUMN public."products"."fabric" IS 'Primary material (e.g., `''Katan Silk''`, `''Organza''`, `''Georgette''`).';
COMMENT ON COLUMN public."products"."stitch_type" IS 'Tailoring type (`''Unstitched''`, `''Semi-Stitched''`, `''Ready-to-Wear''`).';
COMMENT ON COLUMN public."products"."work_heaviness" IS 'Embellishment scale (`''Light Daily''`, `''Festive''`, `''Heavy Bridal''`).';
COMMENT ON COLUMN public."products"."description" IS 'Rich product copy and draping details.';
COMMENT ON COLUMN public."products"."is_starred" IS 'Editorial curation flag for spotlight promotions.';
COMMENT ON COLUMN public."products"."is_archived" IS 'Soft-archived catalog item pulled from active search.';
COMMENT ON COLUMN public."products"."updated_at" IS 'Attribute modification timestamp.';
COMMENT ON COLUMN public."products"."is_published" IS 'Indicates availability on downstream Storefront.';
COMMENT ON COLUMN public."products"."media_updated_at" IS 'Timestamp when gallery media was last altered.';
COMMENT ON COLUMN public."products"."store_publish_updated_at" IS 'Timestamp of last sync to `deeplens_store`.';
COMMENT ON COLUMN public."products"."is_media_review_required" IS 'Quality gate: prevents automated publishing if media > 30 or zoning flagged.';

-- ----------------------------------------------------------------------------
-- Relation: public."refresh_tokens" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."refresh_tokens" IS 'Cryptographic JWT refresh tokens for secure user authentication session renewal.';
COMMENT ON COLUMN public."refresh_tokens"."id" IS 'Primary key identifier for refresh_tokens.';
COMMENT ON COLUMN public."refresh_tokens"."user_id" IS 'Foreign key referencing users.id.';
COMMENT ON COLUMN public."refresh_tokens"."token" IS 'Token attribute for refresh_tokens.';
COMMENT ON COLUMN public."refresh_tokens"."expires_at" IS 'Expires at attribute for refresh_tokens.';
COMMENT ON COLUMN public."refresh_tokens"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."refresh_tokens"."is_revoked" IS 'Is revoked attribute for refresh_tokens.';
COMMENT ON COLUMN public."refresh_tokens"."revoked_at" IS 'Revoked at attribute for refresh_tokens.';
COMMENT ON COLUMN public."refresh_tokens"."revoked_reason" IS 'Revoked reason attribute for refresh_tokens.';
COMMENT ON COLUMN public."refresh_tokens"."ip_address" IS 'Client IP address captured during the request.';
COMMENT ON COLUMN public."refresh_tokens"."user_agent" IS 'Client browser or application User-Agent header string.';

-- ----------------------------------------------------------------------------
-- Relation: public."role_permissions" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."role_permissions" IS 'Mapping associating security roles with granular permissions.';
COMMENT ON COLUMN public."role_permissions"."role_id" IS 'Primary key identifier for role_permissions.';
COMMENT ON COLUMN public."role_permissions"."permission_id" IS 'Primary key identifier for role_permissions.';
COMMENT ON COLUMN public."role_permissions"."granted_at" IS 'Granted at attribute for role_permissions.';

-- ----------------------------------------------------------------------------
-- Relation: public."roles" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."roles" IS 'RBAC security roles governing platform administrative privileges.';
COMMENT ON COLUMN public."roles"."id" IS 'Primary key identifier for roles.';
COMMENT ON COLUMN public."roles"."tenant_id" IS 'Multi-tenant isolation identifier.';
COMMENT ON COLUMN public."roles"."code" IS 'Code attribute for roles.';
COMMENT ON COLUMN public."roles"."name" IS 'Display name or title of the roles entity.';
COMMENT ON COLUMN public."roles"."description" IS 'Descriptive text or notes regarding the roles record.';
COMMENT ON COLUMN public."roles"."is_system" IS 'Is system attribute for roles.';
COMMENT ON COLUMN public."roles"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."roles"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."scraper_config" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."scraper_config" IS 'Configuration parameters for social scrapers, proxy pools, and rate limiting.';
COMMENT ON COLUMN public."scraper_config"."id" IS 'Primary key identifier for scraper_config.';
COMMENT ON COLUMN public."scraper_config"."config_key" IS 'Config key attribute for scraper_config.';
COMMENT ON COLUMN public."scraper_config"."config_value" IS 'Config value attribute for scraper_config.';
COMMENT ON COLUMN public."scraper_config"."config_type" IS 'Config type attribute for scraper_config.';
COMMENT ON COLUMN public."scraper_config"."description" IS 'Descriptive text or notes regarding the scraper_config record.';
COMMENT ON COLUMN public."scraper_config"."version" IS 'Version attribute for scraper_config.';
COMMENT ON COLUMN public."scraper_config"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."scraper_config"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."scraper_config"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."scraper_history" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."scraper_history" IS 'Execution history and run metrics for completed scraper tasks.';
COMMENT ON COLUMN public."scraper_history"."id" IS 'Primary key identifier for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."job_id" IS 'Job id attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."watchlist_id" IS 'Foreign key referencing competitor_watchlist.id.';
COMMENT ON COLUMN public."scraper_history"."job_type" IS 'Job type attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."status" IS 'Lifecycle status indicator for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."items_found" IS 'Items found attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."items_processed" IS 'Items processed attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."items_failed" IS 'Items failed attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."error_message" IS 'Error message attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."error_details" IS 'Error details attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."retry_count" IS 'Retry count attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."max_retries" IS 'Max retries attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."started_at" IS 'Started at attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."completed_at" IS 'Completed at attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."duration_ms" IS 'Duration ms attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."worker_id" IS 'Worker id attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."scraper_session_id" IS 'Scraper session id attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."kafka_topic" IS 'Kafka topic attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."kafka_partition" IS 'Kafka partition attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."kafka_offset" IS 'Kafka offset attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."triggered_by" IS 'Triggered by attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."config_snapshot" IS 'Config snapshot attribute for scraper_history.';
COMMENT ON COLUMN public."scraper_history"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."scraper_jobs" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."scraper_jobs" IS 'Scheduled and active scraping batch jobs for competitor profiles and hashtags.';
COMMENT ON COLUMN public."scraper_jobs"."id" IS 'Primary key identifier for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."job_id" IS 'Job id attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."watchlist_id" IS 'Foreign key referencing competitor_watchlist.id.';
COMMENT ON COLUMN public."scraper_jobs"."job_type" IS 'Job type attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."status" IS 'Lifecycle status indicator for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."items_found" IS 'Items found attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."items_processed" IS 'Items processed attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."items_failed" IS 'Items failed attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."error_message" IS 'Error message attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."error_details" IS 'Error details attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."retry_count" IS 'Retry count attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."max_retries" IS 'Max retries attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."started_at" IS 'Started at attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."completed_at" IS 'Completed at attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."duration_ms" IS 'Duration ms attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."worker_id" IS 'Worker id attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."scraper_session_id" IS 'Foreign key referencing scraper_sessions.id.';
COMMENT ON COLUMN public."scraper_jobs"."kafka_topic" IS 'Kafka topic attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."kafka_partition" IS 'Kafka partition attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."kafka_offset" IS 'Kafka offset attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."triggered_by" IS 'Triggered by attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."config_snapshot" IS 'Config snapshot attribute for scraper_jobs.';
COMMENT ON COLUMN public."scraper_jobs"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."scraper_logs" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."scraper_logs" IS 'Detailed diagnostic and error logs from distributed scraping workers.';
COMMENT ON COLUMN public."scraper_logs"."id" IS 'Primary key identifier for scraper_logs.';
COMMENT ON COLUMN public."scraper_logs"."job_id" IS 'Job id attribute for scraper_logs.';
COMMENT ON COLUMN public."scraper_logs"."log_level" IS 'Log level attribute for scraper_logs.';
COMMENT ON COLUMN public."scraper_logs"."message" IS 'Message attribute for scraper_logs.';
COMMENT ON COLUMN public."scraper_logs"."raw_payload" IS 'Raw payload attribute for scraper_logs.';
COMMENT ON COLUMN public."scraper_logs"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."scraper_queue" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."scraper_queue" IS 'FIFO message queue of pending media and profile scrape requests.';
COMMENT ON COLUMN public."scraper_queue"."id" IS 'Primary key identifier for scraper_queue.';
COMMENT ON COLUMN public."scraper_queue"."watchlist_id" IS 'Foreign key referencing competitor_watchlist.id.';
COMMENT ON COLUMN public."scraper_queue"."job_type" IS 'Job type attribute for scraper_queue.';
COMMENT ON COLUMN public."scraper_queue"."status" IS 'Lifecycle status indicator for scraper_queue.';
COMMENT ON COLUMN public."scraper_queue"."priority" IS 'Numeric sequence index for UI presentation ordering.';
COMMENT ON COLUMN public."scraper_queue"."target_count" IS 'Target count attribute for scraper_queue.';
COMMENT ON COLUMN public."scraper_queue"."scraped_count" IS 'Scraped count attribute for scraper_queue.';
COMMENT ON COLUMN public."scraper_queue"."error_message" IS 'Error message attribute for scraper_queue.';
COMMENT ON COLUMN public."scraper_queue"."next_run_at" IS 'Next run at attribute for scraper_queue.';
COMMENT ON COLUMN public."scraper_queue"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."scraper_queue"."started_at" IS 'Started at attribute for scraper_queue.';
COMMENT ON COLUMN public."scraper_queue"."completed_at" IS 'Completed at attribute for scraper_queue.';

-- ----------------------------------------------------------------------------
-- Relation: public."scraper_sessions" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."scraper_sessions" IS 'Authenticated session cookies and browser states for scraper headless instances.';
COMMENT ON COLUMN public."scraper_sessions"."id" IS 'Primary key identifier for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."platform" IS 'Platform attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."username" IS 'Username attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."display_name" IS 'Display name attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."session_cookies" IS 'Encrypted session data for maintaining authenticated sessions';
COMMENT ON COLUMN public."scraper_sessions"."session_metadata" IS 'Session metadata attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."api_token" IS 'Api token attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."last_used_at" IS 'Last used at attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."last_health_check_at" IS 'Last health check at attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."health_status" IS 'Health status attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."consecutive_failures" IS 'Consecutive failures attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."total_requests_today" IS 'Total requests today attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."on_cooldown" IS 'On cooldown attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."cooldown_until" IS 'Cooldown until attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."rotation_strategy" IS 'Rotation strategy attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."usage_count" IS 'Usage count attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."enabled" IS 'Enabled attribute for scraper_sessions.';
COMMENT ON COLUMN public."scraper_sessions"."notes" IS 'Descriptive text or notes regarding the scraper_sessions record.';
COMMENT ON COLUMN public."scraper_sessions"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."scraper_sessions"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."seller" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."seller" IS 'Legacy singular seller profile table; superseded by sellers.';
COMMENT ON COLUMN public."seller"."id" IS 'Primary key identifier for seller.';
COMMENT ON COLUMN public."seller"."external_id" IS 'External id attribute for seller.';
COMMENT ON COLUMN public."seller"."name" IS 'Display name or title of the seller entity.';
COMMENT ON COLUMN public."seller"."contact_info" IS 'Contact info attribute for seller.';
COMMENT ON COLUMN public."seller"."rating" IS 'Rating attribute for seller.';
COMMENT ON COLUMN public."seller"."is_trusted" IS 'Is trusted attribute for seller.';
COMMENT ON COLUMN public."seller"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."seller_listing" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."seller_listing" IS 'Legacy vendor listing table mapping vendor offerings to catalog items.';
COMMENT ON COLUMN public."seller_listing"."id" IS 'Primary key identifier for seller_listing.';
COMMENT ON COLUMN public."seller_listing"."variant_id" IS 'Foreign key referencing product_variant.id.';
COMMENT ON COLUMN public."seller_listing"."product_id" IS 'Foreign key referencing product.id.';
COMMENT ON COLUMN public."seller_listing"."seller_id" IS 'Foreign key referencing seller.id.';
COMMENT ON COLUMN public."seller_listing"."external_id" IS 'External id attribute for seller_listing.';
COMMENT ON COLUMN public."seller_listing"."current_price" IS 'Current price attribute for seller_listing.';
COMMENT ON COLUMN public."seller_listing"."currency" IS 'Currency attribute for seller_listing.';
COMMENT ON COLUMN public."seller_listing"."shipping_info" IS 'Shipping info attribute for seller_listing.';
COMMENT ON COLUMN public."seller_listing"."is_favorite" IS 'Is favorite attribute for seller_listing.';
COMMENT ON COLUMN public."seller_listing"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."seller_listing"."description" IS 'Descriptive text or notes regarding the seller_listing record.';
COMMENT ON COLUMN public."seller_listing"."url" IS 'Web URL or asset URI location.';
COMMENT ON COLUMN public."seller_listing"."last_priced_at" IS 'Last priced at attribute for seller_listing.';
COMMENT ON COLUMN public."seller_listing"."raw_data_json" IS 'Raw data json attribute for seller_listing.';
COMMENT ON COLUMN public."seller_listing"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."seller_listings" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."seller_listings" IS 'Vendor catalog listings capturing supplier-specific pricing, availability, and lead time.';
COMMENT ON COLUMN public."seller_listings"."id" IS 'Primary key identifier for seller_listings.';
COMMENT ON COLUMN public."seller_listings"."variant_id" IS 'Variant id attribute for seller_listings.';
COMMENT ON COLUMN public."seller_listings"."seller_id" IS 'Foreign key referencing sellers.id.';
COMMENT ON COLUMN public."seller_listings"."external_id" IS 'External id attribute for seller_listings.';
COMMENT ON COLUMN public."seller_listings"."current_price" IS 'Current price attribute for seller_listings.';
COMMENT ON COLUMN public."seller_listings"."currency" IS 'Currency attribute for seller_listings.';
COMMENT ON COLUMN public."seller_listings"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."sellers" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."sellers" IS 'Marketplace seller entity profiles, bank accounts, and settlement configurations.';
COMMENT ON COLUMN public."sellers"."id" IS 'Primary key identifier for sellers.';
COMMENT ON COLUMN public."sellers"."name" IS 'Display name or title of the sellers entity.';
COMMENT ON COLUMN public."sellers"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."shipment_items" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."shipment_items" IS 'Junction table mapping individual order line items to courier shipments.';
COMMENT ON COLUMN public."shipment_items"."id" IS 'Primary key identifier for shipment_items.';
COMMENT ON COLUMN public."shipment_items"."shipment_id" IS 'Foreign key referencing shipments.id.';
COMMENT ON COLUMN public."shipment_items"."order_item_id" IS 'Order item id attribute for shipment_items.';
COMMENT ON COLUMN public."shipment_items"."product_id" IS 'Product id attribute for shipment_items.';
COMMENT ON COLUMN public."shipment_items"."product_name" IS 'Product name attribute for shipment_items.';
COMMENT ON COLUMN public."shipment_items"."sku" IS 'Sku attribute for shipment_items.';
COMMENT ON COLUMN public."shipment_items"."quantity" IS 'Numeric quantity count.';
COMMENT ON COLUMN public."shipment_items"."unit_price" IS 'Unit price attribute for shipment_items.';
COMMENT ON COLUMN public."shipment_items"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."shipments" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."shipments" IS 'Carrier dispatch manifestation and lifecycle tracking.';
COMMENT ON COLUMN public."shipments"."id" IS 'Unique shipment identifier.';
COMMENT ON COLUMN public."shipments"."order_id" IS 'Master order UUID reference.';
COMMENT ON COLUMN public."shipments"."order_number" IS 'Human-readable order code.';
COMMENT ON COLUMN public."shipments"."shipment_number" IS 'Unique shipment tracking code.';
COMMENT ON COLUMN public."shipments"."warehouse_id" IS 'Origin dispatch facility FK referencing `warehouses.id`.';
COMMENT ON COLUMN public."shipments"."courier_partner" IS 'Integrated logistics carrier (e.g., `''Delhivery''`).';
COMMENT ON COLUMN public."shipments"."awb_number" IS 'Carrier Air Waybill tracking number.';
COMMENT ON COLUMN public."shipments"."status" IS 'Lifecycle: `''pending''`, `''manifested''`, `''in_transit''`, `''delivered''`, `''rto_initiated''`.';
COMMENT ON COLUMN public."shipments"."shipping_mode" IS 'Transit tier: `''Surface''`, `''Express Air''`.';
COMMENT ON COLUMN public."shipments"."fulfillment_type" IS 'Logistics mode: `''direct_dispatch''` vs `''cross_dock''`.';
COMMENT ON COLUMN public."shipments"."cod_amount" IS 'Cash on delivery collection balance.';
COMMENT ON COLUMN public."shipments"."label_url" IS 'Downloadable label URL.';
COMMENT ON COLUMN public."shipments"."minio_label_key" IS 'Internal MinIO object key for shipping label PDF.';
COMMENT ON COLUMN public."shipments"."pickup_scheduled_at" IS 'Scheduled carrier pickup window.';
COMMENT ON COLUMN public."shipments"."pickup_token" IS 'Carrier pickup authentication manifest token.';
COMMENT ON COLUMN public."shipments"."estimated_delivery_date" IS 'SLA target delivery date.';
COMMENT ON COLUMN public."shipments"."vendor_name" IS 'Sourcing vendor origin name.';
COMMENT ON COLUMN public."shipments"."vendor_tracking_url" IS 'Direct carrier public tracking link.';
COMMENT ON COLUMN public."shipments"."customer_notified_at" IS 'Customer notified at attribute for shipments.';
COMMENT ON COLUMN public."shipments"."procure_status" IS 'Cross-dock procurement state: `''ordered''`, `''received''`.';
COMMENT ON COLUMN public."shipments"."metadata" IS 'Carrier webhook payloads and scan history.';
COMMENT ON COLUMN public."shipments"."created_at" IS 'Record creation timestamp.';
COMMENT ON COLUMN public."shipments"."updated_at" IS 'Last carrier milestone timestamp.';

-- ----------------------------------------------------------------------------
-- Relation: public."shipping_escalations" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."shipping_escalations" IS 'Logistics escalation tickets tracking delivery delays, NDR disputes, and courier exceptions.';
COMMENT ON COLUMN public."shipping_escalations"."id" IS 'Primary key identifier for shipping_escalations.';
COMMENT ON COLUMN public."shipping_escalations"."shipment_id" IS 'Foreign key referencing shipments.id.';
COMMENT ON COLUMN public."shipping_escalations"."awb_number" IS 'Awb number attribute for shipping_escalations.';
COMMENT ON COLUMN public."shipping_escalations"."issue_type" IS 'Issue type attribute for shipping_escalations.';
COMMENT ON COLUMN public."shipping_escalations"."description" IS 'Descriptive text or notes regarding the shipping_escalations record.';
COMMENT ON COLUMN public."shipping_escalations"."status" IS 'Lifecycle status indicator for shipping_escalations.';
COMMENT ON COLUMN public."shipping_escalations"."external_ticket_id" IS 'External ticket id attribute for shipping_escalations.';
COMMENT ON COLUMN public."shipping_escalations"."resolution_notes" IS 'Resolution notes attribute for shipping_escalations.';
COMMENT ON COLUMN public."shipping_escalations"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."shipping_escalations"."resolved_at" IS 'Resolved at attribute for shipping_escalations.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_cart_items" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_cart_items" IS 'Staged cart line items on platform database.';
COMMENT ON COLUMN public."store_cart_items"."id" IS 'Primary key identifier for store_cart_items.';
COMMENT ON COLUMN public."store_cart_items"."cart_id" IS 'Foreign key referencing store_carts.id.';
COMMENT ON COLUMN public."store_cart_items"."product_id" IS 'Product id attribute for store_cart_items.';
COMMENT ON COLUMN public."store_cart_items"."product_code" IS 'Product code attribute for store_cart_items.';
COMMENT ON COLUMN public."store_cart_items"."title" IS 'Display name or title of the store_cart_items entity.';
COMMENT ON COLUMN public."store_cart_items"."price" IS 'Monetary value in standard currency units (INR).';
COMMENT ON COLUMN public."store_cart_items"."original_price" IS 'Original price attribute for store_cart_items.';
COMMENT ON COLUMN public."store_cart_items"."quantity" IS 'Numeric quantity count.';
COMMENT ON COLUMN public."store_cart_items"."selected_color" IS 'Selected color attribute for store_cart_items.';
COMMENT ON COLUMN public."store_cart_items"."selected_size" IS 'Selected size attribute for store_cart_items.';
COMMENT ON COLUMN public."store_cart_items"."primary_image_uri" IS 'Primary image uri attribute for store_cart_items.';
COMMENT ON COLUMN public."store_cart_items"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_carts" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_carts" IS 'Ephemeral and collaborative shopping carts.';
COMMENT ON COLUMN public."store_carts"."id" IS 'Cart line item identifier.';
COMMENT ON COLUMN public."store_carts"."device_id" IS 'Client browser device fingerprint or authenticated UUID.';
COMMENT ON COLUMN public."store_carts"."share_token" IS 'Unique short token (`crt_xxxxxx`) for collaborative cart sharing.';
COMMENT ON COLUMN public."store_carts"."total_amount" IS 'Net payable cart total after discounts.';
COMMENT ON COLUMN public."store_carts"."total_mrp" IS 'Total cumulative MRP value.';
COMMENT ON COLUMN public."store_carts"."total_discount" IS 'Total savings: `total_mrp - total_amount`.';
COMMENT ON COLUMN public."store_carts"."item_count" IS 'Cumulative quantity of all items in cart.';
COMMENT ON COLUMN public."store_carts"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."store_carts"."last_active_at" IS 'Timestamp of last cart item addition/removal.';
COMMENT ON COLUMN public."store_carts"."expires_at" IS 'Sliding TTL expiration timestamp (30 days from last activity).';

-- ----------------------------------------------------------------------------
-- Relation: public."store_color_groups" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_color_groups" IS 'Color variant grouping linking related product variants under a unified visual palette on PDPs.';
COMMENT ON COLUMN public."store_color_groups"."id" IS 'Primary key identifier for store_color_groups.';
COMMENT ON COLUMN public."store_color_groups"."master_title" IS 'Master title attribute for store_color_groups.';
COMMENT ON COLUMN public."store_color_groups"."description" IS 'Descriptive text or notes regarding the store_color_groups record.';
COMMENT ON COLUMN public."store_color_groups"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."store_color_groups"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_product_audit" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_product_audit" IS 'Catalog compliance and quality audit log for items promoted to the storefront.';
COMMENT ON COLUMN public."store_product_audit"."id" IS 'Primary key identifier for store_product_audit.';
COMMENT ON COLUMN public."store_product_audit"."store_product_id" IS 'Foreign key referencing store_products.id.';
COMMENT ON COLUMN public."store_product_audit"."action_type" IS 'Action type attribute for store_product_audit.';
COMMENT ON COLUMN public."store_product_audit"."field_name" IS 'Field name attribute for store_product_audit.';
COMMENT ON COLUMN public."store_product_audit"."old_value" IS 'Old value attribute for store_product_audit.';
COMMENT ON COLUMN public."store_product_audit"."new_value" IS 'New value attribute for store_product_audit.';
COMMENT ON COLUMN public."store_product_audit"."author_email" IS 'Author email attribute for store_product_audit.';
COMMENT ON COLUMN public."store_product_audit"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_products" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_products" IS 'Consumer-facing storefront product catalog.';
COMMENT ON COLUMN public."store_products"."id" IS 'Storefront product identifier.';
COMMENT ON COLUMN public."store_products"."vayyari_product_id" IS 'Foreign key referencing master `products.id`.';
COMMENT ON COLUMN public."store_products"."product_code" IS 'Human-friendly SKU and PDP route slug (e.g. `VF-BAN-104`).';
COMMENT ON COLUMN public."store_products"."title" IS 'Store display title.';
COMMENT ON COLUMN public."store_products"."description" IS 'Formatted HTML/Markdown product description.';
COMMENT ON COLUMN public."store_products"."category_name" IS 'Taxonomy category display name.';
COMMENT ON COLUMN public."store_products"."fabric" IS 'Material specification.';
COMMENT ON COLUMN public."store_products"."base_cost" IS 'Sourcing base cost for gross margin calculation.';
COMMENT ON COLUMN public."store_products"."mrp" IS 'Maximum Retail Price (struck-through anchor price).';
COMMENT ON COLUMN public."store_products"."sale_price" IS 'Final customer checkout price.';
COMMENT ON COLUMN public."store_products"."lifecycle_status" IS 'Store state: `''available''`, `''hidden''`, `''takedown''`, `''sold_out''`.';
COMMENT ON COLUMN public."store_products"."stock_quantity" IS 'Available stock count.';
COMMENT ON COLUMN public."store_products"."color_group_id" IS 'FK linking sibling colorways in `store_color_groups`.';
COMMENT ON COLUMN public."store_products"."colorway_name" IS 'Colorway title (e.g. `''Peacock Green''`, `''Ruby Crimson''`).';
COMMENT ON COLUMN public."store_products"."color_hex" IS 'Primary swatch hex color for frontend selector.';
COMMENT ON COLUMN public."store_products"."media_order" IS 'Ordered array of gallery images with covers and dwell timings.';
COMMENT ON COLUMN public."store_products"."tags" IS 'Visual filter tags (`"Bridal"`, `"Zari Work"`).';
COMMENT ON COLUMN public."store_products"."is_published" IS 'Storefront visibility toggle.';
COMMENT ON COLUMN public."store_products"."published_at" IS 'Initial storefront publication timestamp.';
COMMENT ON COLUMN public."store_products"."created_at" IS 'Record creation timestamp.';
COMMENT ON COLUMN public."store_products"."updated_at" IS 'Last modification timestamp.';

-- ----------------------------------------------------------------------------
-- Relation: public."store_wishlists" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."store_wishlists" IS 'Staged customer wishlist registry on platform database.';
COMMENT ON COLUMN public."store_wishlists"."id" IS 'Primary key identifier for store_wishlists.';
COMMENT ON COLUMN public."store_wishlists"."device_id" IS 'Device id attribute for store_wishlists.';
COMMENT ON COLUMN public."store_wishlists"."product_id" IS 'Product id attribute for store_wishlists.';
COMMENT ON COLUMN public."store_wishlists"."product_code" IS 'Product code attribute for store_wishlists.';
COMMENT ON COLUMN public."store_wishlists"."title" IS 'Display name or title of the store_wishlists entity.';
COMMENT ON COLUMN public."store_wishlists"."price" IS 'Monetary value in standard currency units (INR).';
COMMENT ON COLUMN public."store_wishlists"."primary_image_uri" IS 'Primary image uri attribute for store_wishlists.';
COMMENT ON COLUMN public."store_wishlists"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."store_wishlists"."expires_at" IS 'Expires at attribute for store_wishlists.';

-- ----------------------------------------------------------------------------
-- Relation: public."story_group_eligibility" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."story_group_eligibility" IS 'Rule-based filtering evaluating which products/stories are eligible for broadcast.';
COMMENT ON COLUMN public."story_group_eligibility"."group_id" IS 'Primary key identifier for story_group_eligibility.';
COMMENT ON COLUMN public."story_group_eligibility"."target_watchlist_id" IS 'Primary key identifier for story_group_eligibility.';
COMMENT ON COLUMN public."story_group_eligibility"."is_eligible" IS 'Is eligible attribute for story_group_eligibility.';
COMMENT ON COLUMN public."story_group_eligibility"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."story_group_eligibility"."suspend_until" IS 'Suspend until attribute for story_group_eligibility.';

-- ----------------------------------------------------------------------------
-- Relation: public."story_group_items" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."story_group_items" IS 'Individual media slides and video clips assigned to a curated story group.';
COMMENT ON COLUMN public."story_group_items"."group_id" IS 'Primary key identifier for story_group_items.';
COMMENT ON COLUMN public."story_group_items"."post_id" IS 'Primary key identifier for story_group_items.';
COMMENT ON COLUMN public."story_group_items"."is_starred" IS 'Is starred attribute for story_group_items.';
COMMENT ON COLUMN public."story_group_items"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."story_group_merges" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."story_group_merges" IS 'Audit log of merged story groups consolidated during curation.';
COMMENT ON COLUMN public."story_group_merges"."id" IS 'Primary key identifier for story_group_merges.';
COMMENT ON COLUMN public."story_group_merges"."parent_group_id" IS 'Foreign key referencing story_groups.id.';
COMMENT ON COLUMN public."story_group_merges"."merged_group_id" IS 'Merged group id attribute for story_group_merges.';
COMMENT ON COLUMN public."story_group_merges"."merged_at" IS 'Merged at attribute for story_group_merges.';

-- ----------------------------------------------------------------------------
-- Relation: public."story_groups" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."story_groups" IS 'Curated visual story groupings for Instagram/WhatsApp scheduled publishing.';
COMMENT ON COLUMN public."story_groups"."id" IS 'Story group unique identifier.';
COMMENT ON COLUMN public."story_groups"."name" IS 'Thematic group name (e.g. `"Banarasi Wedding Edit - Oct 2026"`).';
COMMENT ON COLUMN public."story_groups"."status" IS 'Publishing state: `''active''`, `''suspended''`, `''completed''`, `''archived''`.';
COMMENT ON COLUMN public."story_groups"."suspend_until" IS 'Snooze timer: halts automated publication until this timestamp passes.';
COMMENT ON COLUMN public."story_groups"."last_reviewed_at" IS 'Timestamp of last curator editorial review.';
COMMENT ON COLUMN public."story_groups"."created_at" IS 'Collection creation timestamp.';
COMMENT ON COLUMN public."story_groups"."updated_at" IS 'Last modification timestamp.';
COMMENT ON COLUMN public."story_groups"."keywords" IS 'Search tags associated with the story collection.';

-- ----------------------------------------------------------------------------
-- Relation: public."story_posting_history" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."story_posting_history" IS 'Log of successfully published social media stories and broadcast timestamps.';
COMMENT ON COLUMN public."story_posting_history"."id" IS 'Primary key identifier for story_posting_history.';
COMMENT ON COLUMN public."story_posting_history"."group_id" IS 'Foreign key referencing story_groups.id.';
COMMENT ON COLUMN public."story_posting_history"."target_watchlist_id" IS 'Foreign key referencing competitor_watchlist.id.';
COMMENT ON COLUMN public."story_posting_history"."posted_at" IS 'Posted at attribute for story_posting_history.';
COMMENT ON COLUMN public."story_posting_history"."swipe_status" IS 'Swipe status attribute for story_posting_history.';
COMMENT ON COLUMN public."story_posting_history"."swiped_at" IS 'Swiped at attribute for story_posting_history.';
COMMENT ON COLUMN public."story_posting_history"."post_id" IS 'Post id attribute for story_posting_history.';

-- ----------------------------------------------------------------------------
-- Relation: public."system_jobs" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."system_jobs" IS 'Background cron job execution schedules, status, and health telemetry.';
COMMENT ON COLUMN public."system_jobs"."id" IS 'Primary key identifier for system_jobs.';
COMMENT ON COLUMN public."system_jobs"."job_name" IS 'Job name attribute for system_jobs.';
COMMENT ON COLUMN public."system_jobs"."status" IS 'Lifecycle status indicator for system_jobs.';
COMMENT ON COLUMN public."system_jobs"."last_run_at" IS 'Last run at attribute for system_jobs.';
COMMENT ON COLUMN public."system_jobs"."next_run_at" IS 'Next run at attribute for system_jobs.';
COMMENT ON COLUMN public."system_jobs"."progress_pct" IS 'Progress pct attribute for system_jobs.';
COMMENT ON COLUMN public."system_jobs"."metadata" IS 'Arbitrary JSON metadata and dynamic properties.';
COMMENT ON COLUMN public."system_jobs"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."taxonomy_facets" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."taxonomy_facets" IS 'Dynamic search facet registry (fabric, weave, work, occasion) for catalog filtering.';
COMMENT ON COLUMN public."taxonomy_facets"."id" IS 'Primary key identifier for taxonomy_facets.';
COMMENT ON COLUMN public."taxonomy_facets"."dimension" IS 'Dimension attribute for taxonomy_facets.';
COMMENT ON COLUMN public."taxonomy_facets"."canonical_name" IS 'Canonical name attribute for taxonomy_facets.';
COMMENT ON COLUMN public."taxonomy_facets"."aliases" IS 'Aliases attribute for taxonomy_facets.';
COMMENT ON COLUMN public."taxonomy_facets"."usage_count" IS 'Usage count attribute for taxonomy_facets.';
COMMENT ON COLUMN public."taxonomy_facets"."is_verified" IS 'Is verified attribute for taxonomy_facets.';
COMMENT ON COLUMN public."taxonomy_facets"."metadata" IS 'Arbitrary JSON metadata and dynamic properties.';
COMMENT ON COLUMN public."taxonomy_facets"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."taxonomy_facets"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."tenant_api_keys" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."tenant_api_keys" IS 'API key credentials for third-party systems and external developer access.';
COMMENT ON COLUMN public."tenant_api_keys"."id" IS 'Primary key identifier for tenant_api_keys.';
COMMENT ON COLUMN public."tenant_api_keys"."tenant_id" IS 'Foreign key referencing tenants.id.';
COMMENT ON COLUMN public."tenant_api_keys"."name" IS 'Display name or title of the tenant_api_keys entity.';
COMMENT ON COLUMN public."tenant_api_keys"."key_hash" IS 'Key hash attribute for tenant_api_keys.';
COMMENT ON COLUMN public."tenant_api_keys"."key_prefix" IS 'Key prefix attribute for tenant_api_keys.';
COMMENT ON COLUMN public."tenant_api_keys"."scopes" IS 'Scopes attribute for tenant_api_keys.';
COMMENT ON COLUMN public."tenant_api_keys"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."tenant_api_keys"."expires_at" IS 'Expires at attribute for tenant_api_keys.';
COMMENT ON COLUMN public."tenant_api_keys"."last_used_at" IS 'Last used at attribute for tenant_api_keys.';
COMMENT ON COLUMN public."tenant_api_keys"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."tenant_api_keys"."created_by" IS 'Created by attribute for tenant_api_keys.';

-- ----------------------------------------------------------------------------
-- Relation: public."tenants" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."tenants" IS 'Multi-tenant tenant profiles for enterprise white-label separation.';
COMMENT ON COLUMN public."tenants"."id" IS 'Primary key identifier for tenants.';
COMMENT ON COLUMN public."tenants"."name" IS 'Display name or title of the tenants entity.';
COMMENT ON COLUMN public."tenants"."description" IS 'Descriptive text or notes regarding the tenants record.';
COMMENT ON COLUMN public."tenants"."slug" IS 'Slug attribute for tenants.';
COMMENT ON COLUMN public."tenants"."database_name" IS 'Database name attribute for tenants.';
COMMENT ON COLUMN public."tenants"."connection_string" IS 'Connection string attribute for tenants.';
COMMENT ON COLUMN public."tenants"."qdrant_container_name" IS 'Qdrant container name attribute for tenants.';
COMMENT ON COLUMN public."tenants"."qdrant_http_port" IS 'Qdrant http port attribute for tenants.';
COMMENT ON COLUMN public."tenants"."qdrant_grpc_port" IS 'Qdrant grpc port attribute for tenants.';
COMMENT ON COLUMN public."tenants"."minio_endpoint" IS 'Minio endpoint attribute for tenants.';
COMMENT ON COLUMN public."tenants"."minio_bucket_name" IS 'Minio bucket name attribute for tenants.';
COMMENT ON COLUMN public."tenants"."status" IS 'Lifecycle status indicator for tenants.';
COMMENT ON COLUMN public."tenants"."tier" IS 'Tier attribute for tenants.';
COMMENT ON COLUMN public."tenants"."max_storage_bytes" IS 'Max storage bytes attribute for tenants.';
COMMENT ON COLUMN public."tenants"."max_users" IS 'Max users attribute for tenants.';
COMMENT ON COLUMN public."tenants"."max_api_calls_per_day" IS 'Max api calls per day attribute for tenants.';
COMMENT ON COLUMN public."tenants"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."tenants"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."tenants"."deleted_at" IS 'Timestamp (UTC) when the record was soft-deleted, or NULL if active.';
COMMENT ON COLUMN public."tenants"."created_by" IS 'Created by attribute for tenants.';

-- ----------------------------------------------------------------------------
-- Relation: public."user_permissions" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."user_permissions" IS 'Direct user-level permission overrides bypassing default role assignments.';
COMMENT ON COLUMN public."user_permissions"."user_id" IS 'Primary key identifier for user_permissions.';
COMMENT ON COLUMN public."user_permissions"."permission_id" IS 'Primary key identifier for user_permissions.';
COMMENT ON COLUMN public."user_permissions"."tenant_id" IS 'Multi-tenant isolation identifier.';
COMMENT ON COLUMN public."user_permissions"."granted_at" IS 'Granted at attribute for user_permissions.';
COMMENT ON COLUMN public."user_permissions"."granted_by" IS 'Granted by attribute for user_permissions.';

-- ----------------------------------------------------------------------------
-- Relation: public."user_preferences" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."user_preferences" IS 'User-specific UI settings, notification preferences, and workspace configurations.';
COMMENT ON COLUMN public."user_preferences"."id" IS 'Primary key identifier for user_preferences.';
COMMENT ON COLUMN public."user_preferences"."user_id" IS 'Identifier of the associated user account.';
COMMENT ON COLUMN public."user_preferences"."preference_key" IS 'Preference key attribute for user_preferences.';
COMMENT ON COLUMN public."user_preferences"."preference_value" IS 'Preference value attribute for user_preferences.';
COMMENT ON COLUMN public."user_preferences"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."user_preferences"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."user_roles" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."user_roles" IS 'Mapping associating platform users with security roles.';
COMMENT ON COLUMN public."user_roles"."user_id" IS 'Primary key identifier for user_roles.';
COMMENT ON COLUMN public."user_roles"."role_id" IS 'Primary key identifier for user_roles.';
COMMENT ON COLUMN public."user_roles"."tenant_id" IS 'Multi-tenant isolation identifier.';
COMMENT ON COLUMN public."user_roles"."assigned_at" IS 'Assigned at attribute for user_roles.';
COMMENT ON COLUMN public."user_roles"."assigned_by" IS 'Assigned by attribute for user_roles.';

-- ----------------------------------------------------------------------------
-- Relation: public."users" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."users" IS 'Internal administrative, operator, and staff user accounts.';
COMMENT ON COLUMN public."users"."id" IS 'Primary key identifier for users.';
COMMENT ON COLUMN public."users"."tenant_id" IS 'Foreign key referencing tenants.id.';
COMMENT ON COLUMN public."users"."email" IS 'Contact electronic mail address.';
COMMENT ON COLUMN public."users"."password_hash" IS 'Password hash attribute for users.';
COMMENT ON COLUMN public."users"."first_name" IS 'First name attribute for users.';
COMMENT ON COLUMN public."users"."last_name" IS 'Last name attribute for users.';
COMMENT ON COLUMN public."users"."email_confirmed" IS 'Email confirmed attribute for users.';
COMMENT ON COLUMN public."users"."email_confirmation_token" IS 'Email confirmation token attribute for users.';
COMMENT ON COLUMN public."users"."email_confirmation_token_expiry" IS 'Email confirmation token expiry attribute for users.';
COMMENT ON COLUMN public."users"."password_reset_token" IS 'Password reset token attribute for users.';
COMMENT ON COLUMN public."users"."password_reset_token_expiry" IS 'Password reset token expiry attribute for users.';
COMMENT ON COLUMN public."users"."role" IS 'Role attribute for users.';
COMMENT ON COLUMN public."users"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."users"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."users"."last_login_at" IS 'Last login at attribute for users.';
COMMENT ON COLUMN public."users"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."users"."deleted_at" IS 'Timestamp (UTC) when the record was soft-deleted, or NULL if active.';

-- ----------------------------------------------------------------------------
-- Relation: public."vendor_addresses" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."vendor_addresses" IS 'Vendor manufacturing hub and pickup warehouse addresses.';
COMMENT ON COLUMN public."vendor_addresses"."id" IS 'Primary key identifier for vendor_addresses.';
COMMENT ON COLUMN public."vendor_addresses"."vendor_id" IS 'Foreign key referencing vendors.id.';
COMMENT ON COLUMN public."vendor_addresses"."name" IS 'Display name or title of the vendor_addresses entity.';
COMMENT ON COLUMN public."vendor_addresses"."phone" IS 'Contact telephone number (E.164 formatted with country prefix).';
COMMENT ON COLUMN public."vendor_addresses"."line1" IS 'Line1 attribute for vendor_addresses.';
COMMENT ON COLUMN public."vendor_addresses"."line2" IS 'Line2 attribute for vendor_addresses.';
COMMENT ON COLUMN public."vendor_addresses"."pincode" IS 'Pincode attribute for vendor_addresses.';
COMMENT ON COLUMN public."vendor_addresses"."city" IS 'City attribute for vendor_addresses.';
COMMENT ON COLUMN public."vendor_addresses"."state" IS 'Lifecycle status indicator for vendor_addresses.';
COMMENT ON COLUMN public."vendor_addresses"."is_default" IS 'Is default attribute for vendor_addresses.';
COMMENT ON COLUMN public."vendor_addresses"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."vendor_addresses"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."vendor_contacts" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."vendor_contacts" IS 'Designated vendor contact persons, phone numbers, and communication channels.';
COMMENT ON COLUMN public."vendor_contacts"."id" IS 'Primary key identifier for vendor_contacts.';
COMMENT ON COLUMN public."vendor_contacts"."vendor_id" IS 'Foreign key referencing vendors.id.';
COMMENT ON COLUMN public."vendor_contacts"."contact_name" IS 'Contact name attribute for vendor_contacts.';
COMMENT ON COLUMN public."vendor_contacts"."contact_role" IS 'Contact role attribute for vendor_contacts.';
COMMENT ON COLUMN public."vendor_contacts"."phone_number" IS 'Contact telephone number (E.164 formatted with country prefix).';
COMMENT ON COLUMN public."vendor_contacts"."alternate_phone" IS 'Alternate phone attribute for vendor_contacts.';
COMMENT ON COLUMN public."vendor_contacts"."email" IS 'Contact electronic mail address.';
COMMENT ON COLUMN public."vendor_contacts"."is_primary" IS 'Indicates the primary contact person for the vendor';
COMMENT ON COLUMN public."vendor_contacts"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."vendor_contacts"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';

-- ----------------------------------------------------------------------------
-- Relation: public."vendor_listings" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."vendor_listings" IS 'Wholesale vendor supply catalog items mapped to internal product IDs.';
COMMENT ON COLUMN public."vendor_listings"."id" IS 'Primary key identifier for vendor_listings.';
COMMENT ON COLUMN public."vendor_listings"."variant_id" IS 'Foreign key referencing product_variants.id.';
COMMENT ON COLUMN public."vendor_listings"."vendor_id" IS 'Vendor id attribute for vendor_listings.';
COMMENT ON COLUMN public."vendor_listings"."external_id" IS 'External id attribute for vendor_listings.';
COMMENT ON COLUMN public."vendor_listings"."current_price" IS 'Current price attribute for vendor_listings.';
COMMENT ON COLUMN public."vendor_listings"."currency" IS 'Currency attribute for vendor_listings.';
COMMENT ON COLUMN public."vendor_listings"."is_favorite" IS 'Is favorite attribute for vendor_listings.';
COMMENT ON COLUMN public."vendor_listings"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."vendor_listings"."description" IS 'Descriptive text or notes regarding the vendor_listings record.';
COMMENT ON COLUMN public."vendor_listings"."url" IS 'Web URL or asset URI location.';
COMMENT ON COLUMN public."vendor_listings"."last_priced_at" IS 'Last priced at attribute for vendor_listings.';
COMMENT ON COLUMN public."vendor_listings"."raw_data_json" IS 'Raw data json attribute for vendor_listings.';
COMMENT ON COLUMN public."vendor_listings"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."vendor_listings"."product_id" IS 'Foreign key referencing products.id.';
COMMENT ON COLUMN public."vendor_listings"."source_group_id" IS 'Source group id attribute for vendor_listings.';
COMMENT ON COLUMN public."vendor_listings"."is_plus_shipping" IS 'Is plus shipping attribute for vendor_listings.';

-- ----------------------------------------------------------------------------
-- Relation: public."vendor_logistics_configs" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."vendor_logistics_configs" IS 'Vendor-specific logistics rules, dispatch lead times, and courier preferences.';
COMMENT ON COLUMN public."vendor_logistics_configs"."id" IS 'Primary key identifier for vendor_logistics_configs.';
COMMENT ON COLUMN public."vendor_logistics_configs"."vendor_id" IS 'Foreign key referencing vendors.id.';
COMMENT ON COLUMN public."vendor_logistics_configs"."vendor_name" IS 'Vendor name attribute for vendor_logistics_configs.';
COMMENT ON COLUMN public."vendor_logistics_configs"."fulfillment_mode" IS 'Fulfillment mode attribute for vendor_logistics_configs.';
COMMENT ON COLUMN public."vendor_logistics_configs"."return_warehouse_id" IS 'Foreign key referencing warehouses.id.';
COMMENT ON COLUMN public."vendor_logistics_configs"."default_pickup_pincode" IS 'Default pickup pincode attribute for vendor_logistics_configs.';
COMMENT ON COLUMN public."vendor_logistics_configs"."auto_manifest" IS 'Auto manifest attribute for vendor_logistics_configs.';
COMMENT ON COLUMN public."vendor_logistics_configs"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

-- ----------------------------------------------------------------------------
-- Relation: public."vendors" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."vendors" IS 'Master directory of saree manufacturers and wholesale vendor profiles.';
COMMENT ON COLUMN public."vendors"."id" IS 'Primary key identifier for vendors.';
COMMENT ON COLUMN public."vendors"."vendor_name" IS 'Vendor name attribute for vendors.';
COMMENT ON COLUMN public."vendors"."vendor_code" IS 'Optional short code for easy reference (e.g., "VAY-001")';
COMMENT ON COLUMN public."vendors"."email" IS 'Contact electronic mail address.';
COMMENT ON COLUMN public."vendors"."website" IS 'Website attribute for vendors.';
COMMENT ON COLUMN public."vendors"."notes" IS 'Descriptive text or notes regarding the vendors record.';
COMMENT ON COLUMN public."vendors"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."vendors"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."vendors"."updated_at" IS 'Timestamp (UTC) when the record was last modified.';
COMMENT ON COLUMN public."vendors"."external_id" IS 'External id attribute for vendors.';
COMMENT ON COLUMN public."vendors"."rating" IS 'Rating attribute for vendors.';
COMMENT ON COLUMN public."vendors"."is_trusted" IS 'Is trusted attribute for vendors.';
COMMENT ON COLUMN public."vendors"."first_name" IS 'First name attribute for vendors.';
COMMENT ON COLUMN public."vendors"."last_name" IS 'Last name attribute for vendors.';
COMMENT ON COLUMN public."vendors"."whatsapp_primary" IS 'Whatsapp primary attribute for vendors.';
COMMENT ON COLUMN public."vendors"."whatsapp_secondary" IS 'Whatsapp secondary attribute for vendors.';
COMMENT ON COLUMN public."vendors"."order_group_link" IS 'Order group link attribute for vendors.';
COMMENT ON COLUMN public."vendors"."is_favorite" IS 'Is favorite attribute for vendors.';
COMMENT ON COLUMN public."vendors"."default_warehouse_id" IS 'Foreign key referencing warehouses.id.';
COMMENT ON COLUMN public."vendors"."alias" IS 'Alias attribute for vendors.';

-- ----------------------------------------------------------------------------
-- Relation: public."video_insights" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."video_insights" IS 'AI-extracted video analytics including audio transcription, visual tags, and hook detection.';
COMMENT ON COLUMN public."video_insights"."id" IS 'Primary key identifier for video_insights.';
COMMENT ON COLUMN public."video_insights"."video_id" IS 'Foreign key referencing competitor_videos.id.';
COMMENT ON COLUMN public."video_insights"."insight_type" IS 'Insight type attribute for video_insights.';
COMMENT ON COLUMN public."video_insights"."insight_score" IS 'Insight score attribute for video_insights.';
COMMENT ON COLUMN public."video_insights"."insight_data" IS 'Insight data attribute for video_insights.';
COMMENT ON COLUMN public."video_insights"."detected_at" IS 'Detected at attribute for video_insights.';
COMMENT ON COLUMN public."video_insights"."dismissed" IS 'Dismissed attribute for video_insights.';
COMMENT ON COLUMN public."video_insights"."dismissed_at" IS 'Dismissed at attribute for video_insights.';
COMMENT ON COLUMN public."video_insights"."dismissed_by" IS 'Dismissed by attribute for video_insights.';

-- ----------------------------------------------------------------------------
-- Relation: public."view_instagram_competitor_outliers" (VIEW)
-- ----------------------------------------------------------------------------
COMMENT ON VIEW public."view_instagram_competitor_outliers" IS 'Analytical view computing virality multiplier and breakout tiers for competitor posts.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."post_id" IS 'Post id attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."platform_video_id" IS 'Platform video id attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."post_url" IS 'Post url attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."thumbnail_url" IS 'Thumbnail url attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."media_url" IS 'Web URL or asset URI location.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."media_type" IS 'Media type attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."storage_path" IS 'Storage path attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."title" IS 'Display name or title of the view_instagram_competitor_outliers entity.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."caption" IS 'Caption attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."posted_at" IS 'Posted at attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."profile_id" IS 'Profile id attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."profile_username" IS 'Profile username attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."profile_name" IS 'Profile name attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."profile_pic_url" IS 'Profile pic url attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."profile_pic_storage_path" IS 'Profile pic storage path attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."competitor_niche" IS 'Competitor niche attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."tracking_tier" IS 'Tracking tier attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."day_offset" IS 'Day offset attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."snapshot_date" IS 'Snapshot date attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."view_count" IS 'View count attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."like_count" IS 'Like count attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."comment_count" IS 'Comment count attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."share_count" IS 'Share count attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."daily_delta_likes" IS 'Daily delta likes attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."daily_delta_views" IS 'Daily delta views attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."velocity_score" IS 'Velocity score attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."engagement_rate" IS 'Engagement rate attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."profile_baseline_views" IS 'Profile baseline views attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."profile_baseline_delta_views" IS 'Profile baseline delta views attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."profile_baseline_likes" IS 'Profile baseline likes attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."niche_baseline_views" IS 'Niche baseline views attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."niche_baseline_likes" IS 'Niche baseline likes attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."outlier_score" IS 'Outlier score attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."virality_multiplier" IS 'Virality multiplier attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."delta_multiplier" IS 'Delta multiplier attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."day1_view_multiplier" IS 'Day1 view multiplier attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."outlier_tier" IS 'Outlier tier attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."is_day1_breakout" IS 'Is day1 breakout attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."is_delayed_breakout" IS 'Is delayed breakout attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."breakout_archetype" IS 'Breakout archetype attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."is_inspiration_candidate" IS 'Is inspiration candidate attribute for view_instagram_competitor_outliers.';
COMMENT ON COLUMN public."view_instagram_competitor_outliers"."caption_hook" IS 'Caption hook attribute for view_instagram_competitor_outliers.';

-- ----------------------------------------------------------------------------
-- Relation: public."view_instagram_niche_day_n_baselines" (VIEW)
-- ----------------------------------------------------------------------------
COMMENT ON VIEW public."view_instagram_niche_day_n_baselines" IS 'Analytical baseline view computing Day-N metric medians per competitor niche.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."competitor_niche" IS 'Competitor niche attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."day_offset" IS 'Day offset attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."sample_size" IS 'Sample size attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."avg_views" IS 'Avg views attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."p50_views" IS 'P50 views attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."p90_views" IS 'P90 views attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."avg_delta_views" IS 'Avg delta views attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."p50_delta_views" IS 'P50 delta views attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."avg_likes" IS 'Avg likes attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."p50_likes" IS 'P50 likes attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."p90_likes" IS 'P90 likes attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."p50_velocity_score" IS 'P50 velocity score attribute for view_instagram_niche_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_niche_day_n_baselines"."p90_velocity_score" IS 'P90 velocity score attribute for view_instagram_niche_day_n_baselines.';

-- ----------------------------------------------------------------------------
-- Relation: public."view_instagram_profile_day_n_baselines" (VIEW)
-- ----------------------------------------------------------------------------
COMMENT ON VIEW public."view_instagram_profile_day_n_baselines" IS 'Analytical baseline view computing Day-N metric medians per individual profile.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."profile_id" IS 'Profile id attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."username" IS 'Username attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."competitor_niche" IS 'Competitor niche attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."day_offset" IS 'Day offset attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."sample_size" IS 'Sample size attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."avg_views" IS 'Avg views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p50_views" IS 'P50 views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p75_views" IS 'P75 views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p90_views" IS 'P90 views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."stddev_views" IS 'Stddev views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."avg_delta_views" IS 'Avg delta views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p50_delta_views" IS 'P50 delta views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p75_delta_views" IS 'P75 delta views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p90_delta_views" IS 'P90 delta views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."stddev_delta_views" IS 'Stddev delta views attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."avg_likes" IS 'Avg likes attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p50_likes" IS 'P50 likes attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p75_likes" IS 'P75 likes attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p90_likes" IS 'P90 likes attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."stddev_likes" IS 'Stddev likes attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."avg_velocity_score" IS 'Avg velocity score attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p50_velocity_score" IS 'P50 velocity score attribute for view_instagram_profile_day_n_baselines.';
COMMENT ON COLUMN public."view_instagram_profile_day_n_baselines"."p90_velocity_score" IS 'P90 velocity score attribute for view_instagram_profile_day_n_baselines.';

-- ----------------------------------------------------------------------------
-- Relation: public."vw_account_pool_health" (VIEW)
-- ----------------------------------------------------------------------------
COMMENT ON VIEW public."vw_account_pool_health" IS 'Health monitoring view tracking proxy and account pool ban status and success rates.';
COMMENT ON COLUMN public."vw_account_pool_health"."platform" IS 'Platform attribute for vw_account_pool_health.';
COMMENT ON COLUMN public."vw_account_pool_health"."total_accounts" IS 'Total accounts attribute for vw_account_pool_health.';
COMMENT ON COLUMN public."vw_account_pool_health"."enabled_accounts" IS 'Enabled accounts attribute for vw_account_pool_health.';
COMMENT ON COLUMN public."vw_account_pool_health"."healthy_accounts" IS 'Healthy accounts attribute for vw_account_pool_health.';
COMMENT ON COLUMN public."vw_account_pool_health"."banned_accounts" IS 'Banned accounts attribute for vw_account_pool_health.';
COMMENT ON COLUMN public."vw_account_pool_health"."on_cooldown_accounts" IS 'On cooldown accounts attribute for vw_account_pool_health.';
COMMENT ON COLUMN public."vw_account_pool_health"."avg_failures" IS 'Avg failures attribute for vw_account_pool_health.';
COMMENT ON COLUMN public."vw_account_pool_health"."most_recent_use" IS 'Most recent use attribute for vw_account_pool_health.';

-- ----------------------------------------------------------------------------
-- Relation: public."vw_engagement_growth" (VIEW)
-- ----------------------------------------------------------------------------
COMMENT ON VIEW public."vw_engagement_growth" IS 'Analytical view tracking daily and weekly engagement growth velocity.';
COMMENT ON COLUMN public."vw_engagement_growth"."platform_video_id" IS 'Platform video id attribute for vw_engagement_growth.';
COMMENT ON COLUMN public."vw_engagement_growth"."title" IS 'Display name or title of the vw_engagement_growth entity.';
COMMENT ON COLUMN public."vw_engagement_growth"."video_id" IS 'Video id attribute for vw_engagement_growth.';
COMMENT ON COLUMN public."vw_engagement_growth"."snapshot_at" IS 'Snapshot at attribute for vw_engagement_growth.';
COMMENT ON COLUMN public."vw_engagement_growth"."view_count" IS 'View count attribute for vw_engagement_growth.';
COMMENT ON COLUMN public."vw_engagement_growth"."like_count" IS 'Like count attribute for vw_engagement_growth.';
COMMENT ON COLUMN public."vw_engagement_growth"."views_gained" IS 'Views gained attribute for vw_engagement_growth.';
COMMENT ON COLUMN public."vw_engagement_growth"."likes_gained" IS 'Likes gained attribute for vw_engagement_growth.';
COMMENT ON COLUMN public."vw_engagement_growth"."hours_since_last" IS 'Hours since last attribute for vw_engagement_growth.';
COMMENT ON COLUMN public."vw_engagement_growth"."view_growth_percent" IS 'View growth percent attribute for vw_engagement_growth.';
COMMENT ON COLUMN public."vw_engagement_growth"."video_age_hours" IS 'Video age hours attribute for vw_engagement_growth.';

-- ----------------------------------------------------------------------------
-- Relation: public."vw_follower_growth" (VIEW)
-- ----------------------------------------------------------------------------
COMMENT ON VIEW public."vw_follower_growth" IS 'Analytical view tracking follower count expansion rates across tracked competitors.';
COMMENT ON COLUMN public."vw_follower_growth"."username" IS 'Username attribute for vw_follower_growth.';
COMMENT ON COLUMN public."vw_follower_growth"."platform" IS 'Platform attribute for vw_follower_growth.';
COMMENT ON COLUMN public."vw_follower_growth"."watchlist_id" IS 'Watchlist id attribute for vw_follower_growth.';
COMMENT ON COLUMN public."vw_follower_growth"."snapshot_at" IS 'Snapshot at attribute for vw_follower_growth.';
COMMENT ON COLUMN public."vw_follower_growth"."follower_count" IS 'Follower count attribute for vw_follower_growth.';
COMMENT ON COLUMN public."vw_follower_growth"."following_count" IS 'Following count attribute for vw_follower_growth.';
COMMENT ON COLUMN public."vw_follower_growth"."followers_gained" IS 'Followers gained attribute for vw_follower_growth.';
COMMENT ON COLUMN public."vw_follower_growth"."follower_growth_percent" IS 'Follower growth percent attribute for vw_follower_growth.';
COMMENT ON COLUMN public."vw_follower_growth"."hours_since_last" IS 'Hours since last attribute for vw_follower_growth.';
COMMENT ON COLUMN public."vw_follower_growth"."followers_per_day" IS 'Followers per day attribute for vw_follower_growth.';

-- ----------------------------------------------------------------------------
-- Relation: public."warehouses" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."warehouses" IS 'Physical fulfillment centers and hub locations for inventory storage and pickup dispatch.';
COMMENT ON COLUMN public."warehouses"."id" IS 'Primary key identifier for warehouses.';
COMMENT ON COLUMN public."warehouses"."name" IS 'Display name or title of the warehouses entity.';
COMMENT ON COLUMN public."warehouses"."code" IS 'Code attribute for warehouses.';
COMMENT ON COLUMN public."warehouses"."address_line1" IS 'Address line1 attribute for warehouses.';
COMMENT ON COLUMN public."warehouses"."address_line2" IS 'Address line2 attribute for warehouses.';
COMMENT ON COLUMN public."warehouses"."city" IS 'City attribute for warehouses.';
COMMENT ON COLUMN public."warehouses"."state" IS 'Lifecycle status indicator for warehouses.';
COMMENT ON COLUMN public."warehouses"."pincode" IS 'Pincode attribute for warehouses.';
COMMENT ON COLUMN public."warehouses"."phone" IS 'Contact telephone number (E.164 formatted with country prefix).';
COMMENT ON COLUMN public."warehouses"."contact_person" IS 'Contact person attribute for warehouses.';
COMMENT ON COLUMN public."warehouses"."is_central" IS 'Is central attribute for warehouses.';
COMMENT ON COLUMN public."warehouses"."is_active" IS 'Boolean flag indicating whether the record is currently active.';
COMMENT ON COLUMN public."warehouses"."created_at" IS 'Timestamp (UTC) when the record was initially created.';
COMMENT ON COLUMN public."warehouses"."is_starred" IS 'Is starred attribute for warehouses.';
COMMENT ON COLUMN public."warehouses"."alias" IS 'Alias attribute for warehouses.';

-- ----------------------------------------------------------------------------
-- Relation: public."whatsapp_channels" (BASE TABLE)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public."whatsapp_channels" IS 'Registered WhatsApp Business API and cloud numbers used for customer messaging.';
COMMENT ON COLUMN public."whatsapp_channels"."id" IS 'Primary key identifier for whatsapp_channels.';
COMMENT ON COLUMN public."whatsapp_channels"."name" IS 'Display name or title of the whatsapp_channels entity.';
COMMENT ON COLUMN public."whatsapp_channels"."description" IS 'Descriptive text or notes regarding the whatsapp_channels record.';
COMMENT ON COLUMN public."whatsapp_channels"."created_at" IS 'Timestamp (UTC) when the record was initially created.';

COMMIT;
