--
-- PostgreSQL database dump
--

\restrict PudNF1T1J5wp564ELPtap7yyifCC2nFBHmiXJ4xJBZqWJzqYdN8bwekVLPlGu5l

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
-- Name: hstore; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;


--
-- Name: EXTENSION hstore; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION hstore IS 'data type for storing sets of (key, value) pairs';


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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    metadata_json jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: image_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_collections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_public boolean DEFAULT false,
    total_images integer DEFAULT 0,
    metadata jsonb
);


--
-- Name: ingestion_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingestion_meta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: media_deletion_queue; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid,
    price numeric(18,2) NOT NULL,
    currency character varying(10) NOT NULL,
    effective_date timestamp with time zone DEFAULT now()
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: search_queries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_queries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
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


--
-- Name: search_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    session_start timestamp with time zone DEFAULT now(),
    session_end timestamp with time zone,
    total_searches integer DEFAULT 0,
    ip_address inet,
    user_agent text,
    metadata jsonb
);


--
-- Name: seller_listings; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: sellers; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: usage_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_statistics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    metric_name character varying(255) NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit character varying(50),
    recorded_at timestamp with time zone DEFAULT now(),
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    metadata jsonb
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    preference_key character varying(255) NOT NULL,
    preference_value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vendor_contacts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE vendor_contacts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vendor_contacts IS 'Contact persons associated with each vendor';


--
-- Name: COLUMN vendor_contacts.is_primary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor_contacts.is_primary IS 'Indicates the primary contact person for the vendor';


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
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


--
-- Name: TABLE vendors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vendors IS 'Stores vendor/manufacturer information for multi-tenant product catalog';


--
-- Name: COLUMN vendors.vendor_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.vendor_code IS 'Optional short code for easy reference (e.g., "VAY-001")';


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, metadata_json, created_at) FROM stdin;
\.


--
-- Data for Name: image_collections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.image_collections (id, tenant_id, name, description, created_by, created_at, updated_at, is_public, total_images, metadata) FROM stdin;
\.


