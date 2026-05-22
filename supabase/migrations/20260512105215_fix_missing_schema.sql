-- Add 'other' to subject_type enum (was added directly in Lovable DB, not via migration)
ALTER TYPE public.subject_type ADD VALUE IF NOT EXISTS 'other';

-- Add max_unlocked_stage to children (was added directly in Lovable DB, not via migration)
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS max_unlocked_stage INT NOT NULL DEFAULT 1;
