--
-- PostgreSQL database dump
--

\restrict HlMUGP8wnzuAQaTHwmIrcEfr7D5kabw3AWpguIQtUAVyyO7ssV5cuPLs54lNcR8

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

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: calculate_engagement_rate(bigint, bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_engagement_rate(p_like_count bigint, p_comment_count bigint, p_view_count bigint) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    IF p_view_count = 0 THEN RETURN 0; END IF;
    RETURN ROUND(
        ((p_like_count + p_comment_count)::DECIMAL / p_view_count::DECIMAL) * 100,
        2
    );
END;
$$;


--
-- Name: cleanup_old_engagement_snapshots(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_engagement_snapshots(retention_days integer DEFAULT 365) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM engagement_snapshots
    WHERE snapshot_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_follower_snapshots(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_follower_snapshots(retention_days integer DEFAULT 365) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM follower_snapshots
    WHERE snapshot_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: get_next_scraper_session(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_scraper_session(p_platform character varying) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_session_id UUID;
BEGIN
    SELECT id INTO v_session_id
    FROM scraper_sessions
    WHERE platform = p_platform
      AND enabled = true
      AND health_status = 'healthy'
      AND on_cooldown = false
    ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST
    LIMIT 1;
    
    IF v_session_id IS NOT NULL THEN
        UPDATE scraper_sessions
        SET usage_count = usage_count + 1, last_used_at = NOW()
        WHERE id = v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.__migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: __migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.__migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.__migrations_id_seq OWNED BY public.__migrations.id;


--
-- Name: competitor_videos; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT competitor_videos_download_status_check CHECK (((download_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('downloading'::character varying)::text, ('downloaded'::character varying)::text, ('failed'::character varying)::text, ('skipped'::character varying)::text]))),
    CONSTRAINT competitor_videos_platform_check CHECK (((platform)::text = ANY (ARRAY[('instagram'::character varying)::text, ('youtube'::character varying)::text]))),
    CONSTRAINT competitor_videos_tracking_phase_check CHECK (((tracking_phase)::text = ANY (ARRAY[('early'::character varying)::text, ('mature'::character varying)::text, ('archive'::character varying)::text, ('stopped'::character varying)::text])))
);


--
-- Name: competitor_watchlist; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT competitor_watchlist_platform_check CHECK (((platform)::text = ANY (ARRAY[('instagram'::character varying)::text, ('youtube'::character varying)::text])))
);


--
-- Name: engagement_snapshots; Type: TABLE; Schema: public; Owner: -
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
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT engagement_snapshots_tracking_phase_check CHECK (((tracking_phase)::text = ANY (ARRAY[('early'::character varying)::text, ('mature'::character varying)::text, ('archive'::character varying)::text])))
);


--
-- Name: follower_snapshots; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_revoked boolean DEFAULT false NOT NULL,
    revoked_at timestamp without time zone,
    revoked_reason character varying(255),
    ip_address character varying(45),
    user_agent character varying(500)
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.refresh_tokens IS 'JWT refresh tokens for session management';


--
-- Name: scraper_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scraper_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value jsonb NOT NULL,
    config_type character varying(50),
    description text,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: scraper_jobs; Type: TABLE; Schema: public; Owner: -
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
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scraper_jobs_job_type_check CHECK (((job_type)::text = ANY (ARRAY[('metadata_scrape'::character varying)::text, ('media_download'::character varying)::text, ('engagement_snapshot'::character varying)::text, ('follower_snapshot'::character varying)::text, ('account_health_check'::character varying)::text]))),
    CONSTRAINT scraper_jobs_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text, ('partial'::character varying)::text, ('timeout'::character varying)::text])))
);


--
-- Name: scraper_sessions; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT scraper_sessions_health_status_check CHECK (((health_status)::text = ANY (ARRAY[('healthy'::character varying)::text, ('degraded'::character varying)::text, ('down'::character varying)::text, ('banned'::character varying)::text, ('unknown'::character varying)::text]))),
    CONSTRAINT scraper_sessions_platform_check CHECK (((platform)::text = ANY (ARRAY[('instagram'::character varying)::text, ('youtube'::character varying)::text]))),
    CONSTRAINT scraper_sessions_rotation_strategy_check CHECK (((rotation_strategy)::text = ANY (ARRAY[('round_robin'::character varying)::text, ('random'::character varying)::text, ('least_used'::character varying)::text])))
);


