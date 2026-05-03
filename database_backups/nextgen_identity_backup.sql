--
-- PostgreSQL database dump
--

\restrict alJhYMIqM6TOwZUVdhwWQYWOHmrc9TRgY1YdbBG6dXb5NzejQyFnMDch27q8IkG

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
-- Name: calculate_engagement_rate(bigint, bigint, bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_engagement_rate(p_like_count bigint, p_comment_count bigint, p_view_count bigint) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    IF p_view_count = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND(
        ((p_like_count + p_comment_count)::DECIMAL / p_view_count::DECIMAL) * 100,
        2
    );
END;
$$;


ALTER FUNCTION public.calculate_engagement_rate(p_like_count bigint, p_comment_count bigint, p_view_count bigint) OWNER TO postgres;

--
-- Name: cleanup_old_engagement_snapshots(integer); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.cleanup_old_engagement_snapshots(retention_days integer) OWNER TO postgres;

--
-- Name: cleanup_old_follower_snapshots(integer); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.cleanup_old_follower_snapshots(retention_days integer) OWNER TO postgres;

--
-- Name: get_next_scraper_session(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_next_scraper_session(p_platform character varying) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Get least-used healthy session not on cooldown
    SELECT id INTO v_session_id
    FROM scraper_sessions
    WHERE platform = p_platform
      AND enabled = true
      AND health_status = 'healthy'
      AND on_cooldown = false
    ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST
    LIMIT 1;
    
    -- Update usage counter
    IF v_session_id IS NOT NULL THEN
        UPDATE scraper_sessions
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$;


ALTER FUNCTION public.get_next_scraper_session(p_platform character varying) OWNER TO postgres;

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
-- Name: __EFMigrationsHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."__EFMigrationsHistory" (
    migration_id character varying(150) NOT NULL,
    product_version character varying(32) NOT NULL
);


ALTER TABLE public."__EFMigrationsHistory" OWNER TO postgres;

--
-- Name: __migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.__migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.__migrations OWNER TO postgres;

--
-- Name: __migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.__migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.__migrations_id_seq OWNER TO postgres;

--
-- Name: __migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.__migrations_id_seq OWNED BY public.__migrations.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.refresh_tokens IS 'JWT refresh tokens for session management';


--
-- Name: tenant_api_keys; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tenant_api_keys OWNER TO postgres;

--
-- Name: TABLE tenant_api_keys; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.tenant_api_keys IS 'API keys for programmatic tenant access';


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: TABLE tenants; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.tenants IS 'Multi-tenant organizations';


--
-- Name: COLUMN tenants.settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.tenants.settings IS 'Tenant-specific configurations stored as JSON (e.g. thumbnails, custom limits)';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'User accounts within tenants';


--
-- Name: __migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.__migrations ALTER COLUMN id SET DEFAULT nextval('public.__migrations_id_seq'::regclass);


--
-- Data for Name: __EFMigrationsHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."__EFMigrationsHistory" (migration_id, product_version) FROM stdin;
\.


--
-- Data for Name: __migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.__migrations (id, migration_name, executed_at) FROM stdin;
1	001_InitialSchema.sql	2026-04-12 12:30:24.932689
2	002_AddTenantSettings.sql	2026-04-12 12:30:24.993102
3	003_CompetitorIntelligence.sql	2026-04-12 12:30:25.020397
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token, expires_at, created_at, is_revoked, revoked_at, revoked_reason, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: tenant_api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_api_keys (id, tenant_id, name, key_hash, key_prefix, scopes, created_at, expires_at, last_used_at, is_active, created_by) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, name, description, slug, database_name, connection_string, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name, status, tier, max_storage_bytes, max_users, max_api_calls_per_day, created_at, updated_at, deleted_at, created_by, settings) FROM stdin;
cf123992-628d-4eb4-9721-aef8c59275a5	DeepLens Administration	\N	admin	nextgen_identity	\N	deeplens-qdrant	6333	6334	http://localhost:9000	platform-admin	1	3	10737418240	10	10000	2026-04-11 19:23:27.601911	\N	\N	\N	\N
2abbd721-873e-4bf0-9cb2-c93c6894c584	DeepLens Platform	\N	deeplens	deeplens_platform	\N	deeplens-qdrant-vayyari	0	0	192.168.0.170:9000	vayyari	1	1	10737418240	10	10000	2026-04-12 12:33:11.223804	\N	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, tenant_id, email, password_hash, first_name, last_name, email_confirmed, email_confirmation_token, email_confirmation_token_expiry, password_reset_token, password_reset_token_expiry, role, is_active, created_at, last_login_at, updated_at, deleted_at) FROM stdin;
9d1645f7-c93d-4c31-97f2-aed8c56275a5	cf123992-628d-4eb4-9721-aef8c59275a5	admin@deeplens.local	$2a$11$PUxn0wRtROrboSbM3p2i.eGLYjSIy9bamoUD6gnhFfh/rSiwpu82.	System	Admin	f	\N	\N	\N	\N	2	t	2026-04-11 19:25:33.899669	2026-04-16 15:27:56.803203	\N	\N
5f640573-2d80-4a9c-9a09-eece4fa1447f	2abbd721-873e-4bf0-9cb2-c93c6894c584	admin@deeplens.platform	$2a$11$PUxn0wRtROrboSbM3p2i.eGLYjSIy9bamoUD6gnhFfh/rSiwpu82.	Platform	Admin	t	\N	\N	\N	\N	3	t	2026-04-12 12:33:11.561214	2026-05-03 09:17:42.839391	\N	\N
\.


--
-- Name: __migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.__migrations_id_seq', 3, true);


--
-- Name: __migrations __migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.__migrations
    ADD CONSTRAINT __migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: __migrations __migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.__migrations
    ADD CONSTRAINT __migrations_pkey PRIMARY KEY (id);


--
-- Name: __EFMigrationsHistory pk___ef_migrations_history; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."__EFMigrationsHistory"
    ADD CONSTRAINT pk___ef_migrations_history PRIMARY KEY (migration_id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: tenant_api_keys tenant_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_api_keys
    ADD CONSTRAINT tenant_api_keys_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: users uq_tenant_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_tenant_email UNIQUE (tenant_id, email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_api_keys_prefix; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_prefix ON public.tenant_api_keys USING btree (key_prefix) WHERE (is_active = true);


--
-- Name: idx_api_keys_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_tenant_id ON public.tenant_api_keys USING btree (tenant_id);


--
-- Name: idx_refresh_tokens_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_expires ON public.refresh_tokens USING btree (expires_at) WHERE (is_revoked = false);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token) WHERE (is_revoked = false);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_tenants_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tenants_slug ON public.tenants USING btree (slug);


--
-- Name: idx_tenants_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tenants_status ON public.tenants USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_tenant_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_tenant_email ON public.users USING btree (tenant_id, email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tenant_api_keys tenant_api_keys_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_api_keys
    ADD CONSTRAINT tenant_api_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict alJhYMIqM6TOwZUVdhwWQYWOHmrc9TRgY1YdbBG6dXb5NzejQyFnMDch27q8IkG

