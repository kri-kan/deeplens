-- Migration: WhatsApp Group → DeepLens Product Pipeline schema
-- Run this against the deeplens_platform database

-- 1. Alter wa.chats table to add auto_process_products flag
ALTER TABLE wa.chats 
    ADD COLUMN IF NOT EXISTS auto_process_products BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create wa.message_groups table
CREATE TABLE IF NOT EXISTS wa.message_groups (
    group_id              VARCHAR(255) PRIMARY KEY,
    jid                   VARCHAR(255) NOT NULL,
    status                VARCHAR(20)  NOT NULL DEFAULT 'staging',
                          -- staging | product_create_sent | product_created | ignored | error
    process_as_product    BOOLEAN      NOT NULL DEFAULT FALSE,  -- per-group flag
    description           TEXT,           -- aggregated text from text messages in group
    media_count           INT          NOT NULL DEFAULT 0,
    text_count            INT          NOT NULL DEFAULT 0,
    deeplens_product_id   UUID,           -- written back after product creation
    deeplens_listing_id   UUID,
    category              VARCHAR(100),   -- set by LLM
    sub_category          VARCHAR(100),
    detected_price        NUMERIC(12,2),  -- extracted by LLM
    detected_shipping     VARCHAR(50),    -- 'free' | 'extra' | null
    last_message_at       TIMESTAMPTZ NOT NULL,
    product_created_at    TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_detail          TEXT,            -- last error message if status='error'
    CONSTRAINT fk_message_groups_jid FOREIGN KEY (jid) REFERENCES wa.chats(jid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mg_jid_status ON wa.message_groups(jid, status);
CREATE INDEX IF NOT EXISTS idx_mg_last_message_at ON wa.message_groups(last_message_at)
    WHERE status = 'staging' AND process_as_product = TRUE;

-- 3. Create wa.group_audit_log table
CREATE TABLE IF NOT EXISTS wa.group_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    group_id    VARCHAR(255) NOT NULL,
    event       VARCHAR(60)  NOT NULL,
    -- group_staged | product_create_sent | product_created | media_added |
    -- category_set | split | merged | message_reassigned | ignored |
    -- process_flag_enabled | vendor_assigned | error | reprocess_triggered
    actor       VARCHAR(100),            -- 'system' | 'operator:<userId>'
    old_value   JSONB,
    new_value   JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gal_group_id ON wa.group_audit_log(group_id);
CREATE INDEX IF NOT EXISTS idx_gal_occurred ON wa.group_audit_log(occurred_at DESC);

-- 4. Create product_merge_candidates table in public schema
CREATE TABLE IF NOT EXISTS public.product_merge_candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_a_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_b_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    similarity_score FLOAT NOT NULL,           -- 0.0–1.0 (vector distance)
    status          VARCHAR(20) DEFAULT 'pending', -- pending | merged | dismissed
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    resolved_by     VARCHAR(100)                -- 'operator:<userId>'
);

CREATE INDEX IF NOT EXISTS idx_pmc_status ON public.product_merge_candidates(status) WHERE status = 'pending';
