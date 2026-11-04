-- Migration: 041_add_review_stage_to_wa_message_groups.sql
-- Description: Adds review_stage column to wa.message_groups and index for multi-stage review inbox

ALTER TABLE wa.message_groups ADD COLUMN IF NOT EXISTS review_stage VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_mg_review_stage_status ON wa.message_groups (review_stage, status);
