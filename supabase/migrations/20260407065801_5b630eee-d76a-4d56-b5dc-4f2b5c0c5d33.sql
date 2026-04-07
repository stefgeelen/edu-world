
-- 1. Add pending_promotion to children
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS pending_promotion boolean NOT NULL DEFAULT false;

-- 2. Create trimester_progress table
CREATE TABLE IF NOT EXISTS public.trimester_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  grade_level integer NOT NULL DEFAULT 1,
  trimester_number integer NOT NULL CHECK (trimester_number BETWEEN 1 AND 4),
  xp_earned integer NOT NULL DEFAULT 0,
  xp_threshold integer NOT NULL DEFAULT 100,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, grade_level, trimester_number)
);

-- 3. Enable RLS
ALTER TABLE public.trimester_progress ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for trimester_progress
CREATE POLICY "Parents can view own children trimester progress"
  ON public.trimester_progress FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = trimester_progress.child_id
      AND children.parent_id = auth.uid()
  ));

CREATE POLICY "Admins can view all trimester progress"
  ON public.trimester_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_child_progress_child_subject ON public.child_progress(child_id, subject);
CREATE INDEX IF NOT EXISTS idx_trimester_progress_child_grade ON public.trimester_progress(child_id, grade_level);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_child ON public.exercise_attempts(child_id);

-- 6. Create the complete_exercise function
CREATE OR REPLACE FUNCTION public.complete_exercise(
  p_child_id uuid,
  p_exercise_id uuid,
  p_score integer,
  p_max_score integer,
  p_stars integer,
  p_time_spent integer,
  p_answers jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exercise exercises%ROWTYPE;
  v_child children%ROWTYPE;
  v_trimester_number integer;
  v_all_completed boolean;
  v_attempt_id uuid;
BEGIN
  -- Get exercise info
  SELECT * INTO v_exercise FROM exercises WHERE id = p_exercise_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;

  -- Get child info
  SELECT * INTO v_child FROM children WHERE id = p_child_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child not found';
  END IF;

  -- 1. Insert exercise attempt
  INSERT INTO exercise_attempts (child_id, exercise_id, score, max_score, stars, time_spent_seconds, answers)
  VALUES (p_child_id, p_exercise_id, p_score, p_max_score, p_stars, p_time_spent, p_answers)
  RETURNING id INTO v_attempt_id;

  -- 2. Upsert child_progress per subject
  INSERT INTO child_progress (child_id, subject, total_xp, exercises_completed, average_score, total_time_seconds)
  VALUES (
    p_child_id,
    v_exercise.subject,
    v_exercise.xp_reward,
    1,
    p_score::numeric / NULLIF(p_max_score, 0),
    p_time_spent
  )
  ON CONFLICT (child_id, subject)
  DO UPDATE SET
    total_xp = child_progress.total_xp + v_exercise.xp_reward,
    exercises_completed = child_progress.exercises_completed + 1,
    average_score = (
      (child_progress.average_score * child_progress.exercises_completed + p_score::numeric / NULLIF(p_max_score, 0))
      / (child_progress.exercises_completed + 1)
    ),
    total_time_seconds = child_progress.total_time_seconds + p_time_spent,
    updated_at = now();

  -- 3. Update child total XP
  UPDATE children
  SET xp = xp + v_exercise.xp_reward,
      updated_at = now()
  WHERE id = p_child_id;

  -- 4. Determine current trimester (based on stage: stage-1 -> trimester 1, etc.)
  v_trimester_number := COALESCE(
    NULLIF(regexp_replace(v_exercise.stage, '[^0-9]', '', 'g'), '')::integer,
    1
  );
  IF v_trimester_number < 1 OR v_trimester_number > 4 THEN
    v_trimester_number := 1;
  END IF;

  -- 5. Upsert trimester_progress
  INSERT INTO trimester_progress (child_id, grade_level, trimester_number, xp_earned)
  VALUES (p_child_id, v_child.grade, v_trimester_number, v_exercise.xp_reward)
  ON CONFLICT (child_id, grade_level, trimester_number)
  DO UPDATE SET
    xp_earned = trimester_progress.xp_earned + v_exercise.xp_reward,
    is_completed = CASE
      WHEN (trimester_progress.xp_earned + v_exercise.xp_reward) >= trimester_progress.xp_threshold
      THEN true
      ELSE trimester_progress.is_completed
    END,
    completed_at = CASE
      WHEN (trimester_progress.xp_earned + v_exercise.xp_reward) >= trimester_progress.xp_threshold
        AND NOT trimester_progress.is_completed
      THEN now()
      ELSE trimester_progress.completed_at
    END,
    updated_at = now();

  -- 6. Check if all 4 trimesters are completed for this grade
  SELECT NOT EXISTS (
    SELECT 1
    FROM generate_series(1, 4) AS t(n)
    WHERE NOT EXISTS (
      SELECT 1 FROM trimester_progress tp
      WHERE tp.child_id = p_child_id
        AND tp.grade_level = v_child.grade
        AND tp.trimester_number = t.n
        AND tp.is_completed = true
    )
  ) INTO v_all_completed;

  IF v_all_completed THEN
    UPDATE children SET pending_promotion = true, updated_at = now()
    WHERE id = p_child_id;
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'xp_earned', v_exercise.xp_reward,
    'all_trimesters_completed', v_all_completed
  );
END;
$$;

-- 7. Add unique constraint on child_progress if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'child_progress_child_subject_unique'
  ) THEN
    ALTER TABLE public.child_progress ADD CONSTRAINT child_progress_child_subject_unique UNIQUE (child_id, subject);
  END IF;
END $$;