--
-- Data for Name: ingestion_meta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ingestion_meta (id, key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media (id, variant_id, storage_path, media_type, original_filename, file_size_bytes, mime_type, status, vector_id, phash, is_default, quality_score, width, height, duration_seconds, thumbnail_path, preview_path, features_extracted, indexed, uploaded_at, metadata_json) FROM stdin;
\.


--
-- Data for Name: media_deletion_queue; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_deletion_queue (id, media_id, storage_path, deleted_from_disk, deleted_from_vector, retries, created_at, processed_at) FROM stdin;
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_history (id, listing_id, price, currency, effective_date) FROM stdin;
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_variants (id, product_id, variant_sku, color, fabric, stitch_type, work_heaviness, search_keywords, attributes_json, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, category_id, base_sku, title, tags, unified_attributes, created_at) FROM stdin;
\.


--
-- Data for Name: search_queries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.search_queries (id, tenant_id, session_id, query_type, query_vector_id, query_text, collection_id, results_count, response_time_ms, similarity_threshold, "timestamp", metadata) FROM stdin;
\.


--
-- Data for Name: search_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.search_sessions (id, tenant_id, user_id, session_start, session_end, total_searches, ip_address, user_agent, metadata) FROM stdin;
\.


--
-- Data for Name: seller_listings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seller_listings (id, variant_id, seller_id, external_id, current_price, currency, shipping_info, is_favorite, is_active, description, url, last_priced_at, raw_data_json, updated_at) FROM stdin;
\.


--
-- Data for Name: sellers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sellers (id, external_id, name, contact_info, rating, is_trusted, created_at) FROM stdin;
\.


--
-- Data for Name: usage_statistics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usage_statistics (id, tenant_id, metric_name, metric_value, metric_unit, recorded_at, period_start, period_end, metadata) FROM stdin;
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_preferences (id, tenant_id, user_id, preference_key, preference_value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vendor_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_contacts (id, vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendors (id, tenant_id, vendor_name, vendor_code, address, city, state, country, postal_code, email, website, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: image_collections image_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_collections
    ADD CONSTRAINT image_collections_pkey PRIMARY KEY (id);


--
-- Name: ingestion_meta ingestion_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_meta
    ADD CONSTRAINT ingestion_meta_pkey PRIMARY KEY (id);


--
-- Name: media_deletion_queue media_deletion_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_deletion_queue
    ADD CONSTRAINT media_deletion_queue_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: products products_base_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_base_sku_key UNIQUE (base_sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: search_queries search_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_pkey PRIMARY KEY (id);


--
-- Name: search_sessions search_sessions_id_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_sessions
    ADD CONSTRAINT search_sessions_id_tenant_id_key UNIQUE (id, tenant_id);


--
-- Name: search_sessions search_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_sessions
    ADD CONSTRAINT search_sessions_pkey PRIMARY KEY (id);


--
-- Name: seller_listings seller_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_listings
    ADD CONSTRAINT seller_listings_pkey PRIMARY KEY (id);


--
-- Name: sellers sellers_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_external_id_key UNIQUE (external_id);


--
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (id);


--
-- Name: image_collections unique_collection_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_collections
    ADD CONSTRAINT unique_collection_tenant UNIQUE (id, tenant_id);


--
-- Name: image_collections unique_tenant_collection_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_collections
    ADD CONSTRAINT unique_tenant_collection_name UNIQUE (tenant_id, name);


--
-- Name: usage_statistics usage_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_statistics
    ADD CONSTRAINT usage_statistics_pkey PRIMARY KEY (id);


--
-- Name: usage_statistics usage_statistics_tenant_id_metric_name_recorded_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_statistics
    ADD CONSTRAINT usage_statistics_tenant_id_metric_name_recorded_at_key UNIQUE (tenant_id, metric_name, recorded_at);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_tenant_id_user_id_preference_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_tenant_id_user_id_preference_key_key UNIQUE (tenant_id, user_id, preference_key);


--
-- Name: vendor_contacts vendor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: idx_image_collections_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_collections_created_at ON public.image_collections USING btree (created_at);


--
-- Name: idx_image_collections_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_collections_created_by ON public.image_collections USING btree (created_by);


--
-- Name: idx_image_collections_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_collections_tenant_id ON public.image_collections USING btree (tenant_id);


--
-- Name: idx_media_phash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_phash ON public.media USING btree (phash);


--
-- Name: idx_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_type ON public.media USING btree (media_type);


--
-- Name: idx_price_history_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_listing ON public.price_history USING btree (listing_id);


--
-- Name: idx_product_variants_attributes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_attributes ON public.product_variants USING gin (attributes_json);


--
-- Name: idx_product_variants_keywords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_keywords ON public.product_variants USING gin (search_keywords);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (base_sku);


--
-- Name: idx_search_queries_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_queries_collection_id ON public.search_queries USING btree (collection_id);


--
-- Name: idx_search_queries_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_queries_session_id ON public.search_queries USING btree (session_id);


--
-- Name: idx_search_queries_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_queries_tenant_id ON public.search_queries USING btree (tenant_id);


--
-- Name: idx_search_queries_tenant_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_queries_tenant_type_time ON public.search_queries USING btree (tenant_id, query_type, "timestamp");


--
-- Name: idx_search_queries_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_queries_timestamp ON public.search_queries USING btree ("timestamp");


--
-- Name: idx_search_queries_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_queries_type ON public.search_queries USING btree (query_type);


--
-- Name: idx_search_sessions_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_sessions_start_time ON public.search_sessions USING btree (session_start);


--
-- Name: idx_search_sessions_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_sessions_tenant_id ON public.search_sessions USING btree (tenant_id);


--
-- Name: idx_search_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_sessions_user_id ON public.search_sessions USING btree (user_id);


--
-- Name: idx_seller_listings_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_listings_variant ON public.seller_listings USING btree (variant_id);


--
-- Name: idx_usage_statistics_metric; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_statistics_metric ON public.usage_statistics USING btree (metric_name);


--
-- Name: idx_usage_statistics_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_statistics_recorded_at ON public.usage_statistics USING btree (recorded_at);


--
-- Name: idx_usage_statistics_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_statistics_tenant_id ON public.usage_statistics USING btree (tenant_id);


--
-- Name: idx_user_preferences_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferences_key ON public.user_preferences USING btree (preference_key);


--
-- Name: idx_user_preferences_tenant_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferences_tenant_user ON public.user_preferences USING btree (tenant_id, user_id);


--
-- Name: idx_vendor_contacts_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_contacts_vendor ON public.vendor_contacts USING btree (vendor_id);


--
-- Name: idx_vendors_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_active ON public.vendors USING btree (tenant_id, is_active);


--
-- Name: idx_vendors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_name ON public.vendors USING btree (tenant_id, vendor_name);


--
-- Name: idx_vendors_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_tenant ON public.vendors USING btree (tenant_id);


--
-- Name: search_queries fk_collection_tenant_consistency; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT fk_collection_tenant_consistency FOREIGN KEY (collection_id, tenant_id) REFERENCES public.image_collections(id, tenant_id);


--
-- Name: search_queries fk_session_tenant_consistency; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT fk_session_tenant_consistency FOREIGN KEY (session_id, tenant_id) REFERENCES public.search_sessions(id, tenant_id);


--
-- Name: media media_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: price_history price_history_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_listings(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: search_queries search_queries_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.image_collections(id);


--
-- Name: search_queries search_queries_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.search_sessions(id);


--
-- Name: seller_listings seller_listings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_listings
    ADD CONSTRAINT seller_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE SET NULL;


--
-- Name: seller_listings seller_listings_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_listings
    ADD CONSTRAINT seller_listings_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: vendor_contacts vendor_contacts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: image_collections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.image_collections ENABLE ROW LEVEL SECURITY;

--
-- Name: search_queries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

--
-- Name: search_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.search_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: image_collections tenant_isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation_policy ON public.image_collections TO tenant_service USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));


--
-- Name: search_queries tenant_isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation_policy ON public.search_queries TO tenant_service USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));


--
-- Name: search_sessions tenant_isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation_policy ON public.search_sessions TO tenant_service USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));


--
-- Name: usage_statistics tenant_isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation_policy ON public.usage_statistics TO tenant_service USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));


--
-- Name: user_preferences tenant_isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation_policy ON public.user_preferences TO tenant_service USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));


--
-- Name: usage_statistics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_statistics ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict PudNF1T1J5wp564ELPtap7yyifCC2nFBHmiXJ4xJBZqWJzqYdN8bwekVLPlGu5l

