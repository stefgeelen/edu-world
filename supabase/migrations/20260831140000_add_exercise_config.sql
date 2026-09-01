ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS config JSONB;

-- exercises had a SELECT policy for all authenticated users but no admin
-- write policy at all, so the existing is_active toggle in AdminExercises
-- had no RLS backing it. Fix that gap here.
CREATE POLICY "Admins can manage exercises"
ON public.exercises FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