--
-- Name: tenant_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    key_hash character varying(255) NOT NULL,
    key_prefix character varying(8) NOT NULL,
    scopes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone,
    last_used_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL
);


--
-- Name: TABLE tenant_api_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenant_api_keys IS 'API keys for programmatic tenant access';


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    slug character varying(100) NOT NULL,
    database_name character varying(100) NOT NULL,
    connection_string text,
    qdrant_container_name character varying(100) NOT NULL,
    qdrant_http_port integer NOT NULL,
    qdrant_grpc_port integer NOT NULL,
    minio_endpoint character varying(255) NOT NULL,
    minio_bucket_name character varying(100) NOT NULL,
    status smallint DEFAULT 1 NOT NULL,
    tier smallint DEFAULT 1 NOT NULL,
    max_storage_bytes bigint DEFAULT '10737418240'::bigint NOT NULL,
    max_users integer DEFAULT 10 NOT NULL,
    max_api_calls_per_day integer DEFAULT 10000 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    created_by uuid,
    settings text,
    CONSTRAINT chk_status CHECK (((status >= 1) AND (status <= 4))),
    CONSTRAINT chk_tier CHECK (((tier >= 1) AND (tier <= 3)))
);


--
-- Name: TABLE tenants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenants IS 'Multi-tenant organizations';


