CREATE TABLE IF NOT EXISTS public.product_publishing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'instagram', 'facebook', 'whatsapp', 'youtube', 'android_share'
    account_id VARCHAR(100),
    account_name VARCHAR(100),
    published_url TEXT,
    external_post_id VARCHAR(255),
    description_used TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'published', -- 'draft', 'scheduled', 'published', 'failed'
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_publishing_events_product_id ON public.product_publishing_events(product_id);
CREATE INDEX IF NOT EXISTS idx_product_publishing_events_platform ON public.product_publishing_events(platform);
