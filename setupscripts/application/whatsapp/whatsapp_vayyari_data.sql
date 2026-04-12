--
-- PostgreSQL database dump
--

\restrict qx0Gj3geFPpN4CxybSCtHK3eSWVARWUL6LQ4PNncbQ8G5xMLRO5DkkHp3bZJy3B

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
-- Name: get_chats_whatsapp_style(boolean, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_chats_whatsapp_style(p_include_archived boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(jid character varying, name character varying, is_group boolean, is_announcement boolean, unread_count integer, last_message_text text, last_message_timestamp bigint, last_message_from_me boolean, is_pinned boolean, is_archived boolean, is_muted boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.jid,
        c.name,
        c.is_group,
        c.is_announcement,
        c.unread_count,
        c.last_message_text,
        c.last_message_timestamp,
        c.last_message_from_me,
        c.is_pinned,
        c.is_archived,
        c.is_muted
    FROM chats c
    WHERE 
        (p_include_archived = TRUE OR c.is_archived = FALSE)
    ORDER BY
        -- Pinned chats first (by pin order)
        c.is_pinned DESC,
        c.pin_order DESC,
        -- Then by last message timestamp
        c.last_message_timestamp DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: increment_unread_count(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_unread_count(p_jid character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE chats
    SET unread_count = unread_count + 1,
        updated_at = NOW()
    WHERE jid = p_jid;
END;
$$;


--
-- Name: reset_unread_count(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_unread_count(p_jid character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE chats
    SET unread_count = 0,
        updated_at = NOW()
    WHERE jid = p_jid;
END;
$$;


--
-- Name: update_last_message(character varying, text, bigint, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_last_message(p_jid character varying, p_message_text text, p_timestamp bigint, p_from_me boolean) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE chats
    SET last_message_text = p_message_text,
        last_message_timestamp = p_timestamp,
        last_message_from_me = p_from_me,
        updated_at = NOW()
    WHERE jid = p_jid;
END;
$$;


--
-- Name: update_last_message_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_last_message_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.last_message_timestamp IS NOT NULL THEN
        NEW.last_message_at = to_timestamp(NEW.last_message_timestamp);
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chat_tracking_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_tracking_state (
    jid character varying(255) NOT NULL,
    is_excluded boolean DEFAULT false,
    last_processed_message_id character varying(255),
    last_processed_timestamp bigint,
    excluded_at timestamp without time zone,
    excluded_by character varying(255),
    resume_mode character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT chat_tracking_state_resume_mode_check CHECK (((resume_mode)::text = ANY ((ARRAY['from_last'::character varying, 'from_now'::character varying])::text[])))
);


--
-- Name: TABLE chat_tracking_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_tracking_state IS 'Stores tracking state for each chat';


--
-- Name: COLUMN chat_tracking_state.jid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chat_tracking_state.jid IS 'Chat JID (foreign key to chats)';


--
-- Name: COLUMN chat_tracking_state.is_excluded; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chat_tracking_state.is_excluded IS 'Whether chat is excluded from tracking';


--
-- Name: COLUMN chat_tracking_state.last_processed_message_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chat_tracking_state.last_processed_message_id IS 'Last message ID that was processed';


--
-- Name: COLUMN chat_tracking_state.last_processed_timestamp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chat_tracking_state.last_processed_timestamp IS 'Timestamp of last processed message';


--
-- Name: COLUMN chat_tracking_state.resume_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chat_tracking_state.resume_mode IS 'Resume mode when re-including: from_last or from_now';


--
-- Name: chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chats (
    jid character varying(255) NOT NULL,
    name character varying(500) NOT NULL,
    is_group boolean DEFAULT false,
    is_announcement boolean DEFAULT false,
    unread_count integer DEFAULT 0,
    last_message_text text,
    last_message_timestamp bigint,
    last_message_from_me boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    pin_order integer DEFAULT 0,
    is_muted boolean DEFAULT false,
    mute_until_timestamp bigint,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    last_message_at timestamp without time zone,
    is_contact boolean DEFAULT false,
    canonical_jid character varying(255),
    enable_message_grouping boolean DEFAULT false,
    grouping_config jsonb DEFAULT '{}'::jsonb,
    deep_sync_enabled boolean DEFAULT false,
    vendor_id character varying(255),
    vendor_name character varying(500),
    vendor_assigned_at timestamp without time zone,
    vendor_assigned_by character varying(255),
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: TABLE chats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chats IS 'Enhanced chat table for WhatsApp-like UI with unread counts and ordering';


--
-- Name: COLUMN chats.unread_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.unread_count IS 'Number of unread messages in this chat';


--
-- Name: COLUMN chats.last_message_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.last_message_text IS 'Preview text of last message';


--
-- Name: COLUMN chats.last_message_timestamp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.last_message_timestamp IS 'Unix timestamp of last message for sorting';


--
-- Name: COLUMN chats.is_archived; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.is_archived IS 'Whether chat is archived';


--
-- Name: COLUMN chats.is_pinned; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.is_pinned IS 'Whether chat is pinned to top';


--
-- Name: COLUMN chats.pin_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.pin_order IS 'Order of pinned chats (higher = more important)';


--
-- Name: COLUMN chats.is_muted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.is_muted IS 'Whether notifications are muted';


--
-- Name: COLUMN chats.enable_message_grouping; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.enable_message_grouping IS 'Whether messages from this chat should be grouped and processed';


--
-- Name: COLUMN chats.grouping_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.grouping_config IS 'Configuration rules for message grouping (strategy, thresholds, etc)';


--
-- Name: COLUMN chats.deep_sync_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.deep_sync_enabled IS 'Whether full history sync is requested for this chat';


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    jid character varying(128) NOT NULL,
    name character varying(255),
    push_name character varying(255),
    number character varying(50),
    is_business boolean DEFAULT false,
    is_my_contact boolean DEFAULT false,
    profile_pic_url text,
    last_active timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE contacts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contacts IS 'Stores synced WhatsApp contacts';


--
-- Name: conversation_sync_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_sync_state (
    jid character varying(255) NOT NULL,
    is_fully_synced boolean DEFAULT false,
    sync_in_progress boolean DEFAULT false,
    last_synced_message_timestamp bigint,
    total_messages_synced integer DEFAULT 0,
    estimated_total_messages integer,
    first_sync_at timestamp without time zone,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    sync_metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: TABLE conversation_sync_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversation_sync_state IS 'Tracks sync state for sparse conversation loading';


--
-- Name: COLUMN conversation_sync_state.is_fully_synced; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversation_sync_state.is_fully_synced IS 'Whether all historical messages have been synced';


--
-- Name: COLUMN conversation_sync_state.sync_in_progress; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversation_sync_state.sync_in_progress IS 'Whether a sync operation is currently running';


--
-- Name: COLUMN conversation_sync_state.last_synced_message_timestamp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversation_sync_state.last_synced_message_timestamp IS 'Timestamp of the oldest synced message';


--
-- Name: media_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_files (
    id bigint NOT NULL,
    minio_bucket character varying(255) NOT NULL,
    minio_object_name text NOT NULL,
    minio_url text NOT NULL,
    original_filename character varying(500),
    file_size bigint,
    mime_type character varying(100),
    media_type character varying(50) NOT NULL,
    message_id character varying(255),
    jid character varying(255),
    uploaded_at timestamp without time zone DEFAULT now(),
    upload_status character varying(50) DEFAULT 'completed'::character varying,
    deeplens_bucket character varying(255),
    deeplens_object_name text,
    deeplens_url text,
    migrated_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT media_files_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['photo'::character varying, 'video'::character varying, 'audio'::character varying, 'document'::character varying])::text[])))
);


--
-- Name: TABLE media_files; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.media_files IS 'Stores metadata for all media files uploaded to MinIO';


--
-- Name: COLUMN media_files.minio_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.media_files.minio_url IS 'Current MinIO URL (minio://bucket/path)';


--
-- Name: COLUMN media_files.media_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.media_files.media_type IS 'Type: photo, video, audio, document';


--
-- Name: COLUMN media_files.upload_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.media_files.upload_status IS 'Status: pending, completed, failed';


--
-- Name: COLUMN media_files.deeplens_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.media_files.deeplens_url IS 'DeepLens bucket URL after migration';


--
-- Name: media_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.media_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: media_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.media_files_id_seq OWNED BY public.media_files.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    message_id character varying(255) NOT NULL,
    jid character varying(255) NOT NULL,
    content text,
    message_type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    group_id character varying(255),
    media_type character varying(50),
    media_url text,
    media_size bigint,
    media_mime_type character varying(100),
    sender character varying(255),
    sender_name character varying(500),
    "timestamp" bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    is_from_me boolean DEFAULT false,
    is_forwarded boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    processing_status character varying(20) DEFAULT 'pending'::character varying,
    processing_retry_count integer DEFAULT 0,
    processing_last_attempt timestamp without time zone,
    processing_completed_at timestamp without time zone,
    processing_error text,
    deeplens_processed boolean DEFAULT false,
    deeplens_sent_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'Stores all WhatsApp messages';


--
-- Name: COLUMN messages.message_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.message_id IS 'WhatsApp message ID (unique)';


--
-- Name: COLUMN messages.jid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.jid IS 'Chat JID (foreign key to chats)';


--
-- Name: COLUMN messages.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.content IS 'Message text content';


--
-- Name: COLUMN messages.message_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.message_type IS 'Type: text, image, video, audio, document, etc.';


--
-- Name: COLUMN messages.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.group_id IS 'Conversation grouping ID: {jid}_{timestamp} format - groups messages within time window (all types: text, image, video, etc.)';


--
-- Name: COLUMN messages.media_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.media_url IS 'MinIO URL for media files';


--
-- Name: COLUMN messages."timestamp"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages."timestamp" IS 'Unix timestamp from WhatsApp';


--
-- Name: COLUMN messages.processing_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.processing_status IS 'Processing queue status: pending, ready, queued, processing, processed, failed';


--
-- Name: COLUMN messages.processing_retry_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.processing_retry_count IS 'Number of processing attempts';


--
-- Name: COLUMN messages.processing_last_attempt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.processing_last_attempt IS 'Last time processing was attempted';


--
-- Name: COLUMN messages.processing_completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.processing_completed_at IS 'When processing completed successfully';


--
-- Name: COLUMN messages.processing_error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.processing_error IS 'Error message if processing failed';


--
-- Name: COLUMN messages.deeplens_processed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.deeplens_processed IS 'Whether image has been sent to DeepLens for AI processing';


--
-- Name: COLUMN messages.deeplens_sent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.deeplens_sent_at IS 'Timestamp when image was sent to DeepLens';


--
-- Name: COLUMN messages.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.metadata IS 'Additional metadata (reactions, mentions, etc.)';


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: processing_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processing_state (
    id integer DEFAULT 1 NOT NULL,
    is_paused boolean DEFAULT false,
    track_chats boolean DEFAULT true,
    track_groups boolean DEFAULT true,
    track_announcements boolean DEFAULT true,
    paused_at timestamp without time zone,
    resumed_at timestamp without time zone,
    paused_by character varying(255),
    pause_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT processing_state_id_check CHECK ((id = 1))
);


--
-- Name: TABLE processing_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.processing_state IS 'Stores global processing state (pause/resume) - singleton table';


--
-- Name: COLUMN processing_state.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.processing_state.id IS 'Always 1 - ensures only one row exists';


--
-- Name: COLUMN processing_state.is_paused; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.processing_state.is_paused IS 'Whether message processing is paused';


--
-- Name: COLUMN processing_state.track_chats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.processing_state.track_chats IS 'Whether individual 1-on-1 chats should be synced';


--
-- Name: COLUMN processing_state.track_groups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.processing_state.track_groups IS 'Whether group chats should be synced';


--
-- Name: COLUMN processing_state.track_announcements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.processing_state.track_announcements IS 'Whether community announcement channels should be synced';


--
-- Name: COLUMN processing_state.paused_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.processing_state.paused_at IS 'When processing was paused';


--
-- Name: COLUMN processing_state.resumed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.processing_state.resumed_at IS 'When processing was resumed';


--
-- Name: wa_auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wa_auth_sessions (
    session_id character varying(128) NOT NULL,
    key_id character varying(128) NOT NULL,
    data text NOT NULL,
    created_at bigint DEFAULT (EXTRACT(epoch FROM now()) * (1000)::numeric)
);


--
-- Name: TABLE wa_auth_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wa_auth_sessions IS 'Stores WhatsApp session credentials (keys, pre-keys)';


--
-- Name: media_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_files ALTER COLUMN id SET DEFAULT nextval('public.media_files_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Data for Name: chat_tracking_state; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_tracking_state (jid, is_excluded, last_processed_message_id, last_processed_timestamp, excluded_at, excluded_by, resume_mode, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chats (jid, name, is_group, is_announcement, unread_count, last_message_text, last_message_timestamp, last_message_from_me, is_archived, is_pinned, pin_order, is_muted, mute_until_timestamp, created_at, updated_at, last_message_at, is_contact, canonical_jid, enable_message_grouping, grouping_config, deep_sync_enabled, vendor_id, vendor_name, vendor_assigned_at, vendor_assigned_by, metadata) FROM stdin;
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contacts (jid, name, push_name, number, is_business, is_my_contact, profile_pic_url, last_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: conversation_sync_state; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversation_sync_state (jid, is_fully_synced, sync_in_progress, last_synced_message_timestamp, total_messages_synced, estimated_total_messages, first_sync_at, last_sync_at, created_at, updated_at, sync_metadata) FROM stdin;
\.


--
-- Data for Name: media_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_files (id, minio_bucket, minio_object_name, minio_url, original_filename, file_size, mime_type, media_type, message_id, jid, uploaded_at, upload_status, deeplens_bucket, deeplens_object_name, deeplens_url, migrated_at, metadata) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, message_id, jid, content, message_type, group_id, media_type, media_url, media_size, media_mime_type, sender, sender_name, "timestamp", created_at, is_from_me, is_forwarded, is_deleted, processing_status, processing_retry_count, processing_last_attempt, processing_completed_at, processing_error, deeplens_processed, deeplens_sent_at, metadata) FROM stdin;
\.


--
-- Data for Name: processing_state; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.processing_state (id, is_paused, track_chats, track_groups, track_announcements, paused_at, resumed_at, paused_by, pause_reason, created_at, updated_at) FROM stdin;
1	f	t	t	t	\N	\N	\N	\N	2026-04-12 16:58:12.659497	2026-04-12 16:58:12.659497
\.


--
-- Data for Name: wa_auth_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wa_auth_sessions (session_id, key_id, data, created_at) FROM stdin;
\.


--
-- Name: media_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.media_files_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: chat_tracking_state chat_tracking_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_tracking_state
    ADD CONSTRAINT chat_tracking_state_pkey PRIMARY KEY (jid);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (jid);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (jid);


--
-- Name: conversation_sync_state conversation_sync_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_sync_state
    ADD CONSTRAINT conversation_sync_state_pkey PRIMARY KEY (jid);


--
-- Name: media_files media_files_minio_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_minio_url_key UNIQUE (minio_url);


--
-- Name: media_files media_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);


--
-- Name: messages messages_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_message_id_key UNIQUE (message_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: processing_state processing_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_state
    ADD CONSTRAINT processing_state_pkey PRIMARY KEY (id);


--
-- Name: wa_auth_sessions wa_auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wa_auth_sessions
    ADD CONSTRAINT wa_auth_sessions_pkey PRIMARY KEY (session_id, key_id);


--
-- Name: idx_chats_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_archived ON public.chats USING btree (is_archived) WHERE (is_archived = false);


--
-- Name: idx_chats_enable_grouping; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_enable_grouping ON public.chats USING btree (enable_message_grouping) WHERE (enable_message_grouping = true);


--
-- Name: idx_chats_is_announcement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_is_announcement ON public.chats USING btree (is_announcement);


--
-- Name: idx_chats_is_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_is_group ON public.chats USING btree (is_group);


--
-- Name: idx_chats_last_message_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_last_message_timestamp ON public.chats USING btree (last_message_timestamp DESC NULLS LAST);


--
-- Name: idx_chats_name_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_name_search ON public.chats USING gin (to_tsvector('english'::regconfig, (name)::text));


--
-- Name: idx_chats_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_pinned ON public.chats USING btree (is_pinned, pin_order DESC) WHERE (is_pinned = true);


--
-- Name: idx_chats_unread_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_unread_count ON public.chats USING btree (unread_count) WHERE (unread_count > 0);


--
-- Name: idx_chats_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_vendor_id ON public.chats USING btree (vendor_id) WHERE (vendor_id IS NOT NULL);


--
-- Name: idx_contacts_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_name ON public.contacts USING btree (name);


--
-- Name: idx_contacts_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_number ON public.contacts USING btree (number);


--
-- Name: idx_conv_sync_fully_synced; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_sync_fully_synced ON public.conversation_sync_state USING btree (is_fully_synced);


--
-- Name: idx_conv_sync_in_progress; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_sync_in_progress ON public.conversation_sync_state USING btree (sync_in_progress);


--
-- Name: idx_conv_sync_last_synced; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_sync_last_synced ON public.conversation_sync_state USING btree (last_sync_at DESC);


--
-- Name: idx_media_jid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_jid ON public.media_files USING btree (jid);


--
-- Name: idx_media_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_message_id ON public.media_files USING btree (message_id);


--
-- Name: idx_media_migrated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_migrated ON public.media_files USING btree (migrated_at) WHERE (migrated_at IS NOT NULL);


--
-- Name: idx_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_type ON public.media_files USING btree (media_type);


--
-- Name: idx_media_uploaded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_uploaded_at ON public.media_files USING btree (uploaded_at DESC);


--
-- Name: idx_messages_content_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_content_search ON public.messages USING gin (to_tsvector('english'::regconfig, content)) WHERE (content IS NOT NULL);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_deeplens_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_deeplens_query ON public.messages USING btree (media_type, deeplens_processed, "timestamp") WHERE ((media_type)::text = ANY ((ARRAY['image'::character varying, 'sticker'::character varying])::text[]));


--
-- Name: idx_messages_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_group_id ON public.messages USING btree (group_id);


--
-- Name: idx_messages_grouping_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_grouping_query ON public.messages USING btree (jid, "timestamp") WHERE (group_id IS NULL);


--
-- Name: idx_messages_jid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_jid ON public.messages USING btree (jid);


--
-- Name: idx_messages_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_media_type ON public.messages USING btree (media_type) WHERE (media_type IS NOT NULL);


--
-- Name: idx_messages_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_message_id ON public.messages USING btree (message_id);


--
-- Name: idx_messages_processing_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_processing_retry ON public.messages USING btree (processing_retry_count, processing_last_attempt) WHERE ((processing_status)::text = 'failed'::text);


--
-- Name: idx_messages_processing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_processing_status ON public.messages USING btree (processing_status, "timestamp") WHERE ((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'ready'::character varying, 'queued'::character varying])::text[]));


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender);


--
-- Name: idx_messages_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_timestamp ON public.messages USING btree ("timestamp" DESC);


--
-- Name: idx_tracking_state_excluded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_state_excluded_at ON public.chat_tracking_state USING btree (excluded_at);


--
-- Name: idx_tracking_state_is_excluded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_state_is_excluded ON public.chat_tracking_state USING btree (is_excluded);


--
-- Name: chats trigger_update_last_message_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_last_message_at BEFORE INSERT OR UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.update_last_message_at();


--
-- Name: conversation_sync_state conversation_sync_state_jid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_sync_state
    ADD CONSTRAINT conversation_sync_state_jid_fkey FOREIGN KEY (jid) REFERENCES public.chats(jid) ON DELETE CASCADE;


--
-- Name: media_files fk_media_chat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT fk_media_chat FOREIGN KEY (jid) REFERENCES public.chats(jid) ON DELETE CASCADE;


--
-- Name: media_files fk_media_message; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT fk_media_message FOREIGN KEY (message_id) REFERENCES public.messages(message_id) ON DELETE SET NULL;


--
-- Name: messages fk_messages_chat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk_messages_chat FOREIGN KEY (jid) REFERENCES public.chats(jid) ON DELETE CASCADE;


--
-- Name: chat_tracking_state fk_tracking_state_chat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_tracking_state
    ADD CONSTRAINT fk_tracking_state_chat FOREIGN KEY (jid) REFERENCES public.chats(jid) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict qx0Gj3geFPpN4CxybSCtHK3eSWVARWUL6LQ4PNncbQ8G5xMLRO5DkkHp3bZJy3B

