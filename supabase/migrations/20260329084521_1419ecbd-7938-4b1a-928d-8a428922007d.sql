
-- =============================================
-- 1. ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.user_type AS ENUM ('parent', 'teacher');
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'teacher');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'family', 'school');
CREATE TYPE public.exercise_status AS ENUM ('completed', 'available', 'locked');
CREATE TYPE public.subject_type AS ENUM ('math', 'reading', 'writing');

-- =============================================
-- 2. USER ROLES (security-definer pattern)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- 3. PROFILES
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  user_type user_type NOT NULL DEFAULT 'parent',
  locale TEXT NOT NULL DEFAULT 'nl',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  -- Default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 4. ORGANIZATIONS (Schools)
-- =============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role org_role NOT NULL DEFAULT 'teacher',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their org"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view own org memberships"
  ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- 5. SUBSCRIPTIONS
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'trialing',
  max_children INT NOT NULL DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sub_owner CHECK (
    (user_id IS NOT NULL AND organization_id IS NULL) OR
    (user_id IS NULL AND organization_id IS NOT NULL)
  )
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- 6. CHILDREN
-- =============================================
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT,
  grade INT NOT NULL DEFAULT 1,
  avatar_id TEXT,
  avatar_url TEXT,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own children"
  ON public.children FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert own children"
  ON public.children FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update own children"
  ON public.children FOR UPDATE TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Org members can view org children"
  ON public.children FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = children.organization_id AND user_id = auth.uid()
    )
  );

-- =============================================
-- 7. EXERCISES (curriculum content)
-- =============================================
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject subject_type NOT NULL,
  grade INT NOT NULL DEFAULT 1,
  stage TEXT NOT NULL DEFAULT 'stage-1',
  display_order INT NOT NULL DEFAULT 0,
  xp_reward INT NOT NULL DEFAULT 20,
  route TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exercises are readable by all authenticated"
  ON public.exercises FOR SELECT TO authenticated
  USING (true);

-- =============================================
-- 8. EXERCISE ATTEMPTS (detailed tracking)
-- =============================================
CREATE TABLE public.exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view child attempts"
  ON public.exercise_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert child attempts"
  ON public.exercise_attempts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid()
    )
  );

-- =============================================
-- 9. CHILD PROGRESS (summary per subject)
-- =============================================
CREATE TABLE public.child_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  subject subject_type NOT NULL,
  exercises_completed INT NOT NULL DEFAULT 0,
  total_xp INT NOT NULL DEFAULT 0,
  average_score NUMERIC(5,2) DEFAULT 0,
  total_time_seconds INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, subject)
);
ALTER TABLE public.child_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view child progress"
  ON public.child_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid()
    )
  );

-- =============================================
-- 10. BADGES
-- =============================================
CREATE TABLE public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  requirement TEXT,
  icon TEXT NOT NULL,
  gradient_from TEXT,
  gradient_to TEXT,
  max_progress INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are readable by all authenticated"
  ON public.badges FOR SELECT TO authenticated
  USING (true);

CREATE TABLE public.child_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  UNIQUE (child_id, badge_id)
);
ALTER TABLE public.child_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view child badges"
  ON public.child_badges FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can upsert child badges"
  ON public.child_badges FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update child badges"
  ON public.child_badges FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid()
    )
  );
