-- Migration: 016_fix_instagram_media_storage_paths.sql
-- Description: Fix Instagram media storage paths, owned account classification, and competitor video download statuses (ADO Bug #261, Task #263)

-- ============================================================================
-- 1. UPDATE COMPETITOR_WATCHLIST FOR VAYYARI_FASHIONS AND OWNED ACCOUNTS
-- ============================================================================

UPDATE public.competitor_watchlist
SET profile_category = 'My Business',
    is_competitor = false
WHERE username IN (
    'vayyari_fashions',
    'everydayvayyari',
    'editionsbyvayyari',
    'vayyari_prive',
    'vayyariplusyou',
    'eclipsevayyari',
    'vayyari_littles'
);

UPDATE public.competitor_watchlist
SET profile_pic_storage_path = 'instagram/45321918688/profile_pic.jpg'
WHERE username = 'vayyari_fashions';

-- ============================================================================
-- 2. FIX PRODUCT/ PATHS IN MEDIA TABLE FOR COMPETITOR_VIDEO & INSTAGRAM_PROFILE
-- ============================================================================

UPDATE public.media
SET storage_path = REPLACE(storage_path, 'product/', 'instagram/')
WHERE storage_path LIKE 'product/%'
  AND id IN (
      SELECT media_id
      FROM public.media_links
      WHERE entity_type IN ('competitor_video', 'instagram_profile')
  );

-- ============================================================================
-- 3. UPDATE COMPETITOR_VIDEOS FOR POSTS THAT HAVE FULL/STORED MEDIA
-- ============================================================================

UPDATE public.competitor_videos cv
SET download_status = 'completed',
    downloaded_at = COALESCE(cv.downloaded_at, NOW())
WHERE cv.storage_path IS NOT NULL
  AND cv.storage_path != '';
