--
-- PostgreSQL database dump
--

\restrict 7UOtmw7APa1X2GldAWQW0G8knnvEveTCkDZ7tRMWs5wXdsrVd3ILE8i9e8MBLR3

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.video_insights DROP CONSTRAINT IF EXISTS video_insights_video_id_fkey;
ALTER TABLE IF EXISTS ONLY public.vendor_contacts DROP CONSTRAINT IF EXISTS vendor_contacts_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public."orderId" DROP CONSTRAINT IF EXISTS studio_orders_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public."orderId" DROP CONSTRAINT IF EXISTS studio_orders_payment_mode_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seller_listings DROP CONSTRAINT IF EXISTS seller_listings_variant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seller_listings DROP CONSTRAINT IF EXISTS seller_listings_seller_id_fkey;
ALTER TABLE IF EXISTS ONLY public.search_queries DROP CONSTRAINT IF EXISTS search_queries_session_id_fkey;
ALTER TABLE IF EXISTS ONLY public.search_queries DROP CONSTRAINT IF EXISTS search_queries_collection_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scraper_jobs DROP CONSTRAINT IF EXISTS scraper_jobs_watchlist_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scraper_jobs DROP CONSTRAINT IF EXISTS scraper_jobs_scraper_session_id_fkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.media DROP CONSTRAINT IF EXISTS media_variant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_workloads DROP CONSTRAINT IF EXISTS k8s_workloads_namespace_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_workloads DROP CONSTRAINT IF EXISTS k8s_workloads_cluster_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_services DROP CONSTRAINT IF EXISTS k8s_services_namespace_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_services DROP CONSTRAINT IF EXISTS k8s_services_cluster_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_resource_metrics DROP CONSTRAINT IF EXISTS k8s_resource_metrics_cluster_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_pods DROP CONSTRAINT IF EXISTS k8s_pods_workload_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_pods DROP CONSTRAINT IF EXISTS k8s_pods_namespace_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_pods DROP CONSTRAINT IF EXISTS k8s_pods_cluster_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_nodes DROP CONSTRAINT IF EXISTS k8s_nodes_cluster_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_namespaces DROP CONSTRAINT IF EXISTS k8s_namespaces_cluster_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_events DROP CONSTRAINT IF EXISTS k8s_events_namespace_id_fkey;
ALTER TABLE IF EXISTS ONLY public.k8s_events DROP CONSTRAINT IF EXISTS k8s_events_cluster_id_fkey;
ALTER TABLE IF EXISTS ONLY public.infisical_secrets DROP CONSTRAINT IF EXISTS infisical_secrets_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.follower_snapshots DROP CONSTRAINT IF EXISTS follower_snapshots_watchlist_id_fkey;
ALTER TABLE IF EXISTS ONLY public."orderItem" DROP CONSTRAINT IF EXISTS fk_order_ref;
ALTER TABLE IF EXISTS ONLY public.entity_attachments DROP CONSTRAINT IF EXISTS entity_attachments_attachment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.engagement_snapshots DROP CONSTRAINT IF EXISTS engagement_snapshots_video_id_fkey;
ALTER TABLE IF EXISTS ONLY public.competitor_videos DROP CONSTRAINT IF EXISTS competitor_videos_watchlist_id_fkey;
DROP TRIGGER IF EXISTS trigger_watchlist_updated_at ON public.competitor_watchlist;
DROP TRIGGER IF EXISTS trigger_videos_updated_at ON public.competitor_videos;
DROP TRIGGER IF EXISTS trigger_sessions_updated_at ON public.scraper_sessions;
DROP INDEX IF EXISTS public.idx_watchlist_platform;
DROP INDEX IF EXISTS public.idx_videos_posted_at;
DROP INDEX IF EXISTS public.idx_vendors_name;
DROP INDEX IF EXISTS public.idx_vendors_active;
DROP INDEX IF EXISTS public.idx_vendor_contacts_vendor;
DROP INDEX IF EXISTS public.idx_system_health_status;
DROP INDEX IF EXISTS public.idx_system_health_service;
DROP INDEX IF EXISTS public.idx_system_health_recorded_at;
DROP INDEX IF EXISTS public.idx_system_health_metric;
DROP INDEX IF EXISTS public.idx_snapshots_video_time;
DROP INDEX IF EXISTS public.idx_service_dependencies_status;
DROP INDEX IF EXISTS public.idx_service_dependencies_service;
DROP INDEX IF EXISTS public.idx_service_dependencies_dependency;
DROP INDEX IF EXISTS public.idx_service_dependencies_critical;
DROP INDEX IF EXISTS public.idx_search_queries_timestamp;
DROP INDEX IF EXISTS public.idx_products_sku;
DROP INDEX IF EXISTS public.idx_platform_configs_updated_at;
DROP INDEX IF EXISTS public.idx_media_type;
DROP INDEX IF EXISTS public.idx_media_phash;
DROP INDEX IF EXISTS public.idx_k8s_workloads_type;
DROP INDEX IF EXISTS public.idx_k8s_workloads_namespace_id;
DROP INDEX IF EXISTS public.idx_k8s_workloads_name;
DROP INDEX IF EXISTS public.idx_k8s_workloads_last_sync;
DROP INDEX IF EXISTS public.idx_k8s_workloads_cluster_namespace;
DROP INDEX IF EXISTS public.idx_k8s_workloads_cluster_id;
DROP INDEX IF EXISTS public.idx_k8s_services_type;
DROP INDEX IF EXISTS public.idx_k8s_services_namespace_id;
DROP INDEX IF EXISTS public.idx_k8s_services_name;
DROP INDEX IF EXISTS public.idx_k8s_services_cluster_id;
DROP INDEX IF EXISTS public.idx_k8s_pods_workload_id;
DROP INDEX IF EXISTS public.idx_k8s_pods_phase;
DROP INDEX IF EXISTS public.idx_k8s_pods_node_name;
DROP INDEX IF EXISTS public.idx_k8s_pods_namespace_id;
DROP INDEX IF EXISTS public.idx_k8s_pods_name;
DROP INDEX IF EXISTS public.idx_k8s_pods_cluster_namespace;
DROP INDEX IF EXISTS public.idx_k8s_pods_cluster_id;
DROP INDEX IF EXISTS public.idx_k8s_nodes_status;
DROP INDEX IF EXISTS public.idx_k8s_nodes_role;
DROP INDEX IF EXISTS public.idx_k8s_nodes_name;
DROP INDEX IF EXISTS public.idx_k8s_nodes_heartbeat;
DROP INDEX IF EXISTS public.idx_k8s_nodes_cluster_id;
DROP INDEX IF EXISTS public.idx_k8s_namespaces_status;
DROP INDEX IF EXISTS public.idx_k8s_namespaces_name;
DROP INDEX IF EXISTS public.idx_k8s_namespaces_cluster_id;
DROP INDEX IF EXISTS public.idx_k8s_metrics_resource_type;
DROP INDEX IF EXISTS public.idx_k8s_metrics_resource_name;
DROP INDEX IF EXISTS public.idx_k8s_metrics_recorded_at;
DROP INDEX IF EXISTS public.idx_k8s_metrics_metric_name;
DROP INDEX IF EXISTS public.idx_k8s_metrics_cluster_resource_time;
DROP INDEX IF EXISTS public.idx_k8s_metrics_cluster_id;
DROP INDEX IF EXISTS public.idx_k8s_events_type;
DROP INDEX IF EXISTS public.idx_k8s_events_timestamps;
DROP INDEX IF EXISTS public.idx_k8s_events_reason;
DROP INDEX IF EXISTS public.idx_k8s_events_object_kind;
DROP INDEX IF EXISTS public.idx_k8s_events_namespace_id;
DROP INDEX IF EXISTS public.idx_k8s_events_cluster_time;
DROP INDEX IF EXISTS public.idx_k8s_events_cluster_id;
DROP INDEX IF EXISTS public.idx_k8s_clusters_provider;
DROP INDEX IF EXISTS public.idx_k8s_clusters_name;
DROP INDEX IF EXISTS public.idx_k8s_clusters_last_sync;
DROP INDEX IF EXISTS public.idx_k8s_clusters_active;
DROP INDEX IF EXISTS public.idx_jobs_status;
DROP INDEX IF EXISTS public.idx_insta_cache_scraped_at;
DROP INDEX IF EXISTS public.idx_infisical_secrets_project_id;
DROP INDEX IF EXISTS public.idx_infisical_secrets_last_accessed;
DROP INDEX IF EXISTS public.idx_infisical_secrets_key;
DROP INDEX IF EXISTS public.idx_infisical_projects_tenant_id;
DROP INDEX IF EXISTS public.idx_infisical_projects_project_id;
DROP INDEX IF EXISTS public.idx_infisical_projects_active;
DROP INDEX IF EXISTS public.idx_follower_snapshots_watchlist_time;
DROP INDEX IF EXISTS public.idx_entity_attachments_lookup;
DROP INDEX IF EXISTS public.idx_comments_entity;
DROP INDEX IF EXISTS public.idx_comments_attachments;
DROP INDEX IF EXISTS public.idx_attachments_original_filename;
DROP INDEX IF EXISTS public.idx_attachments_metadata;
DROP INDEX IF EXISTS public.idx_api_usage_tenant_timestamp;
DROP INDEX IF EXISTS public.idx_api_usage_logs_timestamp;
DROP INDEX IF EXISTS public.idx_api_usage_logs_tenant_id;
DROP INDEX IF EXISTS public.idx_api_usage_logs_status_code;
DROP INDEX IF EXISTS public.idx_api_usage_logs_endpoint;
ALTER TABLE IF EXISTS ONLY public.video_insights DROP CONSTRAINT IF EXISTS video_insights_video_id_insight_type_key;
ALTER TABLE IF EXISTS ONLY public.video_insights DROP CONSTRAINT IF EXISTS video_insights_pkey;
ALTER TABLE IF EXISTS ONLY public.vendors DROP CONSTRAINT IF EXISTS vendors_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_contacts DROP CONSTRAINT IF EXISTS vendor_contacts_pkey;
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_preference_key_key;
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_pkey;
ALTER TABLE IF EXISTS ONLY public."orderItem" DROP CONSTRAINT IF EXISTS uk_order_item_index;
ALTER TABLE IF EXISTS ONLY public.system_health_metrics DROP CONSTRAINT IF EXISTS system_health_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public."productId" DROP CONSTRAINT IF EXISTS studio_products_product_id_key;
ALTER TABLE IF EXISTS ONLY public."productId" DROP CONSTRAINT IF EXISTS studio_products_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_modes DROP CONSTRAINT IF EXISTS studio_payment_modes_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_modes DROP CONSTRAINT IF EXISTS studio_payment_modes_name_key;
ALTER TABLE IF EXISTS ONLY public."orderId" DROP CONSTRAINT IF EXISTS studio_orders_pkey;
ALTER TABLE IF EXISTS ONLY public."orderId" DROP CONSTRAINT IF EXISTS studio_orders_order_id_key;
ALTER TABLE IF EXISTS ONLY public.order_sources DROP CONSTRAINT IF EXISTS studio_order_sources_pkey;
ALTER TABLE IF EXISTS ONLY public.order_sources DROP CONSTRAINT IF EXISTS studio_order_sources_name_key;
ALTER TABLE IF EXISTS ONLY public.service_dependencies DROP CONSTRAINT IF EXISTS service_dependencies_service_name_dependency_name_key;
ALTER TABLE IF EXISTS ONLY public.service_dependencies DROP CONSTRAINT IF EXISTS service_dependencies_pkey;
ALTER TABLE IF EXISTS ONLY public.sellers DROP CONSTRAINT IF EXISTS sellers_pkey;
ALTER TABLE IF EXISTS ONLY public.sellers DROP CONSTRAINT IF EXISTS sellers_external_id_key;
ALTER TABLE IF EXISTS ONLY public.seller_listings DROP CONSTRAINT IF EXISTS seller_listings_pkey;
ALTER TABLE IF EXISTS ONLY public.search_sessions DROP CONSTRAINT IF EXISTS search_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.search_queries DROP CONSTRAINT IF EXISTS search_queries_pkey;
ALTER TABLE IF EXISTS ONLY public.scraper_sessions DROP CONSTRAINT IF EXISTS scraper_sessions_platform_username_key;
ALTER TABLE IF EXISTS ONLY public.scraper_sessions DROP CONSTRAINT IF EXISTS scraper_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.scraper_jobs DROP CONSTRAINT IF EXISTS scraper_jobs_pkey;
ALTER TABLE IF EXISTS ONLY public.scraper_jobs DROP CONSTRAINT IF EXISTS scraper_jobs_job_id_key;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_base_sku_key;
ALTER TABLE IF EXISTS ONLY public.product_variants DROP CONSTRAINT IF EXISTS product_variants_pkey;
ALTER TABLE IF EXISTS ONLY public.platform_configs DROP CONSTRAINT IF EXISTS platform_configs_pkey;
ALTER TABLE IF EXISTS ONLY public."orderItem" DROP CONSTRAINT IF EXISTS "orderItem_pkey";
ALTER TABLE IF EXISTS ONLY public.media DROP CONSTRAINT IF EXISTS media_pkey;
ALTER TABLE IF EXISTS ONLY public.media_deletion_queue DROP CONSTRAINT IF EXISTS media_deletion_queue_pkey;
ALTER TABLE IF EXISTS ONLY public.k8s_workloads DROP CONSTRAINT IF EXISTS k8s_workloads_pkey;
ALTER TABLE IF EXISTS ONLY public.k8s_workloads DROP CONSTRAINT IF EXISTS k8s_workloads_cluster_id_namespace_id_workload_name_workloa_key;
ALTER TABLE IF EXISTS ONLY public.k8s_services DROP CONSTRAINT IF EXISTS k8s_services_pkey;
ALTER TABLE IF EXISTS ONLY public.k8s_services DROP CONSTRAINT IF EXISTS k8s_services_cluster_id_namespace_id_service_name_key;
ALTER TABLE IF EXISTS ONLY public.k8s_resource_metrics DROP CONSTRAINT IF EXISTS k8s_resource_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.k8s_pods DROP CONSTRAINT IF EXISTS k8s_pods_pkey;
ALTER TABLE IF EXISTS ONLY public.k8s_pods DROP CONSTRAINT IF EXISTS k8s_pods_cluster_id_namespace_id_pod_name_key;
ALTER TABLE IF EXISTS ONLY public.k8s_nodes DROP CONSTRAINT IF EXISTS k8s_nodes_pkey;
ALTER TABLE IF EXISTS ONLY public.k8s_nodes DROP CONSTRAINT IF EXISTS k8s_nodes_cluster_id_node_name_key;
ALTER TABLE IF EXISTS ONLY public.k8s_namespaces DROP CONSTRAINT IF EXISTS k8s_namespaces_pkey;
ALTER TABLE IF EXISTS ONLY public.k8s_namespaces DROP CONSTRAINT IF EXISTS k8s_namespaces_cluster_id_namespace_name_key;
ALTER TABLE IF EXISTS ONLY public.k8s_events DROP CONSTRAINT IF EXISTS k8s_events_pkey;
ALTER TABLE IF EXISTS ONLY public.k8s_clusters DROP CONSTRAINT IF EXISTS k8s_clusters_pkey;
ALTER TABLE IF EXISTS ONLY public.k8s_clusters DROP CONSTRAINT IF EXISTS k8s_clusters_name_key;
ALTER TABLE IF EXISTS ONLY public.instagram_profile_cache DROP CONSTRAINT IF EXISTS instagram_profile_cache_pkey;
ALTER TABLE IF EXISTS ONLY public.ingestion_meta DROP CONSTRAINT IF EXISTS ingestion_meta_pkey;
ALTER TABLE IF EXISTS ONLY public.infisical_secrets DROP CONSTRAINT IF EXISTS infisical_secrets_project_id_secret_key_key;
ALTER TABLE IF EXISTS ONLY public.infisical_secrets DROP CONSTRAINT IF EXISTS infisical_secrets_pkey;
ALTER TABLE IF EXISTS ONLY public.infisical_projects DROP CONSTRAINT IF EXISTS infisical_projects_project_id_key;
ALTER TABLE IF EXISTS ONLY public.infisical_projects DROP CONSTRAINT IF EXISTS infisical_projects_pkey;
ALTER TABLE IF EXISTS ONLY public.image_collections DROP CONSTRAINT IF EXISTS image_collections_pkey;
ALTER TABLE IF EXISTS ONLY public.image_collections DROP CONSTRAINT IF EXISTS image_collections_name_key;
ALTER TABLE IF EXISTS ONLY public.follower_snapshots DROP CONSTRAINT IF EXISTS follower_snapshots_watchlist_id_snapshot_at_key;
ALTER TABLE IF EXISTS ONLY public.follower_snapshots DROP CONSTRAINT IF EXISTS follower_snapshots_pkey;
ALTER TABLE IF EXISTS ONLY public.entity_attachments DROP CONSTRAINT IF EXISTS entity_attachments_pkey;
ALTER TABLE IF EXISTS ONLY public.engagement_snapshots DROP CONSTRAINT IF EXISTS engagement_snapshots_video_id_snapshot_at_key;
ALTER TABLE IF EXISTS ONLY public.engagement_snapshots DROP CONSTRAINT IF EXISTS engagement_snapshots_pkey;
ALTER TABLE IF EXISTS ONLY public.competitor_watchlist DROP CONSTRAINT IF EXISTS competitor_watchlist_platform_username_key;
ALTER TABLE IF EXISTS ONLY public.competitor_watchlist DROP CONSTRAINT IF EXISTS competitor_watchlist_pkey;
ALTER TABLE IF EXISTS ONLY public.competitor_videos DROP CONSTRAINT IF EXISTS competitor_videos_platform_platform_video_id_key;
ALTER TABLE IF EXISTS ONLY public.competitor_videos DROP CONSTRAINT IF EXISTS competitor_videos_pkey;
ALTER TABLE IF EXISTS ONLY public.comments DROP CONSTRAINT IF EXISTS comments_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.attachments DROP CONSTRAINT IF EXISTS attachments_pkey;
ALTER TABLE IF EXISTS ONLY public.api_usage_logs DROP CONSTRAINT IF EXISTS api_usage_logs_pkey;
ALTER TABLE IF EXISTS public."productId" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payment_modes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_sources ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."orderItem" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."orderId" ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.video_insights;
DROP TABLE IF EXISTS public.vendors;
DROP TABLE IF EXISTS public.vendor_contacts;
DROP TABLE IF EXISTS public.user_preferences;
DROP TABLE IF EXISTS public.system_health_metrics;
DROP SEQUENCE IF EXISTS public.studio_payment_modes_id_seq;
DROP SEQUENCE IF EXISTS public.studio_order_sources_id_seq;
DROP TABLE IF EXISTS public.service_dependencies;
DROP TABLE IF EXISTS public.sellers;
DROP TABLE IF EXISTS public.seller_listings;
DROP TABLE IF EXISTS public.search_sessions;
DROP TABLE IF EXISTS public.search_queries;
DROP TABLE IF EXISTS public.scraper_sessions;
DROP TABLE IF EXISTS public.scraper_jobs;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.product_variants;
DROP SEQUENCE IF EXISTS public."productId_id_seq";
DROP TABLE IF EXISTS public."productId";
DROP TABLE IF EXISTS public.platform_configs;
DROP TABLE IF EXISTS public.payment_modes;
DROP TABLE IF EXISTS public.order_sources;
DROP SEQUENCE IF EXISTS public."orderItem_id_seq";
DROP TABLE IF EXISTS public."orderItem";
DROP SEQUENCE IF EXISTS public."orderId_id_seq";
DROP TABLE IF EXISTS public."orderId";
DROP TABLE IF EXISTS public.media_deletion_queue;
DROP TABLE IF EXISTS public.media;
DROP TABLE IF EXISTS public.k8s_workloads;
DROP TABLE IF EXISTS public.k8s_services;
DROP TABLE IF EXISTS public.k8s_resource_metrics;
DROP TABLE IF EXISTS public.k8s_pods;
DROP TABLE IF EXISTS public.k8s_nodes;
DROP TABLE IF EXISTS public.k8s_namespaces;
DROP TABLE IF EXISTS public.k8s_events;
DROP TABLE IF EXISTS public.k8s_clusters;
DROP TABLE IF EXISTS public.instagram_profile_cache;
DROP TABLE IF EXISTS public.ingestion_meta;
DROP TABLE IF EXISTS public.infisical_secrets;
DROP TABLE IF EXISTS public.infisical_projects;
DROP TABLE IF EXISTS public.image_collections;
DROP TABLE IF EXISTS public.follower_snapshots;
DROP TABLE IF EXISTS public.entity_attachments;
DROP TABLE IF EXISTS public.engagement_snapshots;
DROP TABLE IF EXISTS public.competitor_watchlist;
DROP TABLE IF EXISTS public.competitor_videos;
DROP TABLE IF EXISTS public.comments;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.attachments;
DROP TABLE IF EXISTS public.api_usage_logs;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.set_tenant_context(p_tenant_id uuid);
DROP FUNCTION IF EXISTS public.list_tenants(p_active_only boolean, p_plan_type character varying);
DROP FUNCTION IF EXISTS public.initialize_tenant_redis_database(p_tenant_id uuid);
DROP FUNCTION IF EXISTS public.get_tenant_info(p_tenant_id uuid);
DROP FUNCTION IF EXISTS public.delete_tenant(p_tenant_id uuid, p_confirm_deletion boolean);
DROP FUNCTION IF EXISTS public.create_tenant_qdrant_collection(p_tenant_id uuid, p_tenant_name character varying);
DROP FUNCTION IF EXISTS public.create_tenant_database(p_tenant_id uuid, p_tenant_name character varying, p_database_suffix character varying);
DROP FUNCTION IF EXISTS public.create_tenant(p_name character varying, p_domain character varying, p_subdomain character varying, p_plan_type character varying, p_storage_provider character varying, p_storage_config jsonb);
DROP FUNCTION IF EXISTS public.configure_tenant_storage(p_tenant_id uuid, p_provider character varying, p_configuration jsonb);
DROP FUNCTION IF EXISTS public.cleanup_instagram_cache(p_days integer);
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS hstore;
--
-- Name: hstore; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;


