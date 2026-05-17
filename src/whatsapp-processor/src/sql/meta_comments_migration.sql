-- Migration to add Meta engagement tracking tables
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    platform character varying(20) NOT NULL,
    platform_account_id character varying(255) NOT NULL,
    username character varying(255),
    full_name character varying(255),
    profile_picture_url text,
    first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT instagram_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT instagram_accounts_platform_account_id_key UNIQUE (platform, platform_account_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    video_id uuid NOT NULL,
    account_id uuid NOT NULL,
    platform_comment_id character varying(255) NOT NULL,
    parent_platform_comment_id character varying(255) DEFAULT NULL,
    comment_text text NOT NULL,
    posted_at timestamp with time zone NOT NULL,
    like_count bigint DEFAULT 0,
    is_hidden boolean DEFAULT false,
    raw_metadata jsonb,
    scraped_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT post_comments_pkey PRIMARY KEY (id),
    CONSTRAINT post_comments_platform_comment_id_key UNIQUE (platform_comment_id),
    CONSTRAINT post_comments_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.competitor_videos(id) ON DELETE CASCADE,
    CONSTRAINT post_comments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.instagram_accounts(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_post_comments_video_id ON public.post_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_posted_at ON public.post_comments(posted_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_instagram_accounts_updated_at ON public.instagram_accounts;
CREATE TRIGGER update_instagram_accounts_updated_at
    BEFORE UPDATE ON public.instagram_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
