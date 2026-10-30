-- Migration 038: Instagram Post WhatsApp Sharing Engine
-- Tracks consolidated Instagram posts shared to WhatsApp (Customer Updates vs Reseller Updates)

CREATE TABLE IF NOT EXISTS public.instagram_post_wa_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.competitor_videos(id) ON DELETE CASCADE,
    target VARCHAR(50) NOT NULL, -- 'customer', 'reseller'
    group_name VARCHAR(255) NULL, -- WhatsApp group / broadcast list confirmation
    notes TEXT NULL,
    shared_by VARCHAR(100) NULL,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_insta_wa_shares_post_target UNIQUE (post_id, target)
);

CREATE INDEX IF NOT EXISTS idx_insta_wa_shares_post ON public.instagram_post_wa_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_insta_wa_shares_target ON public.instagram_post_wa_shares(target);
CREATE INDEX IF NOT EXISTS idx_insta_wa_shares_shared_at ON public.instagram_post_wa_shares(shared_at DESC);
