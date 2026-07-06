-- Add suspend_until column to story_group_eligibility for per-profile suspension
ALTER TABLE public.story_group_eligibility ADD COLUMN suspend_until TIMESTAMPTZ NULL;
