-- =============================================================================
-- Migration: 20261102_survey_framework_core.sql
-- Description: Dynamic Versioned Surveys, Reusable Question Bank, Hidden Fields & Wallet Ledger
-- Author: Naga (Data Specialist) & Krishna (Squad Lead)
-- Database: deeplens_store
-- =============================================================================

BEGIN;

-- 1. Root Survey Entity
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,            -- e.g. 'taste-discovery'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'taste_profile', -- 'taste_profile', 'order_feedback', 'product_feedback'
    audience_type VARCHAR(20) DEFAULT 'guest',    -- 'guest' | 'registered'
    default_language VARCHAR(10) DEFAULT 'en',    -- 'en', 'te', 'hi', 'ta', 'ml', 'kn'
    draft_schema_json JSONB,                      -- Working unversioned draft
    has_uncommitted_draft BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Published Survey Versions (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS survey_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    version_number INT NOT NULL,                  -- 1, 2, 3...
    version_comment TEXT NOT NULL,                -- e.g. 'Initial launch with 6-language switcher'
    theme_id VARCHAR(50) DEFAULT 'ivory-editorial',
    cover_page_json JSONB,                        -- Briefing title, kicker, stats, privacy text
    hidden_fields_config JSONB,                   -- Configured URL query prefill mappings
    points_per_question INT DEFAULT 175,          -- Mudras coin reward for each answered question
    total_mudras_target INT DEFAULT 700,          -- Milestone goal
    is_archived BOOLEAN DEFAULT FALSE,
    published_by VARCHAR(100) DEFAULT 'system_admin',
    published_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_survey_version UNIQUE (survey_id, version_number)
);

-- 3. Reusable & Versioned Question Repository (Atomic Question + Options Unit)
CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique ID for this specific question revision
    question_key VARCHAR(100) NOT NULL,            -- Stable handle across revisions, e.g. 'q_weave_preference'
    revision_number INT NOT NULL DEFAULT 1,        -- 1, 2, 3...
    question_type VARCHAR(50) NOT NULL,            -- 'single_select', 'multi_select', 'likert', 'text_input'
    aspect_ratio VARCHAR(20) DEFAULT '1:1',        -- '1:1', '3:4', '4:3', '9:16'
    media_format VARCHAR(20) DEFAULT 'icon',       -- 'icon', 'image', 'none'
    points INT DEFAULT 175,                        -- Weight for this question
    
    -- Multilingual Question Statements (Title, Kicker, Subtitle)
    statements_json JSONB NOT NULL,
    
    -- Options with Localized Statements & Answer-Based Branching Targets
    options_json JSONB NOT NULL,
    
    -- Validation rules (regex, min/max length, required)
    validation_rules_json JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_question_revision UNIQUE (question_key, revision_number)
);

-- 4. Junction Table: Sequence & Branching Rules per Survey Version
CREATE TABLE IF NOT EXISTS survey_version_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_version_id UUID NOT NULL REFERENCES survey_versions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES survey_questions(id),
    sequence_order INT NOT NULL,                   -- 1, 2, 3, 4 (Default linear flow)
    
    -- Branching Configuration
    default_next_question_key VARCHAR(100),        -- Fallback if no option-specific branch matches
    is_terminal_question BOOLEAN DEFAULT FALSE,    -- e.g. Contact or VIP Minting finishes the survey
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_version_question_order UNIQUE (survey_version_id, sequence_order)
);

-- 5. Generic Survey Responses Table
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id),
    version_number INT NOT NULL,                  -- Stamped with exact version answered
    user_id VARCHAR(100),                         -- Registered Customer ID (e.g. 'usr_wa_9876543210')
    virtual_user_id VARCHAR(150) NOT NULL,        -- Device Fingerprint (e.g. 'dev_fp_4a8b1c_...')
    device_id VARCHAR(150) NOT NULL,              -- Persistent Client Device ID
    phone VARCHAR(20),                            -- WhatsApp phone if provided
    language VARCHAR(10) DEFAULT 'en',            -- 'te', 'hi', 'en', 'ta', 'ml', 'kn'
    questions_answered_count INT NOT NULL,
    earned_mudras INT NOT NULL,                   -- questions_answered_count * points_per_question
    answers_json JSONB NOT NULL,                  -- Key-value map: { questionKey: selectedOptionOrText }
    hidden_fields_json JSONB,                     -- Context params: { orderId: "...", productId: "..." }
    origin_route VARCHAR(100),                    -- 'order_confirmation', 'pdp', 'cart', 'prelaunch'
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Customer Wallets & Synchronous Transaction Ledger
CREATE TABLE IF NOT EXISTS store_customer_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),                         -- Registered customer ID (nullable for guests)
    virtual_user_id VARCHAR(150) NOT NULL,        -- Device fingerprint (always present)
    balance INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_wallet_virtual_user UNIQUE (virtual_user_id)
);

CREATE TABLE IF NOT EXISTS store_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    virtual_user_id VARCHAR(150) NOT NULL,
    user_id VARCHAR(100),
    amount INT NOT NULL,                          -- e.g. +700
    transaction_type VARCHAR(50) NOT NULL,        -- 'survey_reward', 'order_redemption'
    reference_id UUID,                            -- References survey_responses(id)
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Indexes for Query Performance & Lookups
CREATE INDEX IF NOT EXISTS idx_survey_slug ON surveys(slug);
CREATE INDEX IF NOT EXISTS idx_survey_versions_lookup ON survey_versions(survey_id, version_number, is_archived);
CREATE INDEX IF NOT EXISTS idx_survey_version_questions ON survey_version_questions(survey_version_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_survey_questions_key ON survey_questions(question_key);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_ver ON survey_responses(survey_id, version_number);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_virtual ON survey_responses(virtual_user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted ON survey_responses(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON store_customer_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_virtual ON store_wallet_transactions(virtual_user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON store_wallet_transactions(user_id);

-- 8. Seed Initial Vayyari VIP Taste Discovery Survey
INSERT INTO surveys (id, slug, title, description, category, audience_type, default_language, has_uncommitted_draft)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'taste-discovery',
    'Vayyari VIP Taste Discovery',
    'Curated saree & silk taste intake with +700 Mudras rewards and Gold VIP Pass minting',
    'taste_profile',
    'guest',
    'en',
    FALSE
) ON CONFLICT (slug) DO NOTHING;

-- Seed Survey Version 1
INSERT INTO survey_versions (
    id, survey_id, version_number, version_comment, theme_id,
    cover_page_json, hidden_fields_config, points_per_question, total_mudras_target, published_at
) VALUES (
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    1,
    'Initial launch with 6 Indian languages, 47-icon catalog, and +175 Mudras per step',
    'ivory-editorial',
    '{
        "kicker": "CURATED TASTE DISCOVERY",
        "title": "Elevate Your Signature Silk Wardrobe",
        "description": "Tell us the weaves and heritage craftsmanship you adore. We’ll tailor your personal festive edits and private vault perks.",
        "estimatedDuration": "~90 Secs",
        "privacyText": "100% Private. No spam ever.",
        "startCtaLabel": "Start Discovery",
        "rewardMudras": 700,
        "totalSteps": 4
    }'::jsonb,
    '[
        {"key": "campaignUtm", "urlParam": "utm_campaign", "defaultValue": "organic"},
        {"key": "referralVipCode", "urlParam": "ref", "defaultValue": null}
    ]'::jsonb,
    175,
    700,
    NOW()
) ON CONFLICT (survey_id, version_number) DO NOTHING;

COMMIT;