--
-- Name: EXTENSION hstore; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION hstore IS 'data type for storing sets of (key, value) pairs';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cleanup_instagram_cache(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_instagram_cache(p_days integer DEFAULT 7) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM instagram_profile_cache
    WHERE scraped_at < NOW() - (p_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_instagram_cache(p_days integer) OWNER TO postgres;

--
-- Name: configure_tenant_storage(uuid, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.configure_tenant_storage(p_tenant_id uuid, p_provider character varying, p_configuration jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_config_id UUID;
BEGIN
    INSERT INTO tenant_storage_configs (tenant_id, provider, configuration, is_active)
    VALUES (p_tenant_id, p_provider, p_configuration, true)
    RETURNING id INTO v_config_id;
    RETURN v_config_id;
END;
$$;


ALTER FUNCTION public.configure_tenant_storage(p_tenant_id uuid, p_provider character varying, p_configuration jsonb) OWNER TO postgres;

--
-- Name: create_tenant(character varying, character varying, character varying, character varying, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_tenant(p_name character varying, p_domain character varying DEFAULT NULL::character varying, p_subdomain character varying DEFAULT NULL::character varying, p_plan_type character varying DEFAULT 'free'::character varying, p_storage_provider character varying DEFAULT 'minio'::character varying, p_storage_config jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(tenant_id uuid, tenant_name character varying, database_name character varying, storage_config_id uuid, status character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tenant_id UUID;
    v_database_name VARCHAR(255);
    v_storage_config_id UUID;
    v_usage_limits JSONB;
BEGIN
    INSERT INTO tenants (name, domain, subdomain, plan_type, usage_limits, is_active)
    VALUES (p_name, p_domain, p_subdomain, p_plan_type, '{"storage_gb": 1}', true)
    RETURNING id INTO v_tenant_id;
    v_database_name := create_tenant_database(v_tenant_id, p_name, 'metadata');
    v_storage_config_id := configure_tenant_storage(v_tenant_id, p_storage_provider, p_storage_config);
    RETURN QUERY SELECT v_tenant_id, p_name, v_database_name, v_storage_config_id, 'created'::VARCHAR(20);
END;
$$;


ALTER FUNCTION public.create_tenant(p_name character varying, p_domain character varying, p_subdomain character varying, p_plan_type character varying, p_storage_provider character varying, p_storage_config jsonb) OWNER TO postgres;

--
-- Name: create_tenant_database(uuid, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_tenant_database(p_tenant_id uuid, p_tenant_name character varying, p_database_suffix character varying DEFAULT 'metadata'::character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_database_name VARCHAR(255);
    v_sql TEXT;
BEGIN
    v_database_name := 'tenant_' || REPLACE(p_tenant_name, '-', '_') || '_' || p_database_suffix;
    v_sql := 'CREATE DATABASE ' || quote_ident(v_database_name) || 
             ' WITH TEMPLATE tenant_metadata_template OWNER tenant_service';
    EXECUTE v_sql;
    INSERT INTO tenant_databases (tenant_id, database_name, database_type, connection_string_encrypted, is_active)
    VALUES (p_tenant_id, v_database_name, p_database_suffix, 'Host=localhost;Database=' || v_database_name || ';Username=tenant_service;Password=DeepLens123!', true);
    RETURN v_database_name;
END;
$$;


ALTER FUNCTION public.create_tenant_database(p_tenant_id uuid, p_tenant_name character varying, p_database_suffix character varying) OWNER TO postgres;

--
-- Name: create_tenant_qdrant_collection(uuid, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_tenant_qdrant_collection(p_tenant_id uuid, p_tenant_name character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_collection_name VARCHAR(255);
BEGIN
    -- Generate unique collection name
    v_collection_name := 'tenant_' || REPLACE(p_tenant_name, '-', '_') || '_vectors';
    
    -- Log Qdrant collection assignment
    INSERT INTO tenant_databases (tenant_id, database_name, database_type, connection_string_encrypted, is_active)
    VALUES (
        p_tenant_id,
        v_collection_name,
        'vectors',
        pgp_sym_encrypt(
            'Host=localhost;Port=6333;Collection=' || v_collection_name,
            current_setting('encryption.key', true)
        ),
        true
    )
    ON CONFLICT (tenant_id, database_type) DO UPDATE SET
        database_name = EXCLUDED.database_name,
        connection_string_encrypted = EXCLUDED.connection_string_encrypted;
    
    RETURN v_collection_name;
END;
$$;


ALTER FUNCTION public.create_tenant_qdrant_collection(p_tenant_id uuid, p_tenant_name character varying) OWNER TO postgres;

--
-- Name: delete_tenant(uuid, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_tenant(p_tenant_id uuid, p_confirm_deletion boolean DEFAULT false) RETURNS TABLE(tenant_id uuid, databases_dropped integer, status character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_database_record RECORD;
    v_databases_dropped INTEGER := 0;
BEGIN
    -- Safety check
    IF NOT p_confirm_deletion THEN
        RAISE EXCEPTION 'Tenant deletion requires confirmation. Set p_confirm_deletion to TRUE.';
    END IF;
    
    -- Check if tenant exists
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
    END IF;
    
    -- Drop all tenant databases
    FOR v_database_record IN 
        SELECT database_name FROM tenant_databases WHERE tenant_id = p_tenant_id AND is_active = true
    LOOP
        EXECUTE 'DROP DATABASE IF EXISTS ' || quote_ident(v_database_record.database_name);
        v_databases_dropped := v_databases_dropped + 1;
    END LOOP;
    
    -- Clean up tenant records (cascading deletes will handle related tables)
    DELETE FROM tenants WHERE id = p_tenant_id;
    
    -- Return cleanup summary
    RETURN QUERY SELECT 
        p_tenant_id,
        v_databases_dropped,
        'deleted'::VARCHAR(20);
END;
$$;


ALTER FUNCTION public.delete_tenant(p_tenant_id uuid, p_confirm_deletion boolean) OWNER TO postgres;

--
-- Name: get_tenant_info(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_tenant_info(p_tenant_id uuid) RETURNS TABLE(tenant_id uuid, tenant_name character varying, domain character varying, subdomain character varying, plan_type character varying, is_active boolean, created_at timestamp with time zone, usage_limits jsonb, database_count integer, storage_provider character varying, storage_status character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.domain,
        t.subdomain,
        t.plan_type,
        t.is_active,
        t.created_at,
        t.usage_limits,
        (SELECT COUNT(*)::INTEGER FROM tenant_databases td WHERE td.tenant_id = t.id AND td.is_active = true),
        (SELECT tsc.provider FROM tenant_storage_configs tsc WHERE tsc.tenant_id = t.id AND tsc.is_active = true LIMIT 1),
        (SELECT tsc.test_status FROM tenant_storage_configs tsc WHERE tsc.tenant_id = t.id AND tsc.is_active = true LIMIT 1)
    FROM tenants t
    WHERE t.id = p_tenant_id;
END;
$$;


ALTER FUNCTION public.get_tenant_info(p_tenant_id uuid) OWNER TO postgres;

--
-- Name: initialize_tenant_redis_database(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.initialize_tenant_redis_database(p_tenant_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_redis_db_number INTEGER;
BEGIN
    -- Calculate Redis database number (0-15) based on tenant ID hash
    v_redis_db_number := (hashtext(p_tenant_id::TEXT) % 16);
    
    -- Log Redis database assignment
    INSERT INTO tenant_databases (tenant_id, database_name, database_type, connection_string_encrypted, is_active)
    VALUES (
        p_tenant_id,
        'redis_db_' || v_redis_db_number,
        'cache',
        pgp_sym_encrypt(
            'Host=localhost;Port=6379;Database=' || v_redis_db_number,
            current_setting('encryption.key', true)
        ),
        true
    )
    ON CONFLICT (tenant_id, database_type) DO UPDATE SET
        database_name = EXCLUDED.database_name,
        connection_string_encrypted = EXCLUDED.connection_string_encrypted;
    
    RETURN v_redis_db_number;
END;
$$;


ALTER FUNCTION public.initialize_tenant_redis_database(p_tenant_id uuid) OWNER TO postgres;

--
-- Name: list_tenants(boolean, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.list_tenants(p_active_only boolean DEFAULT true, p_plan_type character varying DEFAULT NULL::character varying) RETURNS TABLE(tenant_id uuid, tenant_name character varying, domain character varying, plan_type character varying, is_active boolean, created_at timestamp with time zone, database_count integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.domain,
        t.plan_type,
        t.is_active,
        t.created_at,
        (SELECT COUNT(*)::INTEGER FROM tenant_databases td WHERE td.tenant_id = t.id AND td.is_active = true)
    FROM tenants t
    WHERE 
        (p_active_only = FALSE OR t.is_active = true) AND
        (p_plan_type IS NULL OR t.plan_type = p_plan_type)
    ORDER BY t.created_at DESC;
END;
$$;


ALTER FUNCTION public.list_tenants(p_active_only boolean, p_plan_type character varying) OWNER TO postgres;

--
-- Name: set_tenant_context(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_tenant_context(p_tenant_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Set the current tenant ID for Row Level Security
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, true);
END;
$$;


ALTER FUNCTION public.set_tenant_context(p_tenant_id uuid) OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_usage_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_usage_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid,
    endpoint character varying(255) NOT NULL,
    method character varying(10) NOT NULL,
    status_code integer NOT NULL,
    response_time_ms integer,
    user_id uuid,
    "timestamp" timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.api_usage_logs OWNER TO postgres;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_name character varying(63) NOT NULL,
    object_key text NOT NULL,
    content_type character varying(100),
    file_size_bytes bigint,
    original_filename character varying(255),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.attachments OWNER TO postgres;

--
-- Name: TABLE attachments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.attachments IS 'Centralized registry for all files uploaded to MinIO across the DeepLens platform';


--
-- Name: COLUMN attachments.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.attachments.id IS 'The unique ID used to reference this file in other tables';


--
-- Name: COLUMN attachments.object_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.attachments.object_key IS 'The full path/key inside the MinIO bucket';


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    metadata_json jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id text NOT NULL,
    author_id uuid,
    content text NOT NULL,
    attachment_ids uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: TABLE comments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.comments IS 'Structured messages/notes for any entity in the system, supporting multiple file attachments per comment';


--
-- Name: COLUMN comments.attachment_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.comments.attachment_ids IS 'Array of UUIDs referring to the centralized attachments table';


--
-- Name: competitor_videos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.competitor_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    watchlist_id uuid NOT NULL,
    platform character varying(20) NOT NULL,
    platform_video_id character varying(255) NOT NULL,
    url text NOT NULL,
    title text,
    description text,
    posted_at timestamp with time zone NOT NULL,
    view_count bigint DEFAULT 0,
    like_count bigint DEFAULT 0,
    comment_count bigint DEFAULT 0,
    share_count bigint DEFAULT 0,
    repost_count bigint DEFAULT 0,
    media_type character varying(20),
    thumbnail_url text,
    media_url text,
    media_urls text[],
    duration_seconds integer,
    width integer,
    height integer,
    file_size_bytes bigint,
    hashtags text[],
    mentions text[],
    location character varying(255),
    is_reel boolean,
    is_short boolean,
    category character varying(100),
    raw_metadata jsonb,
    tagged_sku_ids uuid[],
    ai_suggested_sku_ids uuid[],
    tagging_confidence jsonb,
    tagging_notes text,
    download_status character varying(20) DEFAULT 'pending'::character varying,
    download_error text,
    downloaded_at timestamp with time zone,
    tracking_phase character varying(20) DEFAULT 'early'::character varying,
    last_engagement_snapshot_at timestamp with time zone,
    scraped_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT competitor_videos_platform_check CHECK (((platform)::text = ANY ((ARRAY['instagram'::character varying, 'youtube'::character varying])::text[])))
);


ALTER TABLE public.competitor_videos OWNER TO postgres;

--
-- Name: competitor_watchlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.competitor_watchlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform character varying(20) NOT NULL,
    username character varying(255) NOT NULL,
    platform_id character varying(255),
    display_name character varying(255),
    profile_pic_url text,
    bio text,
    tags text[],
    enabled boolean DEFAULT true,
    follower_count integer,
    following_count integer,
    post_count integer,
    last_scraped_at timestamp with time zone,
    scrape_failures_count integer DEFAULT 0,
    last_follower_sync_at timestamp with time zone,
    follower_count_at_last_sync integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT competitor_watchlist_platform_check CHECK (((platform)::text = ANY ((ARRAY['instagram'::character varying, 'youtube'::character varying])::text[])))
);


ALTER TABLE public.competitor_watchlist OWNER TO postgres;

--
-- Name: engagement_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.engagement_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id uuid NOT NULL,
    view_count integer DEFAULT 0,
    like_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    share_count integer DEFAULT 0,
    repost_count integer DEFAULT 0,
    video_age_hours integer,
    tracking_phase character varying(20),
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.engagement_snapshots OWNER TO postgres;

--
-- Name: entity_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attachment_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id text NOT NULL,
    tag character varying(50),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.entity_attachments OWNER TO postgres;

--
-- Name: TABLE entity_attachments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.entity_attachments IS 'Universal junction table linking any business entity to attachments stored in MinIO';


--
-- Name: COLUMN entity_attachments.entity_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_attachments.entity_type IS 'The name of the table or business entity (e.g., order, category)';


--
-- Name: COLUMN entity_attachments.entity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_attachments.entity_id IS 'The primary key of the related entity (stored as string for flexibility)';


--
-- Name: follower_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.follower_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    watchlist_id uuid NOT NULL,
    follower_count integer NOT NULL,
    following_count integer NOT NULL,
    follower_following_ratio numeric(10,2),
    engagement_rate numeric(5,2),
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.follower_snapshots OWNER TO postgres;

--
-- Name: image_collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.image_collections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_public boolean DEFAULT false,
    total_images integer DEFAULT 0,
    metadata jsonb
);


ALTER TABLE public.image_collections OWNER TO postgres;

--
-- Name: infisical_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.infisical_projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid,
    project_id character varying(255) NOT NULL,
    project_name character varying(255) NOT NULL,
    environment character varying(50) DEFAULT 'development'::character varying,
    client_id character varying(255) NOT NULL,
    client_secret_encrypted text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    last_sync timestamp with time zone
);


ALTER TABLE public.infisical_projects OWNER TO postgres;

--
-- Name: infisical_secrets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.infisical_secrets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid,
    secret_key character varying(255) NOT NULL,
    secret_version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    last_accessed timestamp with time zone,
    access_count integer DEFAULT 0
);


ALTER TABLE public.infisical_secrets OWNER TO postgres;

--
-- Name: ingestion_meta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ingestion_meta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ingestion_meta OWNER TO postgres;

--
-- Name: instagram_profile_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instagram_profile_cache (
    username character varying(255) NOT NULL,
    user_id character varying(255),
    full_name text,
    biography text,
    followers_count integer,
    following_count integer,
    posts_count integer,
    profile_pic_url text,
    external_url text,
    is_private boolean,
    is_verified boolean,
    scraped_at timestamp with time zone DEFAULT now(),
    raw_json jsonb
);


ALTER TABLE public.instagram_profile_cache OWNER TO postgres;

--
-- Name: k8s_clusters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.k8s_clusters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    cluster_endpoint character varying(500) NOT NULL,
    cluster_version character varying(50),
    provider character varying(50),
    region character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    last_sync timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    kubeconfig_encrypted text
);


ALTER TABLE public.k8s_clusters OWNER TO postgres;

--
-- Name: k8s_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.k8s_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cluster_id uuid NOT NULL,
    namespace_id uuid,
    event_type character varying(50),
    reason character varying(255),
    message text,
    involved_object_kind character varying(100),
    involved_object_name character varying(255),
    involved_object_namespace character varying(255),
    source_component character varying(255),
    source_host character varying(255),
    first_timestamp timestamp with time zone,
    last_timestamp timestamp with time zone,
    event_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.k8s_events OWNER TO postgres;

--
-- Name: k8s_namespaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.k8s_namespaces (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cluster_id uuid NOT NULL,
    namespace_name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    labels jsonb DEFAULT '{}'::jsonb,
    annotations jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.k8s_namespaces OWNER TO postgres;

--
-- Name: k8s_nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.k8s_nodes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cluster_id uuid NOT NULL,
    node_name character varying(255) NOT NULL,
    node_role character varying(50),
    node_status character varying(50) DEFAULT 'Unknown'::character varying,
    cpu_capacity character varying(20),
    memory_capacity character varying(20),
    storage_capacity character varying(20),
    os_image character varying(255),
    kernel_version character varying(100),
    container_runtime character varying(100),
    kubelet_version character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    last_heartbeat timestamp with time zone,
    labels jsonb DEFAULT '{}'::jsonb,
    annotations jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.k8s_nodes OWNER TO postgres;

--
-- Name: k8s_pods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.k8s_pods (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cluster_id uuid NOT NULL,
    namespace_id uuid NOT NULL,
    workload_id uuid,
    pod_name character varying(255) NOT NULL,
    pod_ip inet,
    node_name character varying(255),
    phase character varying(50),
    restart_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    last_sync timestamp with time zone,
    labels jsonb DEFAULT '{}'::jsonb,
    annotations jsonb DEFAULT '{}'::jsonb,
    containers jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.k8s_pods OWNER TO postgres;

--
-- Name: k8s_resource_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.k8s_resource_metrics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cluster_id uuid NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_name character varying(255) NOT NULL,
    namespace_name character varying(255),
    metric_name character varying(100) NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit character varying(20),
    recorded_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.k8s_resource_metrics OWNER TO postgres;

--
-- Name: k8s_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.k8s_services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cluster_id uuid NOT NULL,
    namespace_id uuid NOT NULL,
    service_name character varying(255) NOT NULL,
    service_type character varying(50),
    cluster_ip inet,
    external_ips inet[],
    ports jsonb DEFAULT '[]'::jsonb,
    selector jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    last_sync timestamp with time zone,
    labels jsonb DEFAULT '{}'::jsonb,
    annotations jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.k8s_services OWNER TO postgres;

--
-- Name: k8s_workloads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.k8s_workloads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cluster_id uuid NOT NULL,
    namespace_id uuid NOT NULL,
    workload_name character varying(255) NOT NULL,
    workload_type character varying(50) NOT NULL,
    replicas_desired integer DEFAULT 0,
    replicas_ready integer DEFAULT 0,
    replicas_available integer DEFAULT 0,
    image_names text[],
    created_at timestamp with time zone DEFAULT now(),
    last_sync timestamp with time zone,
    labels jsonb DEFAULT '{}'::jsonb,
    annotations jsonb DEFAULT '{}'::jsonb,
    spec jsonb DEFAULT '{}'::jsonb,
    status jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.k8s_workloads OWNER TO postgres;

--
-- Name: media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid,
    storage_path character varying(500) NOT NULL,
    media_type smallint DEFAULT 1,
    original_filename character varying(255),
    file_size_bytes bigint,
    mime_type character varying(100),
    status smallint DEFAULT 0,
    vector_id uuid,
    phash character varying(64),
    is_default boolean DEFAULT false,
    quality_score numeric,
    width integer,
    height integer,
    duration_seconds numeric,
    thumbnail_path character varying(500),
    preview_path character varying(500),
    features_extracted boolean DEFAULT false,
    indexed boolean DEFAULT false,
    uploaded_at timestamp with time zone DEFAULT now(),
    metadata_json jsonb
);


ALTER TABLE public.media OWNER TO postgres;

--
-- Name: media_deletion_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_deletion_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    media_id uuid NOT NULL,
    storage_path character varying(500) NOT NULL,
    deleted_from_disk boolean DEFAULT false,
    deleted_from_vector boolean DEFAULT false,
    retries integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone
);


ALTER TABLE public.media_deletion_queue OWNER TO postgres;

--
-- Name: orderId; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."orderId" (
    id integer CONSTRAINT studio_orders_id_not_null NOT NULL,
    order_id character varying(10) CONSTRAINT studio_orders_order_id_not_null NOT NULL,
    source_id integer,
    payment_mode_id integer,
    created_at timestamp with time zone DEFAULT now(),
    customer_phone character varying(20),
    source_handle character varying(255),
    instagram_user_id character varying(100),
    customer_address text,
    transaction_id character varying(100),
    instagram_handle character varying(255)
);


ALTER TABLE public."orderId" OWNER TO postgres;

--
-- Name: TABLE "orderId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."orderId" IS 'Stores generated order IDs and associated metadata. Source handle can be whatsapp number or instagram handle.';


--
-- Name: COLUMN "orderId".transaction_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."orderId".transaction_id IS 'UPI or bank transaction ID for the order payment';


--
-- Name: COLUMN "orderId".instagram_handle; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."orderId".instagram_handle IS 'Fallback/Original instagram handle for the order.';


--
-- Name: orderId_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."orderId_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."orderId_id_seq" OWNER TO postgres;

--
-- Name: orderId_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."orderId_id_seq" OWNED BY public."orderId".id;


--
-- Name: orderItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."orderItem" (
    id integer NOT NULL,
    order_id_ref integer NOT NULL,
    item_index integer NOT NULL,
    quantity integer DEFAULT 1,
    price numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    product_id text,
    comments text
);


ALTER TABLE public."orderItem" OWNER TO postgres;

--
-- Name: COLUMN "orderItem".product_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."orderItem".product_id IS 'Unified text field for product identification (handles both generated and manual IDs).';


--
-- Name: orderItem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."orderItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."orderItem_id_seq" OWNER TO postgres;

--
-- Name: orderItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."orderItem_id_seq" OWNED BY public."orderItem".id;


--
-- Name: order_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_sources (
    id integer CONSTRAINT studio_order_sources_id_not_null NOT NULL,
    name character varying(50) CONSTRAINT studio_order_sources_name_not_null NOT NULL
);


ALTER TABLE public.order_sources OWNER TO postgres;

--
-- Name: payment_modes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_modes (
    id integer CONSTRAINT studio_payment_modes_id_not_null NOT NULL,
    name character varying(50) CONSTRAINT studio_payment_modes_name_not_null NOT NULL
);


ALTER TABLE public.payment_modes OWNER TO postgres;

--
-- Name: platform_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_configs (
    key character varying(255) NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


ALTER TABLE public.platform_configs OWNER TO postgres;

--
-- Name: productId; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."productId" (
    id integer CONSTRAINT studio_products_id_not_null NOT NULL,
    product_id character varying(10) CONSTRAINT studio_products_product_id_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."productId" OWNER TO postgres;

--
-- Name: productId_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."productId_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."productId_id_seq" OWNER TO postgres;

--
-- Name: productId_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."productId_id_seq" OWNED BY public."productId".id;


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_sku character varying(100),
    color character varying(50),
    fabric character varying(100),
    stitch_type character varying(50),
    work_heaviness character varying(50),
    search_keywords text[],
    attributes_json jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_variants OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    base_sku character varying(100),
    title character varying(255),
    tags text[],
    unified_attributes jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: scraper_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scraper_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    watchlist_id uuid,
    job_type character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    items_found integer DEFAULT 0,
    items_processed integer DEFAULT 0,
    items_failed integer DEFAULT 0,
    error_message text,
    error_details jsonb,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_ms integer,
    worker_id character varying(100),
    scraper_session_id uuid,
    kafka_topic character varying(100),
    kafka_partition integer,
    kafka_offset bigint,
    triggered_by character varying(50),
    config_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scraper_jobs OWNER TO postgres;

--
-- Name: scraper_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scraper_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform character varying(20) NOT NULL,
    username character varying(255) NOT NULL,
    display_name character varying(255),
    session_cookies text,
    session_metadata jsonb,
    api_token text,
    last_used_at timestamp with time zone,
    last_health_check_at timestamp with time zone,
    health_status character varying(20) DEFAULT 'unknown'::character varying,
    consecutive_failures integer DEFAULT 0,
    total_requests_today integer DEFAULT 0,
    on_cooldown boolean DEFAULT false,
    cooldown_until timestamp with time zone,
    rotation_strategy character varying(20) DEFAULT 'round_robin'::character varying,
    usage_count integer DEFAULT 0,
    enabled boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scraper_sessions_platform_check CHECK (((platform)::text = ANY ((ARRAY['instagram'::character varying, 'youtube'::character varying])::text[])))
);


ALTER TABLE public.scraper_sessions OWNER TO postgres;

--
-- Name: search_queries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.search_queries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id uuid,
    query_type character varying(50) NOT NULL,
    query_vector_id character varying(255),
    query_text text,
    collection_id uuid,
    results_count integer DEFAULT 0,
    response_time_ms integer,
    similarity_threshold double precision DEFAULT 0.8,
    "timestamp" timestamp with time zone DEFAULT now(),
    metadata jsonb
);


ALTER TABLE public.search_queries OWNER TO postgres;

--
-- Name: search_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.search_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_start timestamp with time zone DEFAULT now(),
    session_end timestamp with time zone,
    total_searches integer DEFAULT 0,
    ip_address inet,
    user_agent text,
    metadata jsonb
);


ALTER TABLE public.search_sessions OWNER TO postgres;

--
-- Name: seller_listings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid,
    seller_id uuid,
    external_id character varying(100),
    current_price numeric(18,2),
    currency character varying(10) DEFAULT 'INR'::character varying,
    shipping_info character varying(50) DEFAULT 'plus shipping'::character varying,
    is_favorite boolean DEFAULT false,
    is_active boolean DEFAULT true,
    description text,
    url character varying(500),
    last_priced_at timestamp with time zone DEFAULT now(),
    raw_data_json jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.seller_listings OWNER TO postgres;

--
-- Name: sellers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sellers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_id character varying(100),
    name character varying(255) NOT NULL,
    contact_info text,
    rating numeric DEFAULT 0,
    is_trusted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sellers OWNER TO postgres;

--
-- Name: service_dependencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_dependencies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    service_name character varying(100) NOT NULL,
    dependency_name character varying(100) NOT NULL,
    dependency_type character varying(50) NOT NULL,
    is_critical boolean DEFAULT true,
    health_check_url character varying(500),
    last_check timestamp with time zone,
    status character varying(20) DEFAULT 'unknown'::character varying,
    response_time_ms integer
);


ALTER TABLE public.service_dependencies OWNER TO postgres;

--
-- Name: studio_order_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.studio_order_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.studio_order_sources_id_seq OWNER TO postgres;

--
-- Name: studio_order_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.studio_order_sources_id_seq OWNED BY public.order_sources.id;


--
-- Name: studio_payment_modes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.studio_payment_modes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.studio_payment_modes_id_seq OWNER TO postgres;

--
-- Name: studio_payment_modes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.studio_payment_modes_id_seq OWNED BY public.payment_modes.id;


--
-- Name: system_health_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_health_metrics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    service_name character varying(100) NOT NULL,
    metric_name character varying(100) NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit character varying(20),
    status character varying(20) DEFAULT 'healthy'::character varying,
    recorded_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.system_health_metrics OWNER TO postgres;

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    preference_key character varying(255) NOT NULL,
    preference_value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_preferences OWNER TO postgres;

--
-- Name: vendor_contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendor_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    contact_name character varying(255) NOT NULL,
    contact_role character varying(100),
    phone_number character varying(20),
    alternate_phone character varying(20),
    email character varying(255),
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vendor_contacts OWNER TO postgres;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_name character varying(255) NOT NULL,
    vendor_code character varying(50),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100) DEFAULT 'India'::character varying,
    postal_code character varying(20),
    email character varying(255),
    website character varying(255),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- Name: video_insights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.video_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id uuid NOT NULL,
    insight_type character varying(50) NOT NULL,
    insight_score numeric(5,2) NOT NULL,
    insight_data jsonb,
    detected_at timestamp with time zone DEFAULT now(),
    dismissed boolean DEFAULT false,
    dismissed_at timestamp with time zone,
    dismissed_by character varying(255)
);


ALTER TABLE public.video_insights OWNER TO postgres;

--
-- Name: orderId id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."orderId" ALTER COLUMN id SET DEFAULT nextval('public."orderId_id_seq"'::regclass);


--
-- Name: orderItem id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."orderItem" ALTER COLUMN id SET DEFAULT nextval('public."orderItem_id_seq"'::regclass);


--
-- Name: order_sources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_sources ALTER COLUMN id SET DEFAULT nextval('public.studio_order_sources_id_seq'::regclass);


--
-- Name: payment_modes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_modes ALTER COLUMN id SET DEFAULT nextval('public.studio_payment_modes_id_seq'::regclass);


--
-- Name: productId id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."productId" ALTER COLUMN id SET DEFAULT nextval('public."productId_id_seq"'::regclass);


--
-- Data for Name: api_usage_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_usage_logs (id, tenant_id, endpoint, method, status_code, response_time_ms, user_id, "timestamp", metadata) FROM stdin;
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attachments (id, bucket_name, object_key, content_type, file_size_bytes, original_filename, metadata, created_at) FROM stdin;
7831c6ae-d438-4008-aad3-84753334e08e	deeplens-storage	orders/0000Q/transactions/2026-04-19/ac09f0fb86e24ea1b3617f848e5bf16f_txn_0000Q.jpg	image/jpeg	312500	txn_0000Q.jpg	{}	2026-04-19 18:17:34.892143+00
36262a57-d433-4360-acac-444150af39c5	deeplens-storage	orders/0000Q/transactions/2026-04-19/e79489f638de422facf5698e0692d0e2_txn_0000Q.jpg	image/jpeg	312500	txn_0000Q.jpg	{}	2026-04-19 18:18:29.707126+00
e8a74332-bbe9-448f-85b4-35ae5ebf4703	deeplens-storage	orders/0000Q/transactions/2026-04-19/4d4c0e23996c4340a88c82c2ffa1bca0_txn_0000Q.jpg	image/jpeg	164139	txn_0000Q.jpg	{}	2026-04-19 18:26:32.23966+00
a057fc0a-f1fa-4c03-83d9-7c6dc1152a45	deeplens-storage	orders/0000Q/transactions/2026-04-19/cda0960ec9a948ce87238801c731d04e_txn_0000Q.jpg	image/jpeg	298633	txn_0000Q.jpg	{}	2026-04-19 19:01:12.847437+00
8831feab-bfa6-4fdb-980e-5f70373ad081	deeplens-storage	orders/0000R/comments/2026-04-19/401e785f555741ea9bf771920a4ee1d6_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 19:58:28.990568+00
2f8fa93c-0078-4f5d-998a-8137d8bce3d3	deeplens-storage	orders/0000R/comments/2026-04-19/12514a2cecf04357936491ceffc816eb_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 19:59:55.705432+00
ed8e90f5-cd8a-49cf-a1bb-11238db56798	deeplens-storage	orders/0000R/comments/2026-04-19/05524626716c4a809c05d97e87f7916f_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:00:52.629383+00
50f5013f-ca6c-4bea-9e48-6c1b09204179	deeplens-storage	orders/0000R/comments/2026-04-19/60c50f992007407ba29b40ec76cf601f_IMG_20260418_224510_000.jpg	image/jpeg	174407	IMG_20260418_224510_000.jpg	{}	2026-04-19 20:00:52.793406+00
14d76737-be23-491c-a9e4-bccc664cb1d0	deeplens-storage	orders/0000R/comments/2026-04-19/74184a923b8442e0b50b53d0186b0066_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:02:16.456753+00
e0998844-ec1f-462e-9be3-ec54d95897ab	deeplens-storage	orders/0000R/comments/2026-04-19/2018eafa20b34bf5a14e3b771f2cbec9_IMG_20260418_224510_000.jpg	image/jpeg	174407	IMG_20260418_224510_000.jpg	{}	2026-04-19 20:02:16.702387+00
81c7eb8c-a8e7-4ea5-a778-9f2780a74375	deeplens-storage	orders/0000R/comments/2026-04-19/be001e223c4f4a7da354f4c4e807ad4e_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:03:09.777047+00
2193cab9-5b66-434f-9a70-50527ff252da	deeplens-storage	orders/0000R/comments/2026-04-19/4fca80594caa499eaf43322e1e4d8920_IMG_20260418_224510_000.jpg	image/jpeg	174407	IMG_20260418_224510_000.jpg	{}	2026-04-19 20:03:09.925824+00
5467cd49-4990-46d0-8c22-b0660b1f89c3	deeplens-storage	orders/0000R/transactions/2026-04-19/8c3056fbf38441008e9704e21be32285_txn_0000R.jpg	image/jpeg	1016280	txn_0000R.jpg	{}	2026-04-19 20:04:15.39907+00
d9e2609d-b572-4b11-ae3d-69078b81b927	deeplens-storage	orders/0000R/comments/2026-04-19/5c4556d9172e43fdb963066dd17660a7_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:05:10.462227+00
dd4a4870-ff5b-4509-bd43-870f958dc793	deeplens-storage	orders/0000R/comments/2026-04-19/16edf19934fe4160a4ad1a62a6fdec18_IMG_20260418_224510_000.jpg	image/jpeg	174407	IMG_20260418_224510_000.jpg	{}	2026-04-19 20:05:10.610536+00
147e4941-9767-4039-8c86-f5058f572a36	deeplens-storage	orders/0000R/comments/2026-04-19/1a4ae957654e487bbe6548180fd2e490_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:08:04.704142+00
bea1da5c-f721-4ea4-9892-b8cdb8c8fa51	deeplens-storage	orders/0000R/comments/2026-04-19/dc5b085387694e89876293d9924d8b56_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:08:12.00406+00
1d702927-3573-4833-9160-9f333301ba4a	deeplens-storage	orders/0000R/comments/2026-04-19/786672af814b41fc9de400861f7e9921_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:11:34.571907+00
11cde790-6eb3-4637-98a8-c9ac7e449005	deeplens-storage	orders/0000R/comments/2026-04-19/f69d442fd0d44b2ca2210469bc9c0e07_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:14:33.998582+00
9cd02a49-f2bf-4f18-bd8f-596198f6c85c	deeplens-storage	orders/0000R/comments/2026-04-19/179118245c454739b70191aa9f53cb97_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:17:25.310101+00
fc3d1029-cf24-44d8-b2ce-a2788a935e68	deeplens-storage	orders/0000R/comments/2026-04-19/c289cc1b66184bfb84851e029d29099c_Screenshot_20260419-220628.png	image/png	1016259	Screenshot_20260419-220628.png	{}	2026-04-19 20:22:38.725648+00
62e436b4-d10e-42bf-a072-c2690d0d4a85	deeplens-storage	orders/0000R/comments/2026-04-19/2ad428370b8b4d0997d4f8da28b1bf8e_IMG_20260418_224510_000.jpg	image/jpeg	174407	IMG_20260418_224510_000.jpg	{}	2026-04-19 20:22:54.349794+00
3a628a38-5420-4605-b041-abd2b8afa217	deeplens-storage	orders/0000R/comments/2026-04-20/d10f0142ca704b4a8295c1e6787de50f_Screenshot_20260420-213231.png	image/png	794707	Screenshot_20260420-213231.png	{}	2026-04-20 18:27:09.40503+00
ee09bc64-dd25-4453-ab6e-d12b9a5ea962	deeplens-storage	orders/0000R/comments/2026-04-20/817892d784884e3cbe7c7eee1872100c_Screenshot_20260420-213422.png	image/png	1615772	Screenshot_20260420-213422.png	{}	2026-04-20 19:05:21.58574+00
2503263c-6aa2-4c2e-8913-881d6b13ade9	deeplens-storage	orders/0000R/comments/2026-04-20/e9b796335a9c47bfb3b8a8afad2a236b_Screenshot_20260420-213422.png	image/png	1615772	Screenshot_20260420-213422.png	{}	2026-04-20 19:06:38.761157+00
07450f72-5a72-438a-9b82-a94f4d36c0c1	deeplens-storage	orders/0000R/comments/2026-04-20/ffe26bf51a984d25bf6b66f16d1c0f06_Screenshot_20260420-213231.png	image/png	794707	Screenshot_20260420-213231.png	{}	2026-04-20 19:06:50.968659+00
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, slug, metadata_json, created_at) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, entity_type, entity_id, author_id, content, attachment_ids, created_at, updated_at) FROM stdin;
a4bc0b7a-cd67-49bd-ba72-3b13b079c411	order	0000P	\N	something	{}	2026-04-19 12:55:48.841933+00	2026-04-19 12:55:48.841933+00
36fe8f6b-1d40-4afb-a841-28bb3d164ba0	order	0000P	\N	New thing	{}	2026-04-19 12:56:03.995344+00	2026-04-19 12:56:03.995344+00
9cf31065-4a99-46d0-babf-568af2ddea08	order	0000P	\N	I'm a very big comment message that spans in multiple lines in the screen	{}	2026-04-19 13:09:02.059762+00	2026-04-19 13:09:02.059762+00
6bc6724a-36d2-4e30-a3c1-6f209f7d2963	order	0000R	\N	Hey some comment	{}	2026-04-19 19:52:17.651654+00	2026-04-19 19:52:17.651654+00
72802e87-b914-49df-9e4d-029524bed232	order	0000R	\N	Hey	{bea1da5c-f721-4ea4-9892-b8cdb8c8fa51}	2026-04-19 20:08:12.07822+00	2026-04-19 20:08:12.07822+00
bfe71f3e-afbc-48a3-9fcf-8e68bc3dd74c	order	0000R	\N		{11cde790-6eb3-4637-98a8-c9ac7e449005}	2026-04-19 20:21:36.089563+00	2026-04-19 20:21:36.089563+00
b5053446-1485-4a0d-a294-f5dca6d4cca4	order	0000R	\N		{11cde790-6eb3-4637-98a8-c9ac7e449005}	2026-04-19 20:27:21.177007+00	2026-04-19 20:27:21.177007+00
d7ad319a-fa2d-455a-bbfa-5fd71a4312c5	order	0000R	\N	This is a very long comment that span across multiple lens at least four lines is what I am expecting such comment is posted let's have it so much content appears 	{ee09bc64-dd25-4453-ab6e-d12b9a5ea962}	2026-04-20 18:27:09.595294+00	2026-04-20 19:05:21.697595+00
b6ec029f-0859-4f87-a7c5-30087bf83eef	order	0000R	\N		{2503263c-6aa2-4c2e-8913-881d6b13ade9,07450f72-5a72-438a-9b82-a94f4d36c0c1}	2026-04-20 19:06:51.057159+00	2026-04-20 19:06:51.057159+00
\.


--
-- Data for Name: competitor_videos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.competitor_videos (id, watchlist_id, platform, platform_video_id, url, title, description, posted_at, view_count, like_count, comment_count, share_count, repost_count, media_type, thumbnail_url, media_url, media_urls, duration_seconds, width, height, file_size_bytes, hashtags, mentions, location, is_reel, is_short, category, raw_metadata, tagged_sku_ids, ai_suggested_sku_ids, tagging_confidence, tagging_notes, download_status, download_error, downloaded_at, tracking_phase, last_engagement_snapshot_at, scraped_at, updated_at) FROM stdin;
\.


--
-- Data for Name: competitor_watchlist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.competitor_watchlist (id, platform, username, platform_id, display_name, profile_pic_url, bio, tags, enabled, follower_count, following_count, post_count, last_scraped_at, scrape_failures_count, last_follower_sync_at, follower_count_at_last_sync, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: engagement_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.engagement_snapshots (id, video_id, view_count, like_count, comment_count, share_count, repost_count, video_age_hours, tracking_phase, snapshot_at) FROM stdin;
\.


--
-- Data for Name: entity_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_attachments (id, attachment_id, entity_type, entity_id, tag, sort_order, created_at) FROM stdin;
6a011d90-beb1-40e8-a91f-1ad498aa39b1	7831c6ae-d438-4008-aad3-84753334e08e	order	0000Q	receipt	0	2026-04-19 18:17:34.895336+00
e546d650-16b3-4bcc-a288-3e08049683f2	36262a57-d433-4360-acac-444150af39c5	order	0000Q	receipt	0	2026-04-19 18:18:29.708699+00
04bb2d87-7ad8-4dbf-ba1e-0576e19e56a2	e8a74332-bbe9-448f-85b4-35ae5ebf4703	order	0000Q	receipt	0	2026-04-19 18:26:32.243954+00
bf31299b-5672-41ec-83a0-ee750089bbf9	a057fc0a-f1fa-4c03-83d9-7c6dc1152a45	order	0000Q	receipt	0	2026-04-19 19:01:12.848733+00
b8c3b98f-ceda-466b-a163-a8d43bf0c549	8831feab-bfa6-4fdb-980e-5f70373ad081	order	0000R	note_attachment	0	2026-04-19 19:58:28.994319+00
bf32b050-a9e1-4bb8-b969-786b11d8e4ab	2f8fa93c-0078-4f5d-998a-8137d8bce3d3	order	0000R	note_attachment	0	2026-04-19 19:59:55.707185+00
368bcb7a-1725-43e0-87f7-bcebf99d2152	ed8e90f5-cd8a-49cf-a1bb-11238db56798	order	0000R	note_attachment	0	2026-04-19 20:00:52.631089+00
c85081d1-e890-41cf-a185-13e1611e9c74	50f5013f-ca6c-4bea-9e48-6c1b09204179	order	0000R	note_attachment	0	2026-04-19 20:00:52.795984+00
9d4061e8-4d55-4283-a9ad-9e9e989a75e7	14d76737-be23-491c-a9e4-bccc664cb1d0	order	0000R	note_attachment	0	2026-04-19 20:02:16.472914+00
db19980b-6ded-4567-9870-03f910567382	e0998844-ec1f-462e-9be3-ec54d95897ab	order	0000R	note_attachment	0	2026-04-19 20:02:16.704524+00
c0022353-44e5-4d01-ac17-73537d059f34	81c7eb8c-a8e7-4ea5-a778-9f2780a74375	order	0000R	note_attachment	0	2026-04-19 20:03:09.782624+00
74078a38-bd0f-402a-bd5e-0244f7e52d64	2193cab9-5b66-434f-9a70-50527ff252da	order	0000R	note_attachment	0	2026-04-19 20:03:09.927438+00
2cd77e3b-311a-4e77-8273-954daf6e1fad	5467cd49-4990-46d0-8c22-b0660b1f89c3	order	0000R	receipt	0	2026-04-19 20:04:15.401675+00
103bd81b-1821-424b-8baf-11d22be6f7cc	d9e2609d-b572-4b11-ae3d-69078b81b927	order	0000R	note_attachment	0	2026-04-19 20:05:10.466648+00
170a6043-8e88-4179-ae60-aeeb4b47c75e	dd4a4870-ff5b-4509-bd43-870f958dc793	order	0000R	note_attachment	0	2026-04-19 20:05:10.612549+00
dd41896f-5956-414a-8566-a62d58b0af79	147e4941-9767-4039-8c86-f5058f572a36	order	0000R	note_attachment	0	2026-04-19 20:08:04.708154+00
fd45be52-2b8e-4860-a109-88eebcf760f5	bea1da5c-f721-4ea4-9892-b8cdb8c8fa51	order	0000R	note_attachment	0	2026-04-19 20:08:12.005298+00
7104c569-d4a4-4f38-8864-3927066210a7	1d702927-3573-4833-9160-9f333301ba4a	order	0000R	note_attachment	0	2026-04-19 20:11:34.578661+00
eb8918b1-f5fb-4fa1-b808-f3d7c4808110	11cde790-6eb3-4637-98a8-c9ac7e449005	order	0000R	note_attachment	0	2026-04-19 20:14:34.00651+00
417e9693-da8a-40a1-bb6a-6090299db823	9cd02a49-f2bf-4f18-bd8f-596198f6c85c	order	0000R	note_attachment	0	2026-04-19 20:17:25.314003+00
8dea98a7-572d-43d9-95dc-aba5ee5e9466	3a628a38-5420-4605-b041-abd2b8afa217	order	0000R	note_attachment	0	2026-04-20 18:27:09.410959+00
f0bced58-8e45-428a-9a7f-ddf27fc76589	ee09bc64-dd25-4453-ab6e-d12b9a5ea962	order	0000R	note_attachment	0	2026-04-20 19:05:21.588316+00
5e73a28a-be80-4814-b79b-3bd39c955d08	2503263c-6aa2-4c2e-8913-881d6b13ade9	order	0000R	note_attachment	0	2026-04-20 19:06:38.763529+00
b8435752-0114-46d4-905a-4553299177e3	07450f72-5a72-438a-9b82-a94f4d36c0c1	order	0000R	note_attachment	0	2026-04-20 19:06:50.969909+00
\.


--
-- Data for Name: follower_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.follower_snapshots (id, watchlist_id, follower_count, following_count, follower_following_ratio, engagement_rate, snapshot_at) FROM stdin;
\.


--
-- Data for Name: image_collections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.image_collections (id, name, description, created_by, created_at, updated_at, is_public, total_images, metadata) FROM stdin;
\.


--
-- Data for Name: infisical_projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.infisical_projects (id, tenant_id, project_id, project_name, environment, client_id, client_secret_encrypted, is_active, created_at, last_sync) FROM stdin;
\.


--
-- Data for Name: infisical_secrets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.infisical_secrets (id, project_id, secret_key, secret_version, created_at, last_accessed, access_count) FROM stdin;
\.


--
-- Data for Name: ingestion_meta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ingestion_meta (id, key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: instagram_profile_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.instagram_profile_cache (username, user_id, full_name, biography, followers_count, following_count, posts_count, profile_pic_url, external_url, is_private, is_verified, scraped_at, raw_json) FROM stdin;
kri_kan	1109543189	Sai krishna kanth		0	0	0	https://scontent.cdninstagram.com/v/t51.2885-19/299867876_1125316438060402_6350604429767258935_n.jpg?stp=dst-jpg_s100x100_tt6&amp;_nc_cat=102&amp;ccb=7-5&amp;_nc_sid=bf7eb4&amp;efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&amp;_nc_ohc=VoWDhTLhNtoQ7kNvwGItAZr&amp;_nc_oc=Ador7I56fJi50Dws-Z1cWaFUtmKVKEEtxLN2fgeegH70s48UvgYgy3A7_T_q8jzNJEo&amp;_nc_zt=24&amp;_nc_ht=scontent.cdninstagram.com&amp;_nc_ss=7a289&amp;oh=00_Af3pgZZcqT2NBiVZS4tOYf74YmV6rjEAKxGzvNJG45JgTA&amp;oe=69EA9A0D	\N	f	f	2026-04-19 10:36:49.816474+00	\N
\.


--
-- Data for Name: k8s_clusters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.k8s_clusters (id, name, cluster_endpoint, cluster_version, provider, region, is_active, created_at, last_sync, metadata, kubeconfig_encrypted) FROM stdin;
\.


--
-- Data for Name: k8s_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.k8s_events (id, cluster_id, namespace_id, event_type, reason, message, involved_object_kind, involved_object_name, involved_object_namespace, source_component, source_host, first_timestamp, last_timestamp, event_count, created_at) FROM stdin;
\.


--
-- Data for Name: k8s_namespaces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.k8s_namespaces (id, cluster_id, namespace_name, status, created_at, labels, annotations) FROM stdin;
\.


--
-- Data for Name: k8s_nodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.k8s_nodes (id, cluster_id, node_name, node_role, node_status, cpu_capacity, memory_capacity, storage_capacity, os_image, kernel_version, container_runtime, kubelet_version, created_at, last_heartbeat, labels, annotations) FROM stdin;
\.


--
-- Data for Name: k8s_pods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.k8s_pods (id, cluster_id, namespace_id, workload_id, pod_name, pod_ip, node_name, phase, restart_count, created_at, started_at, last_sync, labels, annotations, containers) FROM stdin;
\.


--
-- Data for Name: k8s_resource_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.k8s_resource_metrics (id, cluster_id, resource_type, resource_name, namespace_name, metric_name, metric_value, metric_unit, recorded_at, metadata) FROM stdin;
\.


--
-- Data for Name: k8s_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.k8s_services (id, cluster_id, namespace_id, service_name, service_type, cluster_ip, external_ips, ports, selector, created_at, last_sync, labels, annotations) FROM stdin;
\.


--
-- Data for Name: k8s_workloads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.k8s_workloads (id, cluster_id, namespace_id, workload_name, workload_type, replicas_desired, replicas_ready, replicas_available, image_names, created_at, last_sync, labels, annotations, spec, status) FROM stdin;
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media (id, variant_id, storage_path, media_type, original_filename, file_size_bytes, mime_type, status, vector_id, phash, is_default, quality_score, width, height, duration_seconds, thumbnail_path, preview_path, features_extracted, indexed, uploaded_at, metadata_json) FROM stdin;
8c724a74-fb2c-4e56-8c62-ce639f5fc2d5	\N	products/saree/Q226/378767b8846359ed2345c090350929630817ef1cc01deca87cba40f819ea311f.jpg	1	\N	0	image/jpeg	0	\N	\N	f	\N	\N	\N	\N	\N	\N	f	f	2026-04-21 19:15:41.969145+00	\N
cb5e5448-7554-4c3d-9a8b-352d141c6665	\N	products/saree/Q226/39ed0f45703c86f47856da05bf2bcdff2211d4eaff6c802a6f44bbcdd89a5823.jpg	1	\N	0	image/jpeg	0	\N	\N	f	\N	\N	\N	\N	\N	\N	f	f	2026-04-21 19:15:41.969145+00	\N
\.


--
-- Data for Name: media_deletion_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media_deletion_queue (id, media_id, storage_path, deleted_from_disk, deleted_from_vector, retries, created_at, processed_at) FROM stdin;
\.


--
-- Data for Name: orderId; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."orderId" (id, order_id, source_id, payment_mode_id, created_at, customer_phone, source_handle, instagram_user_id, customer_address, transaction_id, instagram_handle) FROM stdin;
20	0000K	1	1	2026-04-18 18:36:51.517349+00	8015096669		\N	\N	\N	\N
23	0000N	1	\N	2026-04-19 10:10:37.262692+00	8015096669	8015096669	\N	\N	\N	\N
1	00001	1	1	2026-04-17 20:45:53.497731+00	\N	\N	\N	\N	\N	\N
3	00003	1	2	2026-04-17 20:46:03.305033+00	\N	\N	\N	\N	\N	\N
5	00005	1	\N	2026-04-17 20:57:36.914314+00	\N	\N	\N	\N	\N	\N
6	00006	1	1	2026-04-17 20:57:42.495526+00	\N	\N	\N	\N	\N	\N
7	00007	1	1	2026-04-17 20:57:46.619895+00	\N	\N	\N	\N	\N	\N
10	0000A	1	\N	2026-04-18 07:07:56.029171+00	\N	\N	\N	\N	\N	\N
12	0000C	1	\N	2026-04-18 07:30:38.925498+00	\N	\N	\N	\N	\N	\N
14	0000E	1	\N	2026-04-18 08:56:46.585115+00	\N	\N	\N	\N	\N	\N
15	0000F	1	\N	2026-04-18 17:49:01.451039+00	\N	\N	\N	\N	\N	\N
16	0000G	1	1	2026-04-18 17:59:39.049189+00	\N	\N	\N	\N	\N	\N
17	0000H	1	2	2026-04-18 18:01:52.555482+00	\N	\N	\N	\N	\N	\N
18	0000I	1	\N	2026-04-18 18:06:48.955738+00	8015096669	\N	\N	\N	\N	\N
19	0000J	1	\N	2026-04-18 18:30:22.66034+00	8015096669	\N	\N	\N	\N	\N
25	0000P	1	\N	2026-04-19 10:37:24.755182+00	8015096669	8015096669	\N	\N	789654654564	\N
2	00002	2	\N	2026-04-17 20:45:59.589658+00	\N	\N	\N	\N	\N	\N
8	00008	2	2	2026-04-17 20:57:49.013951+00	\N	\N	\N	\N	\N	\N
9	00009	2	2	2026-04-17 20:58:07.490669+00	\N	\N	\N	\N	\N	\N
11	0000B	2	\N	2026-04-18 07:30:35.488589+00	\N	\N	\N	\N	\N	\N
13	0000D	2	\N	2026-04-18 08:56:41.685341+00	\N	\N	\N	\N	\N	\N
4	00004	2	2	2026-04-17 20:46:30.325451+00	\N	\N	\N	\N	\N	\N
24	0000O	2	2	2026-04-19 10:37:15.435436+00		https://www.instagram.com/kri_kan/	1109543189	\N	\N	https://www.instagram.com/kri_kan/
26	0000Q	2	1	2026-04-19 16:02:00.716602+00	\N	https://www.instagram.com/kri_kan/	1109543189	\N	Ghhvcf	\N
27	0000R	1	\N	2026-04-19 19:04:10.839329+00	8015096669	8015096669	\N	\N	\N	\N
\.


--
-- Data for Name: orderItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."orderItem" (id, order_id_ref, item_index, quantity, price, created_at, product_id, comments) FROM stdin;
\.


--
-- Data for Name: order_sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_sources (id, name) FROM stdin;
1	whatsapp
2	instagram
\.


--
-- Data for Name: payment_modes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_modes (id, name) FROM stdin;
1	COD
2	Prepaid
\.


--
-- Data for Name: platform_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_configs (key, value, description, updated_at, updated_by) FROM stdin;
max_tenants	1000	Maximum number of tenants allowed	2026-04-11 19:07:15.725964+00	\N
default_storage_limit_gb	1	Default storage limit for new tenants (GB)	2026-04-11 19:07:15.725964+00	\N
default_api_calls_per_month	1000	Default API calls limit for new tenants	2026-04-11 19:07:15.725964+00	\N
supported_storage_providers	["azure_blob", "aws_s3", "gcs", "minio", "nfs"]	List of supported storage providers	2026-04-11 19:07:15.725964+00	\N
image_processing_enabled	true	Whether image processing is enabled globally	2026-04-11 19:07:15.725964+00	\N
vector_similarity_threshold	0.8	Default similarity threshold for vector searches	2026-04-11 19:07:15.725964+00	\N
tenant_database_template	"tenant_metadata_template"	Template database name for new tenants	2026-04-11 19:07:15.725964+00	\N
max_file_size_mb	50	Maximum file size for image uploads (MB)	2026-04-11 19:07:15.725964+00	\N
supported_image_formats	["jpg", "jpeg", "png", "gif", "bmp", "webp"]	Supported image formats	2026-04-11 19:07:15.725964+00	\N
tenant_provisioning_enabled	true	Whether new tenant provisioning is enabled	2026-04-11 19:07:15.725964+00	\N
redis_databases_per_tenant	16	Number of Redis databases available for tenant allocation	2026-04-11 19:07:15.725964+00	\N
qdrant_default_vector_size	2048	Default vector dimension for Qdrant collections (ResNet50)	2026-04-11 19:07:15.725964+00	\N
infisical_enabled	true	Whether Infisical secret management is enabled	2026-04-11 19:07:15.725964+00	\N
monitoring_enabled	true	Whether monitoring and observability stack is enabled	2026-04-11 19:07:15.725964+00	\N
kafka_enabled	true	Whether Kafka message queue is enabled	2026-04-11 19:07:15.725964+00	\N
kubernetes_integration_enabled	true	Whether Kubernetes metadata tracking is enabled	2026-04-11 19:07:15.725964+00	\N
backup_retention_days	30	Number of days to retain database backups	2026-04-11 19:07:15.725964+00	\N
metrics_retention_days	90	Number of days to retain performance metrics	2026-04-11 19:07:15.725964+00	\N
\.


--
-- Data for Name: productId; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."productId" (id, product_id, created_at) FROM stdin;
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variants (id, product_id, variant_sku, color, fabric, stitch_type, work_heaviness, search_keywords, attributes_json, created_at) FROM stdin;
545dcdd1-06f4-4dae-a7cf-717d544ca07b	aab50605-d82e-4a53-8cfb-e41d5d4faec5	\N	\N	\N	\N	\N	\N	\N	2026-04-21 19:15:41.969145+00
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, category_id, base_sku, title, tags, unified_attributes, created_at) FROM stdin;
aab50605-d82e-4a53-8cfb-e41d5d4faec5	\N	SKU-3D4AF1BC	Viscose saree	{saree}	\N	2026-04-21 19:15:41.969145+00
\.


--
-- Data for Name: scraper_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scraper_jobs (id, job_id, watchlist_id, job_type, status, items_found, items_processed, items_failed, error_message, error_details, retry_count, max_retries, started_at, completed_at, duration_ms, worker_id, scraper_session_id, kafka_topic, kafka_partition, kafka_offset, triggered_by, config_snapshot, created_at) FROM stdin;
\.


--
-- Data for Name: scraper_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scraper_sessions (id, platform, username, display_name, session_cookies, session_metadata, api_token, last_used_at, last_health_check_at, health_status, consecutive_failures, total_requests_today, on_cooldown, cooldown_until, rotation_strategy, usage_count, enabled, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: search_queries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.search_queries (id, session_id, query_type, query_vector_id, query_text, collection_id, results_count, response_time_ms, similarity_threshold, "timestamp", metadata) FROM stdin;
\.


--
-- Data for Name: search_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.search_sessions (id, user_id, session_start, session_end, total_searches, ip_address, user_agent, metadata) FROM stdin;
\.


--
-- Data for Name: seller_listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seller_listings (id, variant_id, seller_id, external_id, current_price, currency, shipping_info, is_favorite, is_active, description, url, last_priced_at, raw_data_json, updated_at) FROM stdin;
081b37e5-a8e7-4148-b43d-fd03ac410d01	545dcdd1-06f4-4dae-a7cf-717d544ca07b	8c6b0d03-a8a8-4f76-970f-22e29e389e73	081b37e5-a8e7-4148-b43d-fd03ac410d01	850.00	INR	plus shipping	f	t	Dine describe	\N	2026-04-21 19:15:41.969145+00	\N	2026-04-21 19:15:41.969145+00
\.


--
-- Data for Name: sellers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sellers (id, external_id, name, contact_info, rating, is_trusted, created_at) FROM stdin;
8c6b0d03-a8a8-4f76-970f-22e29e389e73	DEFAULT	Default Seller	\N	0	f	2026-04-21 19:15:41.969145+00
\.


--
-- Data for Name: service_dependencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_dependencies (id, service_name, dependency_name, dependency_type, is_critical, health_check_url, last_check, status, response_time_ms) FROM stdin;
\.


--
-- Data for Name: system_health_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_health_metrics (id, service_name, metric_name, metric_value, metric_unit, status, recorded_at, metadata) FROM stdin;
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_preferences (id, user_id, preference_key, preference_value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vendor_contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendor_contacts (id, vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendors (id, vendor_name, vendor_code, address, city, state, country, postal_code, email, website, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: video_insights; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.video_insights (id, video_id, insight_type, insight_score, insight_data, detected_at, dismissed, dismissed_at, dismissed_by) FROM stdin;
\.


--
-- Name: orderId_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."orderId_id_seq"', 27, true);


--
-- Name: orderItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."orderItem_id_seq"', 1, false);


--
-- Name: productId_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."productId_id_seq"', 1, false);


--
-- Name: studio_order_sources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.studio_order_sources_id_seq', 2, true);


--
-- Name: studio_payment_modes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.studio_payment_modes_id_seq', 2, true);


--
-- Name: api_usage_logs api_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: competitor_videos competitor_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor_videos
    ADD CONSTRAINT competitor_videos_pkey PRIMARY KEY (id);


--
-- Name: competitor_videos competitor_videos_platform_platform_video_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor_videos
    ADD CONSTRAINT competitor_videos_platform_platform_video_id_key UNIQUE (platform, platform_video_id);


--
-- Name: competitor_watchlist competitor_watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor_watchlist
    ADD CONSTRAINT competitor_watchlist_pkey PRIMARY KEY (id);


--
-- Name: competitor_watchlist competitor_watchlist_platform_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor_watchlist
    ADD CONSTRAINT competitor_watchlist_platform_username_key UNIQUE (platform, username);


--
-- Name: engagement_snapshots engagement_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.engagement_snapshots
    ADD CONSTRAINT engagement_snapshots_pkey PRIMARY KEY (id);


--
-- Name: engagement_snapshots engagement_snapshots_video_id_snapshot_at_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.engagement_snapshots
    ADD CONSTRAINT engagement_snapshots_video_id_snapshot_at_key UNIQUE (video_id, snapshot_at);


--
-- Name: entity_attachments entity_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_attachments
    ADD CONSTRAINT entity_attachments_pkey PRIMARY KEY (id);


--
-- Name: follower_snapshots follower_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follower_snapshots
    ADD CONSTRAINT follower_snapshots_pkey PRIMARY KEY (id);


--
-- Name: follower_snapshots follower_snapshots_watchlist_id_snapshot_at_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follower_snapshots
    ADD CONSTRAINT follower_snapshots_watchlist_id_snapshot_at_key UNIQUE (watchlist_id, snapshot_at);


--
-- Name: image_collections image_collections_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_collections
    ADD CONSTRAINT image_collections_name_key UNIQUE (name);


--
-- Name: image_collections image_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_collections
    ADD CONSTRAINT image_collections_pkey PRIMARY KEY (id);


--
-- Name: infisical_projects infisical_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.infisical_projects
    ADD CONSTRAINT infisical_projects_pkey PRIMARY KEY (id);


--
-- Name: infisical_projects infisical_projects_project_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.infisical_projects
    ADD CONSTRAINT infisical_projects_project_id_key UNIQUE (project_id);


--
-- Name: infisical_secrets infisical_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.infisical_secrets
    ADD CONSTRAINT infisical_secrets_pkey PRIMARY KEY (id);


--
-- Name: infisical_secrets infisical_secrets_project_id_secret_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.infisical_secrets
    ADD CONSTRAINT infisical_secrets_project_id_secret_key_key UNIQUE (project_id, secret_key);


--
-- Name: ingestion_meta ingestion_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingestion_meta
    ADD CONSTRAINT ingestion_meta_pkey PRIMARY KEY (id);


--
-- Name: instagram_profile_cache instagram_profile_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instagram_profile_cache
    ADD CONSTRAINT instagram_profile_cache_pkey PRIMARY KEY (username);


--
-- Name: k8s_clusters k8s_clusters_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_clusters
    ADD CONSTRAINT k8s_clusters_name_key UNIQUE (name);


--
-- Name: k8s_clusters k8s_clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_clusters
    ADD CONSTRAINT k8s_clusters_pkey PRIMARY KEY (id);


--
-- Name: k8s_events k8s_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_events
    ADD CONSTRAINT k8s_events_pkey PRIMARY KEY (id);


--
-- Name: k8s_namespaces k8s_namespaces_cluster_id_namespace_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_namespaces
    ADD CONSTRAINT k8s_namespaces_cluster_id_namespace_name_key UNIQUE (cluster_id, namespace_name);


--
-- Name: k8s_namespaces k8s_namespaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_namespaces
    ADD CONSTRAINT k8s_namespaces_pkey PRIMARY KEY (id);


--
-- Name: k8s_nodes k8s_nodes_cluster_id_node_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_nodes
    ADD CONSTRAINT k8s_nodes_cluster_id_node_name_key UNIQUE (cluster_id, node_name);


--
-- Name: k8s_nodes k8s_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_nodes
    ADD CONSTRAINT k8s_nodes_pkey PRIMARY KEY (id);


--
-- Name: k8s_pods k8s_pods_cluster_id_namespace_id_pod_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_pods
    ADD CONSTRAINT k8s_pods_cluster_id_namespace_id_pod_name_key UNIQUE (cluster_id, namespace_id, pod_name);


--
-- Name: k8s_pods k8s_pods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_pods
    ADD CONSTRAINT k8s_pods_pkey PRIMARY KEY (id);


--
-- Name: k8s_resource_metrics k8s_resource_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_resource_metrics
    ADD CONSTRAINT k8s_resource_metrics_pkey PRIMARY KEY (id);


--
-- Name: k8s_services k8s_services_cluster_id_namespace_id_service_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_services
    ADD CONSTRAINT k8s_services_cluster_id_namespace_id_service_name_key UNIQUE (cluster_id, namespace_id, service_name);


--
-- Name: k8s_services k8s_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_services
    ADD CONSTRAINT k8s_services_pkey PRIMARY KEY (id);


--
-- Name: k8s_workloads k8s_workloads_cluster_id_namespace_id_workload_name_workloa_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_workloads
    ADD CONSTRAINT k8s_workloads_cluster_id_namespace_id_workload_name_workloa_key UNIQUE (cluster_id, namespace_id, workload_name, workload_type);


--
-- Name: k8s_workloads k8s_workloads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_workloads
    ADD CONSTRAINT k8s_workloads_pkey PRIMARY KEY (id);


--
-- Name: media_deletion_queue media_deletion_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_deletion_queue
    ADD CONSTRAINT media_deletion_queue_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: orderItem orderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."orderItem"
    ADD CONSTRAINT "orderItem_pkey" PRIMARY KEY (id);


--
-- Name: platform_configs platform_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_configs
    ADD CONSTRAINT platform_configs_pkey PRIMARY KEY (key);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: products products_base_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_base_sku_key UNIQUE (base_sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: scraper_jobs scraper_jobs_job_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraper_jobs
    ADD CONSTRAINT scraper_jobs_job_id_key UNIQUE (job_id);


--
-- Name: scraper_jobs scraper_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraper_jobs
    ADD CONSTRAINT scraper_jobs_pkey PRIMARY KEY (id);


--
-- Name: scraper_sessions scraper_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraper_sessions
    ADD CONSTRAINT scraper_sessions_pkey PRIMARY KEY (id);


--
-- Name: scraper_sessions scraper_sessions_platform_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraper_sessions
    ADD CONSTRAINT scraper_sessions_platform_username_key UNIQUE (platform, username);


--
-- Name: search_queries search_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_pkey PRIMARY KEY (id);


--
-- Name: search_sessions search_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_sessions
    ADD CONSTRAINT search_sessions_pkey PRIMARY KEY (id);


--
-- Name: seller_listings seller_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_listings
    ADD CONSTRAINT seller_listings_pkey PRIMARY KEY (id);


--
-- Name: sellers sellers_external_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_external_id_key UNIQUE (external_id);


--
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (id);


--
-- Name: service_dependencies service_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_pkey PRIMARY KEY (id);


--
-- Name: service_dependencies service_dependencies_service_name_dependency_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_service_name_dependency_name_key UNIQUE (service_name, dependency_name);


--
-- Name: order_sources studio_order_sources_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_sources
    ADD CONSTRAINT studio_order_sources_name_key UNIQUE (name);


--
-- Name: order_sources studio_order_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_sources
    ADD CONSTRAINT studio_order_sources_pkey PRIMARY KEY (id);


--
-- Name: orderId studio_orders_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."orderId"
    ADD CONSTRAINT studio_orders_order_id_key UNIQUE (order_id);


--
-- Name: orderId studio_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."orderId"
    ADD CONSTRAINT studio_orders_pkey PRIMARY KEY (id);


--
-- Name: payment_modes studio_payment_modes_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_modes
    ADD CONSTRAINT studio_payment_modes_name_key UNIQUE (name);


--
-- Name: payment_modes studio_payment_modes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_modes
    ADD CONSTRAINT studio_payment_modes_pkey PRIMARY KEY (id);


--
-- Name: productId studio_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."productId"
    ADD CONSTRAINT studio_products_pkey PRIMARY KEY (id);


--
-- Name: productId studio_products_product_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."productId"
    ADD CONSTRAINT studio_products_product_id_key UNIQUE (product_id);


--
-- Name: system_health_metrics system_health_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_health_metrics
    ADD CONSTRAINT system_health_metrics_pkey PRIMARY KEY (id);


--
-- Name: orderItem uk_order_item_index; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."orderItem"
    ADD CONSTRAINT uk_order_item_index UNIQUE (order_id_ref, item_index);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_preference_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_preference_key_key UNIQUE (user_id, preference_key);


--
-- Name: vendor_contacts vendor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: video_insights video_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_insights
    ADD CONSTRAINT video_insights_pkey PRIMARY KEY (id);


--
-- Name: video_insights video_insights_video_id_insight_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_insights
    ADD CONSTRAINT video_insights_video_id_insight_type_key UNIQUE (video_id, insight_type);


--
-- Name: idx_api_usage_logs_endpoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_usage_logs_endpoint ON public.api_usage_logs USING btree (endpoint);


--
-- Name: idx_api_usage_logs_status_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_usage_logs_status_code ON public.api_usage_logs USING btree (status_code);


--
-- Name: idx_api_usage_logs_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_usage_logs_tenant_id ON public.api_usage_logs USING btree (tenant_id);


--
-- Name: idx_api_usage_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_usage_logs_timestamp ON public.api_usage_logs USING btree ("timestamp");


--
-- Name: idx_api_usage_tenant_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_usage_tenant_timestamp ON public.api_usage_logs USING btree (tenant_id, "timestamp");


--
-- Name: idx_attachments_metadata; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attachments_metadata ON public.attachments USING gin (metadata);


--
-- Name: idx_attachments_original_filename; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attachments_original_filename ON public.attachments USING btree (original_filename);


--
-- Name: idx_comments_attachments; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_attachments ON public.comments USING gin (attachment_ids);


--
-- Name: idx_comments_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_entity ON public.comments USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_entity_attachments_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_attachments_lookup ON public.entity_attachments USING btree (entity_type, entity_id);


--
-- Name: idx_follower_snapshots_watchlist_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_follower_snapshots_watchlist_time ON public.follower_snapshots USING btree (watchlist_id, snapshot_at DESC);


--
-- Name: idx_infisical_projects_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_infisical_projects_active ON public.infisical_projects USING btree (is_active);


--
-- Name: idx_infisical_projects_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_infisical_projects_project_id ON public.infisical_projects USING btree (project_id);


--
-- Name: idx_infisical_projects_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_infisical_projects_tenant_id ON public.infisical_projects USING btree (tenant_id);


--
-- Name: idx_infisical_secrets_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_infisical_secrets_key ON public.infisical_secrets USING btree (secret_key);


--
-- Name: idx_infisical_secrets_last_accessed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_infisical_secrets_last_accessed ON public.infisical_secrets USING btree (last_accessed);


--
-- Name: idx_infisical_secrets_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_infisical_secrets_project_id ON public.infisical_secrets USING btree (project_id);


--
-- Name: idx_insta_cache_scraped_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insta_cache_scraped_at ON public.instagram_profile_cache USING btree (scraped_at);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_status ON public.scraper_jobs USING btree (status, created_at DESC);


--
-- Name: idx_k8s_clusters_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_clusters_active ON public.k8s_clusters USING btree (is_active);


--
-- Name: idx_k8s_clusters_last_sync; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_clusters_last_sync ON public.k8s_clusters USING btree (last_sync);


--
-- Name: idx_k8s_clusters_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_clusters_name ON public.k8s_clusters USING btree (name);


--
-- Name: idx_k8s_clusters_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_clusters_provider ON public.k8s_clusters USING btree (provider);


--
-- Name: idx_k8s_events_cluster_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_events_cluster_id ON public.k8s_events USING btree (cluster_id);


--
-- Name: idx_k8s_events_cluster_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_events_cluster_time ON public.k8s_events USING btree (cluster_id, first_timestamp);


--
-- Name: idx_k8s_events_namespace_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_events_namespace_id ON public.k8s_events USING btree (namespace_id);


--
-- Name: idx_k8s_events_object_kind; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_events_object_kind ON public.k8s_events USING btree (involved_object_kind);


--
-- Name: idx_k8s_events_reason; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_events_reason ON public.k8s_events USING btree (reason);


--
-- Name: idx_k8s_events_timestamps; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_events_timestamps ON public.k8s_events USING btree (first_timestamp, last_timestamp);


--
-- Name: idx_k8s_events_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_events_type ON public.k8s_events USING btree (event_type);


--
-- Name: idx_k8s_metrics_cluster_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_metrics_cluster_id ON public.k8s_resource_metrics USING btree (cluster_id);


--
-- Name: idx_k8s_metrics_cluster_resource_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_metrics_cluster_resource_time ON public.k8s_resource_metrics USING btree (cluster_id, resource_type, recorded_at);


--
-- Name: idx_k8s_metrics_metric_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_metrics_metric_name ON public.k8s_resource_metrics USING btree (metric_name);


--
-- Name: idx_k8s_metrics_recorded_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_metrics_recorded_at ON public.k8s_resource_metrics USING btree (recorded_at);


--
-- Name: idx_k8s_metrics_resource_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_metrics_resource_name ON public.k8s_resource_metrics USING btree (resource_name);


--
-- Name: idx_k8s_metrics_resource_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_metrics_resource_type ON public.k8s_resource_metrics USING btree (resource_type);


--
-- Name: idx_k8s_namespaces_cluster_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_namespaces_cluster_id ON public.k8s_namespaces USING btree (cluster_id);


--
-- Name: idx_k8s_namespaces_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_namespaces_name ON public.k8s_namespaces USING btree (namespace_name);


--
-- Name: idx_k8s_namespaces_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_namespaces_status ON public.k8s_namespaces USING btree (status);


--
-- Name: idx_k8s_nodes_cluster_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_nodes_cluster_id ON public.k8s_nodes USING btree (cluster_id);


--
-- Name: idx_k8s_nodes_heartbeat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_nodes_heartbeat ON public.k8s_nodes USING btree (last_heartbeat);


--
-- Name: idx_k8s_nodes_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_nodes_name ON public.k8s_nodes USING btree (node_name);


--
-- Name: idx_k8s_nodes_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_nodes_role ON public.k8s_nodes USING btree (node_role);


--
-- Name: idx_k8s_nodes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_nodes_status ON public.k8s_nodes USING btree (node_status);


--
-- Name: idx_k8s_pods_cluster_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_pods_cluster_id ON public.k8s_pods USING btree (cluster_id);


--
-- Name: idx_k8s_pods_cluster_namespace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_pods_cluster_namespace ON public.k8s_pods USING btree (cluster_id, namespace_id);


--
-- Name: idx_k8s_pods_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_pods_name ON public.k8s_pods USING btree (pod_name);


--
-- Name: idx_k8s_pods_namespace_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_pods_namespace_id ON public.k8s_pods USING btree (namespace_id);


--
-- Name: idx_k8s_pods_node_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_pods_node_name ON public.k8s_pods USING btree (node_name);


--
-- Name: idx_k8s_pods_phase; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_pods_phase ON public.k8s_pods USING btree (phase);


--
-- Name: idx_k8s_pods_workload_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_pods_workload_id ON public.k8s_pods USING btree (workload_id);


--
-- Name: idx_k8s_services_cluster_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_services_cluster_id ON public.k8s_services USING btree (cluster_id);


--
-- Name: idx_k8s_services_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_services_name ON public.k8s_services USING btree (service_name);


--
-- Name: idx_k8s_services_namespace_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_services_namespace_id ON public.k8s_services USING btree (namespace_id);


--
-- Name: idx_k8s_services_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_services_type ON public.k8s_services USING btree (service_type);


--
-- Name: idx_k8s_workloads_cluster_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_workloads_cluster_id ON public.k8s_workloads USING btree (cluster_id);


--
-- Name: idx_k8s_workloads_cluster_namespace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_workloads_cluster_namespace ON public.k8s_workloads USING btree (cluster_id, namespace_id);


--
-- Name: idx_k8s_workloads_last_sync; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_workloads_last_sync ON public.k8s_workloads USING btree (last_sync);


--
-- Name: idx_k8s_workloads_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_workloads_name ON public.k8s_workloads USING btree (workload_name);


--
-- Name: idx_k8s_workloads_namespace_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_workloads_namespace_id ON public.k8s_workloads USING btree (namespace_id);


--
-- Name: idx_k8s_workloads_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_k8s_workloads_type ON public.k8s_workloads USING btree (workload_type);


--
-- Name: idx_media_phash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_phash ON public.media USING btree (phash);


--
-- Name: idx_media_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_type ON public.media USING btree (media_type);


--
-- Name: idx_platform_configs_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_platform_configs_updated_at ON public.platform_configs USING btree (updated_at);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_sku ON public.products USING btree (base_sku);


--
-- Name: idx_search_queries_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_queries_timestamp ON public.search_queries USING btree ("timestamp");


--
-- Name: idx_service_dependencies_critical; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_dependencies_critical ON public.service_dependencies USING btree (is_critical);


--
-- Name: idx_service_dependencies_dependency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_dependencies_dependency ON public.service_dependencies USING btree (dependency_name);


--
-- Name: idx_service_dependencies_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_dependencies_service ON public.service_dependencies USING btree (service_name);


--
-- Name: idx_service_dependencies_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_dependencies_status ON public.service_dependencies USING btree (status);


--
-- Name: idx_snapshots_video_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_snapshots_video_time ON public.engagement_snapshots USING btree (video_id, snapshot_at DESC);


--
-- Name: idx_system_health_metric; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_health_metric ON public.system_health_metrics USING btree (metric_name);


--
-- Name: idx_system_health_recorded_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_health_recorded_at ON public.system_health_metrics USING btree (recorded_at);


--
-- Name: idx_system_health_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_health_service ON public.system_health_metrics USING btree (service_name);


--
-- Name: idx_system_health_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_health_status ON public.system_health_metrics USING btree (status);


--
-- Name: idx_vendor_contacts_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_contacts_vendor ON public.vendor_contacts USING btree (vendor_id);


--
-- Name: idx_vendors_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendors_active ON public.vendors USING btree (is_active);


--
-- Name: idx_vendors_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendors_name ON public.vendors USING btree (vendor_name);


--
-- Name: idx_videos_posted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_videos_posted_at ON public.competitor_videos USING btree (posted_at DESC);


--
-- Name: idx_watchlist_platform; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_watchlist_platform ON public.competitor_watchlist USING btree (platform);


--
-- Name: scraper_sessions trigger_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_sessions_updated_at BEFORE UPDATE ON public.scraper_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: competitor_videos trigger_videos_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_videos_updated_at BEFORE UPDATE ON public.competitor_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: competitor_watchlist trigger_watchlist_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_watchlist_updated_at BEFORE UPDATE ON public.competitor_watchlist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: competitor_videos competitor_videos_watchlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor_videos
    ADD CONSTRAINT competitor_videos_watchlist_id_fkey FOREIGN KEY (watchlist_id) REFERENCES public.competitor_watchlist(id) ON DELETE CASCADE;


--
-- Name: engagement_snapshots engagement_snapshots_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.engagement_snapshots
    ADD CONSTRAINT engagement_snapshots_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.competitor_videos(id) ON DELETE CASCADE;


--
-- Name: entity_attachments entity_attachments_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_attachments
    ADD CONSTRAINT entity_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON DELETE CASCADE;


--
-- Name: orderItem fk_order_ref; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."orderItem"
    ADD CONSTRAINT fk_order_ref FOREIGN KEY (order_id_ref) REFERENCES public."orderId"(id) ON DELETE CASCADE;


--
-- Name: follower_snapshots follower_snapshots_watchlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follower_snapshots
    ADD CONSTRAINT follower_snapshots_watchlist_id_fkey FOREIGN KEY (watchlist_id) REFERENCES public.competitor_watchlist(id) ON DELETE CASCADE;


--
-- Name: infisical_secrets infisical_secrets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.infisical_secrets
    ADD CONSTRAINT infisical_secrets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.infisical_projects(id) ON DELETE CASCADE;


--
-- Name: k8s_events k8s_events_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_events
    ADD CONSTRAINT k8s_events_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.k8s_clusters(id) ON DELETE CASCADE;


--
-- Name: k8s_events k8s_events_namespace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_events
    ADD CONSTRAINT k8s_events_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES public.k8s_namespaces(id) ON DELETE CASCADE;


--
-- Name: k8s_namespaces k8s_namespaces_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_namespaces
    ADD CONSTRAINT k8s_namespaces_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.k8s_clusters(id) ON DELETE CASCADE;


--
-- Name: k8s_nodes k8s_nodes_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_nodes
    ADD CONSTRAINT k8s_nodes_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.k8s_clusters(id) ON DELETE CASCADE;


--
-- Name: k8s_pods k8s_pods_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_pods
    ADD CONSTRAINT k8s_pods_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.k8s_clusters(id) ON DELETE CASCADE;


--
-- Name: k8s_pods k8s_pods_namespace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_pods
    ADD CONSTRAINT k8s_pods_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES public.k8s_namespaces(id) ON DELETE CASCADE;


--
-- Name: k8s_pods k8s_pods_workload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_pods
    ADD CONSTRAINT k8s_pods_workload_id_fkey FOREIGN KEY (workload_id) REFERENCES public.k8s_workloads(id) ON DELETE CASCADE;


--
-- Name: k8s_resource_metrics k8s_resource_metrics_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_resource_metrics
    ADD CONSTRAINT k8s_resource_metrics_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.k8s_clusters(id) ON DELETE CASCADE;


--
-- Name: k8s_services k8s_services_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_services
    ADD CONSTRAINT k8s_services_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.k8s_clusters(id) ON DELETE CASCADE;


--
-- Name: k8s_services k8s_services_namespace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_services
    ADD CONSTRAINT k8s_services_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES public.k8s_namespaces(id) ON DELETE CASCADE;


--
-- Name: k8s_workloads k8s_workloads_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_workloads
    ADD CONSTRAINT k8s_workloads_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.k8s_clusters(id) ON DELETE CASCADE;


--
-- Name: k8s_workloads k8s_workloads_namespace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.k8s_workloads
    ADD CONSTRAINT k8s_workloads_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES public.k8s_namespaces(id) ON DELETE CASCADE;


--
-- Name: media media_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: scraper_jobs scraper_jobs_scraper_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraper_jobs
    ADD CONSTRAINT scraper_jobs_scraper_session_id_fkey FOREIGN KEY (scraper_session_id) REFERENCES public.scraper_sessions(id) ON DELETE SET NULL;


--
-- Name: scraper_jobs scraper_jobs_watchlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraper_jobs
    ADD CONSTRAINT scraper_jobs_watchlist_id_fkey FOREIGN KEY (watchlist_id) REFERENCES public.competitor_watchlist(id) ON DELETE SET NULL;


--
-- Name: search_queries search_queries_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.image_collections(id);


--
-- Name: search_queries search_queries_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.search_sessions(id);


--
-- Name: seller_listings seller_listings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_listings
    ADD CONSTRAINT seller_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE SET NULL;


--
-- Name: seller_listings seller_listings_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_listings
    ADD CONSTRAINT seller_listings_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: orderId studio_orders_payment_mode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."orderId"
    ADD CONSTRAINT studio_orders_payment_mode_id_fkey FOREIGN KEY (payment_mode_id) REFERENCES public.payment_modes(id);


--
-- Name: orderId studio_orders_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."orderId"
    ADD CONSTRAINT studio_orders_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.order_sources(id);


--
-- Name: vendor_contacts vendor_contacts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: video_insights video_insights_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_insights
    ADD CONSTRAINT video_insights_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.competitor_videos(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7UOtmw7APa1X2GldAWQW0G8knnvEveTCkDZ7tRMWs5wXdsrVd3ILE8i9e8MBLR3