--
-- Name: COLUMN tenants.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.settings IS 'Tenant-specific configurations stored as JSON (e.g. thumbnails, custom limits)';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email_confirmed boolean DEFAULT false NOT NULL,
    email_confirmation_token character varying(255),
    email_confirmation_token_expiry timestamp without time zone,
    password_reset_token character varying(255),
    password_reset_token_expiry timestamp without time zone,
    role smallint DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    CONSTRAINT chk_role CHECK (((role >= 1) AND (role <= 3)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'User accounts within tenants';


--
-- Name: video_insights; Type: TABLE; Schema: public; Owner: -
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
    dismissed_by character varying(255),
    CONSTRAINT video_insights_insight_type_check CHECK (((insight_type)::text = ANY (ARRAY[('viral_spike'::character varying)::text, ('engagement_spike'::character varying)::text, ('trending'::character varying)::text, ('design_match'::character varying)::text, ('price_detected'::character varying)::text, ('new_product_launch'::character varying)::text, ('seasonal_trend'::character varying)::text, ('follower_spike'::character varying)::text])))
);


--
-- Name: vw_account_pool_health; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_account_pool_health AS
 SELECT platform,
    count(*) AS total_accounts,
    count(*) FILTER (WHERE (enabled = true)) AS enabled_accounts,
    count(*) FILTER (WHERE ((health_status)::text = 'healthy'::text)) AS healthy_accounts,
    count(*) FILTER (WHERE ((health_status)::text = 'banned'::text)) AS banned_accounts,
    count(*) FILTER (WHERE (on_cooldown = true)) AS on_cooldown_accounts,
    avg(consecutive_failures) AS avg_failures,
    max(last_used_at) AS most_recent_use
   FROM public.scraper_sessions
  GROUP BY platform;


--
-- Name: vw_engagement_growth; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_engagement_growth AS
 WITH snapshot_pairs AS (
         SELECT engagement_snapshots.video_id,
            engagement_snapshots.view_count,
            engagement_snapshots.like_count,
            engagement_snapshots.comment_count,
            engagement_snapshots.snapshot_at,
            engagement_snapshots.video_age_hours,
            lag(engagement_snapshots.view_count) OVER (PARTITION BY engagement_snapshots.video_id ORDER BY engagement_snapshots.snapshot_at) AS prev_views,
            lag(engagement_snapshots.like_count) OVER (PARTITION BY engagement_snapshots.video_id ORDER BY engagement_snapshots.snapshot_at) AS prev_likes,
            lag(engagement_snapshots.snapshot_at) OVER (PARTITION BY engagement_snapshots.video_id ORDER BY engagement_snapshots.snapshot_at) AS prev_snapshot_at
           FROM public.engagement_snapshots
        )
 SELECT v.platform_video_id,
    v.title,
    s.video_id,
    s.snapshot_at,
    s.view_count,
    s.like_count,
    (s.view_count - COALESCE(s.prev_views, 0)) AS views_gained,
    (s.like_count - COALESCE(s.prev_likes, 0)) AS likes_gained,
    (EXTRACT(epoch FROM (s.snapshot_at - s.prev_snapshot_at)) / (3600)::numeric) AS hours_since_last,
        CASE
            WHEN (s.prev_views > 0) THEN round(((((s.view_count - s.prev_views))::numeric / (s.prev_views)::numeric) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS view_growth_percent,
    s.video_age_hours
   FROM (snapshot_pairs s
     JOIN public.competitor_videos v ON ((v.id = s.video_id)))
  WHERE (s.prev_snapshot_at IS NOT NULL);


--
-- Name: vw_follower_growth; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_follower_growth AS
 WITH snapshot_pairs AS (
         SELECT follower_snapshots.watchlist_id,
            follower_snapshots.follower_count,
            follower_snapshots.following_count,
            follower_snapshots.snapshot_at,
            lag(follower_snapshots.follower_count) OVER (PARTITION BY follower_snapshots.watchlist_id ORDER BY follower_snapshots.snapshot_at) AS prev_followers,
            lag(follower_snapshots.following_count) OVER (PARTITION BY follower_snapshots.watchlist_id ORDER BY follower_snapshots.snapshot_at) AS prev_following,
            lag(follower_snapshots.snapshot_at) OVER (PARTITION BY follower_snapshots.watchlist_id ORDER BY follower_snapshots.snapshot_at) AS prev_snapshot_at
           FROM public.follower_snapshots
        )
 SELECT w.username,
    w.platform,
    s.watchlist_id,
    s.snapshot_at,
    s.follower_count,
    s.following_count,
    (s.follower_count - COALESCE(s.prev_followers, 0)) AS followers_gained,
    round(
        CASE
            WHEN (s.prev_followers > 0) THEN ((((s.follower_count - s.prev_followers))::numeric / (s.prev_followers)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END, 2) AS follower_growth_percent,
    (EXTRACT(epoch FROM (s.snapshot_at - s.prev_snapshot_at)) / (3600)::numeric) AS hours_since_last,
    round((((s.follower_count - COALESCE(s.prev_followers, 0)))::numeric / NULLIF((EXTRACT(epoch FROM (s.snapshot_at - s.prev_snapshot_at)) / (86400)::numeric), (0)::numeric)), 0) AS followers_per_day
   FROM (snapshot_pairs s
     JOIN public.competitor_watchlist w ON ((w.id = s.watchlist_id)))
  WHERE (s.prev_snapshot_at IS NOT NULL);


--
-- Name: vw_latest_videos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_latest_videos AS
 SELECT v.id,
    v.platform,
    v.platform_video_id,
    v.url,
    v.title,
    v.description,
    v.posted_at,
    v.view_count,
    v.like_count,
    v.comment_count,
    v.share_count,
    v.media_type,
    v.thumbnail_url,
    v.media_url,
    v.duration_seconds,
    v.hashtags,
    v.tagged_sku_ids,
    v.ai_suggested_sku_ids,
    v.tracking_phase,
    v.scraped_at,
    w.username AS competitor_username,
    w.display_name AS competitor_name,
    w.follower_count AS competitor_followers,
    w.tags AS competitor_tags,
        CASE
            WHEN (v.view_count > 0) THEN round(((((v.like_count + v.comment_count))::numeric / (v.view_count)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS engagement_rate
   FROM (public.competitor_videos v
     JOIN public.competitor_watchlist w ON ((v.watchlist_id = w.id)))
  ORDER BY v.posted_at DESC;


--
-- Name: vw_scraper_health; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_scraper_health AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(20) AS platform,
    NULL::character varying(255) AS username,
    NULL::character varying(255) AS display_name,
    NULL::boolean AS enabled,
    NULL::integer AS follower_count,
    NULL::timestamp with time zone AS last_scraped_at,
    NULL::integer AS scrape_failures_count,
    NULL::bigint AS total_videos,
    NULL::timestamp with time zone AS latest_video_date,
    NULL::bigint AS videos_last_24h,
    NULL::bigint AS videos_last_7d,
    NULL::character varying(20) AS last_job_status,
    NULL::bigint AS failures_last_24h;


--
-- Name: __migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__migrations ALTER COLUMN id SET DEFAULT nextval('public.__migrations_id_seq'::regclass);


--
-- Data for Name: __migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.__migrations (id, migration_name, executed_at) FROM stdin;
1	001_InitialSchema.sql	2026-04-12 12:30:24.932689
2	002_AddTenantSettings.sql	2026-04-12 12:30:24.993102
3	003_CompetitorIntelligence.sql	2026-04-12 12:30:25.020397
\.


--
-- Data for Name: competitor_videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.competitor_videos (id, watchlist_id, platform, platform_video_id, url, title, description, posted_at, view_count, like_count, comment_count, share_count, repost_count, media_type, thumbnail_url, media_url, media_urls, duration_seconds, width, height, file_size_bytes, hashtags, mentions, location, is_reel, is_short, category, raw_metadata, tagged_sku_ids, ai_suggested_sku_ids, tagging_confidence, tagging_notes, download_status, download_error, downloaded_at, tracking_phase, last_engagement_snapshot_at, scraped_at, updated_at) FROM stdin;
\.


--
-- Data for Name: competitor_watchlist; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.competitor_watchlist (id, platform, username, platform_id, display_name, profile_pic_url, bio, tags, enabled, follower_count, following_count, post_count, last_scraped_at, scrape_failures_count, last_follower_sync_at, follower_count_at_last_sync, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: engagement_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.engagement_snapshots (id, video_id, view_count, like_count, comment_count, share_count, repost_count, video_age_hours, tracking_phase, snapshot_at) FROM stdin;
\.


--
-- Data for Name: follower_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follower_snapshots (id, watchlist_id, follower_count, following_count, follower_following_ratio, engagement_rate, snapshot_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, token, expires_at, created_at, is_revoked, revoked_at, revoked_reason, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: scraper_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scraper_config (id, config_key, config_value, config_type, description, version, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: scraper_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scraper_jobs (id, job_id, watchlist_id, job_type, status, items_found, items_processed, items_failed, error_message, error_details, retry_count, max_retries, started_at, completed_at, duration_ms, worker_id, scraper_session_id, kafka_topic, kafka_partition, kafka_offset, triggered_by, config_snapshot, created_at) FROM stdin;
\.


--
-- Data for Name: scraper_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scraper_sessions (id, platform, username, display_name, session_cookies, session_metadata, api_token, last_used_at, last_health_check_at, health_status, consecutive_failures, total_requests_today, on_cooldown, cooldown_until, rotation_strategy, usage_count, enabled, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenant_api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenant_api_keys (id, tenant_id, name, key_hash, key_prefix, scopes, created_at, expires_at, last_used_at, is_active, created_by) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenants (id, name, description, slug, database_name, connection_string, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name, status, tier, max_storage_bytes, max_users, max_api_calls_per_day, created_at, updated_at, deleted_at, created_by, settings) FROM stdin;
cf123992-628d-4eb4-9721-aef8c59275a5	DeepLens Administration	\N	admin	nextgen_identity	\N	deeplens-qdrant	6333	6334	http://localhost:9000	platform-admin	1	3	10737418240	10	10000	2026-04-11 19:23:27.601911	\N	\N	\N	\N
2abbd721-873e-4bf0-9cb2-c93c6894c584	vayyari	\N	vayyari	tenant_vayyari_metadata	\N	deeplens-qdrant-vayyari	0	0	192.168.0.170:9000	vayyari	1	1	10737418240	10	10000	2026-04-12 12:33:11.223804	\N	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, tenant_id, email, password_hash, first_name, last_name, email_confirmed, email_confirmation_token, email_confirmation_token_expiry, password_reset_token, password_reset_token_expiry, role, is_active, created_at, last_login_at, updated_at, deleted_at) FROM stdin;
9d1645f7-c93d-4c31-97f2-aed8c56275a5	cf123992-628d-4eb4-9721-aef8c59275a5	admin@deeplens.local	$2a$11$PUxn0wRtROrboSbM3p2i.eGLYjSIy9bamoUD6gnhFfh/rSiwpu82.	System	Admin	f	\N	\N	\N	\N	2	t	2026-04-11 19:25:33.899669	2026-04-12 16:36:57.089856	\N	\N
5f640573-2d80-4a9c-9a09-eece4fa1447f	2abbd721-873e-4bf0-9cb2-c93c6894c584	admin@vayyari.local	$2a$11$PUxn0wRtROrboSbM3p2i.eGLYjSIy9bamoUD6gnhFfh/rSiwpu82.	Vayyari	Admin	t	\N	\N	\N	\N	3	t	2026-04-12 12:33:11.561214	2026-04-12 16:37:03.302229	\N	\N
\.


--
-- Data for Name: video_insights; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_insights (id, video_id, insight_type, insight_score, insight_data, detected_at, dismissed, dismissed_at, dismissed_by) FROM stdin;
\.


--
-- Name: __migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.__migrations_id_seq', 3, true);


--
-- Name: __migrations __migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__migrations
    ADD CONSTRAINT __migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: __migrations __migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__migrations
    ADD CONSTRAINT __migrations_pkey PRIMARY KEY (id);


--
-- Name: competitor_videos competitor_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_videos
    ADD CONSTRAINT competitor_videos_pkey PRIMARY KEY (id);


--
-- Name: competitor_videos competitor_videos_platform_platform_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_videos
    ADD CONSTRAINT competitor_videos_platform_platform_video_id_key UNIQUE (platform, platform_video_id);


--
-- Name: competitor_watchlist competitor_watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_watchlist
    ADD CONSTRAINT competitor_watchlist_pkey PRIMARY KEY (id);


--
-- Name: competitor_watchlist competitor_watchlist_platform_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_watchlist
    ADD CONSTRAINT competitor_watchlist_platform_username_key UNIQUE (platform, username);


--
-- Name: engagement_snapshots engagement_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engagement_snapshots
    ADD CONSTRAINT engagement_snapshots_pkey PRIMARY KEY (id);


--
-- Name: follower_snapshots follower_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follower_snapshots
    ADD CONSTRAINT follower_snapshots_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: scraper_config scraper_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraper_config
    ADD CONSTRAINT scraper_config_config_key_key UNIQUE (config_key);


--
-- Name: scraper_config scraper_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraper_config
    ADD CONSTRAINT scraper_config_pkey PRIMARY KEY (id);


--
-- Name: scraper_jobs scraper_jobs_job_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraper_jobs
    ADD CONSTRAINT scraper_jobs_job_id_key UNIQUE (job_id);


--
-- Name: scraper_jobs scraper_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraper_jobs
    ADD CONSTRAINT scraper_jobs_pkey PRIMARY KEY (id);


--
-- Name: scraper_sessions scraper_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraper_sessions
    ADD CONSTRAINT scraper_sessions_pkey PRIMARY KEY (id);


--
-- Name: scraper_sessions scraper_sessions_platform_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraper_sessions
    ADD CONSTRAINT scraper_sessions_platform_username_key UNIQUE (platform, username);


--
-- Name: tenant_api_keys tenant_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_api_keys
    ADD CONSTRAINT tenant_api_keys_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: engagement_snapshots unique_video_snapshot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engagement_snapshots
    ADD CONSTRAINT unique_video_snapshot UNIQUE (video_id, snapshot_at);


--
-- Name: follower_snapshots unique_watchlist_follower_snapshot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follower_snapshots
    ADD CONSTRAINT unique_watchlist_follower_snapshot UNIQUE (watchlist_id, snapshot_at);


--
-- Name: users uq_tenant_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_tenant_email UNIQUE (tenant_id, email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: video_insights video_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_insights
    ADD CONSTRAINT video_insights_pkey PRIMARY KEY (id);


--
-- Name: video_insights video_insights_video_id_insight_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_insights
    ADD CONSTRAINT video_insights_video_id_insight_type_key UNIQUE (video_id, insight_type);


--
-- Name: idx_api_keys_prefix; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_prefix ON public.tenant_api_keys USING btree (key_prefix) WHERE (is_active = true);


--
-- Name: idx_api_keys_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_tenant_id ON public.tenant_api_keys USING btree (tenant_id);


--
-- Name: idx_config_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_key ON public.scraper_config USING btree (config_key);


--
-- Name: idx_config_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_type ON public.scraper_config USING btree (config_type, is_active);


--
-- Name: idx_follower_snapshots_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follower_snapshots_time ON public.follower_snapshots USING btree (snapshot_at DESC);


--
-- Name: idx_follower_snapshots_watchlist_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follower_snapshots_watchlist_time ON public.follower_snapshots USING btree (watchlist_id, snapshot_at DESC);


--
-- Name: idx_insights_not_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_not_dismissed ON public.video_insights USING btree (dismissed, detected_at DESC) WHERE (NOT dismissed);


--
-- Name: idx_insights_type_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_type_score ON public.video_insights USING btree (insight_type, insight_score DESC);


--
-- Name: idx_insights_video; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_video ON public.video_insights USING btree (video_id);


--
-- Name: idx_jobs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_created ON public.scraper_jobs USING btree (created_at DESC);


--
-- Name: idx_jobs_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_job_id ON public.scraper_jobs USING btree (job_id);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_status ON public.scraper_jobs USING btree (status, created_at DESC);


--
-- Name: idx_jobs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_type ON public.scraper_jobs USING btree (job_type, created_at DESC);


--
-- Name: idx_jobs_watchlist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_watchlist ON public.scraper_jobs USING btree (watchlist_id, created_at DESC);


--
-- Name: idx_jobs_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_worker ON public.scraper_jobs USING btree (worker_id, created_at DESC);


--
-- Name: idx_refresh_tokens_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_expires ON public.refresh_tokens USING btree (expires_at) WHERE (is_revoked = false);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token) WHERE (is_revoked = false);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_sessions_cooldown; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_cooldown ON public.scraper_sessions USING btree (on_cooldown, cooldown_until) WHERE (on_cooldown = true);


--
-- Name: idx_sessions_health; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_health ON public.scraper_sessions USING btree (health_status, last_health_check_at);


--
-- Name: idx_sessions_platform_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_platform_enabled ON public.scraper_sessions USING btree (platform, enabled);


--
-- Name: idx_snapshots_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshots_age ON public.engagement_snapshots USING btree (video_age_hours);


--
-- Name: idx_snapshots_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshots_phase ON public.engagement_snapshots USING btree (tracking_phase, snapshot_at DESC);


--
-- Name: idx_snapshots_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshots_time ON public.engagement_snapshots USING btree (snapshot_at DESC);


--
-- Name: idx_snapshots_video_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshots_video_time ON public.engagement_snapshots USING btree (video_id, snapshot_at DESC);


--
-- Name: idx_tenants_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_slug ON public.tenants USING btree (slug);


--
-- Name: idx_tenants_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_status ON public.tenants USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_tenant_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_tenant_email ON public.users USING btree (tenant_id, email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);


--
-- Name: idx_videos_ai_skus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_ai_skus ON public.competitor_videos USING gin (ai_suggested_sku_ids);


--
-- Name: idx_videos_hashtags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_hashtags ON public.competitor_videos USING gin (hashtags);


--
-- Name: idx_videos_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_media_type ON public.competitor_videos USING btree (media_type);


--
-- Name: idx_videos_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_metadata ON public.competitor_videos USING gin (raw_metadata);


--
-- Name: idx_videos_platform_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_platform_id ON public.competitor_videos USING btree (platform, platform_video_id);


--
-- Name: idx_videos_platform_posted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_platform_posted ON public.competitor_videos USING btree (platform, posted_at DESC);


--
-- Name: idx_videos_posted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_posted_at ON public.competitor_videos USING btree (posted_at DESC);


--
-- Name: idx_videos_tagged_skus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_tagged_skus ON public.competitor_videos USING gin (tagged_sku_ids);


--
-- Name: idx_videos_tracking_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_tracking_phase ON public.competitor_videos USING btree (tracking_phase, posted_at DESC);


--
-- Name: idx_videos_watchlist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_watchlist ON public.competitor_videos USING btree (watchlist_id);


--
-- Name: idx_watchlist_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watchlist_enabled ON public.competitor_watchlist USING btree (enabled, platform);


--
-- Name: idx_watchlist_follower_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watchlist_follower_count ON public.competitor_watchlist USING btree (follower_count DESC) WHERE (enabled = true);


--
-- Name: idx_watchlist_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watchlist_platform ON public.competitor_watchlist USING btree (platform);


--
-- Name: idx_watchlist_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watchlist_tags ON public.competitor_watchlist USING gin (tags);


--
-- Name: vw_scraper_health _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.vw_scraper_health AS
 SELECT w.id,
    w.platform,
    w.username,
    w.display_name,
    w.enabled,
    w.follower_count,
    w.last_scraped_at,
    w.scrape_failures_count,
    count(v.id) AS total_videos,
    max(v.posted_at) AS latest_video_date,
    count(
        CASE
            WHEN (v.scraped_at > (now() - '24:00:00'::interval)) THEN 1
            ELSE NULL::integer
        END) AS videos_last_24h,
    count(
        CASE
            WHEN (v.scraped_at > (now() - '7 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS videos_last_7d,
    ( SELECT scraper_jobs.status
           FROM public.scraper_jobs
          WHERE (scraper_jobs.watchlist_id = w.id)
          ORDER BY scraper_jobs.created_at DESC
         LIMIT 1) AS last_job_status,
    ( SELECT count(*) AS count
           FROM public.scraper_jobs
          WHERE ((scraper_jobs.watchlist_id = w.id) AND ((scraper_jobs.status)::text = 'failed'::text) AND (scraper_jobs.created_at > (now() - '24:00:00'::interval)))) AS failures_last_24h
   FROM (public.competitor_watchlist w
     LEFT JOIN public.competitor_videos v ON ((v.watchlist_id = w.id)))
  GROUP BY w.id;


--
-- Name: scraper_config trigger_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_config_updated_at BEFORE UPDATE ON public.scraper_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scraper_sessions trigger_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sessions_updated_at BEFORE UPDATE ON public.scraper_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: competitor_videos trigger_videos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_videos_updated_at BEFORE UPDATE ON public.competitor_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: competitor_watchlist trigger_watchlist_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_watchlist_updated_at BEFORE UPDATE ON public.competitor_watchlist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: competitor_videos competitor_videos_watchlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_videos
    ADD CONSTRAINT competitor_videos_watchlist_id_fkey FOREIGN KEY (watchlist_id) REFERENCES public.competitor_watchlist(id) ON DELETE CASCADE;


--
-- Name: engagement_snapshots engagement_snapshots_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engagement_snapshots
    ADD CONSTRAINT engagement_snapshots_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.competitor_videos(id) ON DELETE CASCADE;


--
-- Name: follower_snapshots follower_snapshots_watchlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follower_snapshots
    ADD CONSTRAINT follower_snapshots_watchlist_id_fkey FOREIGN KEY (watchlist_id) REFERENCES public.competitor_watchlist(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scraper_jobs scraper_jobs_scraper_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraper_jobs
    ADD CONSTRAINT scraper_jobs_scraper_session_id_fkey FOREIGN KEY (scraper_session_id) REFERENCES public.scraper_sessions(id) ON DELETE SET NULL;


--
-- Name: scraper_jobs scraper_jobs_watchlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraper_jobs
    ADD CONSTRAINT scraper_jobs_watchlist_id_fkey FOREIGN KEY (watchlist_id) REFERENCES public.competitor_watchlist(id) ON DELETE SET NULL;


--
-- Name: tenant_api_keys tenant_api_keys_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_api_keys
    ADD CONSTRAINT tenant_api_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: video_insights video_insights_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_insights
    ADD CONSTRAINT video_insights_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.competitor_videos(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict HlMUGP8wnzuAQaTHwmIrcEfr7D5kabw3AWpguIQtUAVyyO7ssV5cuPLs54lNcR8

