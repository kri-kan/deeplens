-- Migration 019: Post Planner & Multi-Channel Instagram Growth Engine
-- Extends competitor_watchlist with channel classification (Focus vs Dump)
-- Creates post_planner_assignments to track multi-channel status lifecycle

-- 1. Extend competitor_watchlist with channel governance
ALTER TABLE public.competitor_watchlist 
ADD COLUMN IF NOT EXISTS channel_type VARCHAR(50) DEFAULT 'focus', -- 'focus', 'dump', 'graduating'
ADD COLUMN IF NOT EXISTS category_focus TEXT[] DEFAULT '{}',       -- e.g. ARRAY['Sarees', 'Handlooms']
ADD COLUMN IF NOT EXISTS target_demography TEXT NULL,
ADD COLUMN IF NOT EXISTS cadence_config JSONB DEFAULT '{"postsPerDay": 2, "preferredHours": [11, 18], "autoPilot": false}'::jsonb;

-- 2. Create post_planner_assignments table
CREATE TABLE IF NOT EXISTS public.post_planner_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    watchlist_id UUID NOT NULL REFERENCES public.competitor_watchlist(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL DEFAULT 'focus',
    status VARCHAR(50) NOT NULL DEFAULT 'assigned', -- 'assigned', 'scheduled', 'shared', 'excluded'
    planning_status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'complete'
    scheduled_at TIMESTAMPTZ NULL,
    published_at TIMESTAMPTZ NULL,
    published_url TEXT NULL,
    external_post_id VARCHAR(255) NULL,
    caption_used TEXT NULL,
    selected_media_urls TEXT[] DEFAULT '{}',
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_planner_product_channel UNIQUE (product_id, watchlist_id)
);

CREATE INDEX IF NOT EXISTS idx_ppa_product ON public.post_planner_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_ppa_watchlist ON public.post_planner_assignments(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_ppa_status ON public.post_planner_assignments(status);
CREATE INDEX IF NOT EXISTS idx_ppa_scheduled ON public.post_planner_assignments(scheduled_at) WHERE status = 'scheduled';
