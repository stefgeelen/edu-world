
-- Create rewards table for parent-defined rewards
CREATE TABLE public.rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject public.subject_type NOT NULL,
  required_exercises integer NOT NULL DEFAULT 5,
  current_progress integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Parents can view their own rewards
CREATE POLICY "Parents can view own rewards"
ON public.rewards FOR SELECT
TO authenticated
USING (parent_id = auth.uid());

-- Parents can create rewards for their children
CREATE POLICY "Parents can insert own rewards"
ON public.rewards FOR INSERT
TO authenticated
WITH CHECK (
  parent_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM children WHERE children.id = rewards.child_id AND children.parent_id = auth.uid()
  )
);

-- Parents can update their own rewards
CREATE POLICY "Parents can update own rewards"
ON public.rewards FOR UPDATE
TO authenticated
USING (parent_id = auth.uid());

-- Parents can delete their own rewards
CREATE POLICY "Parents can delete own rewards"
ON public.rewards FOR DELETE
TO authenticated
USING (parent_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_rewards_child_id ON public.rewards(child_id);
CREATE INDEX idx_rewards_parent_id ON public.rewards(parent_id);
