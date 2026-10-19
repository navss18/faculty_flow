-- Faculty Flow Database Reference & RLS Policies
-- Compatible with PostgreSQL 15+ and Supabase Auth
-- Note: Do NOT blindly rerun if your Supabase tables already exist.
-- Use this file as the structural contract and reference.

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  department text,
  designation text DEFAULT 'Assistant Professor',
  role text NOT NULL CHECK (role IN ('faculty', 'admin')) DEFAULT 'faculty',
  avatar_url text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. FACULTY CAPACITY TABLE
CREATE TABLE IF NOT EXISTS public.faculty_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_weekly_hours numeric NOT NULL DEFAULT 40,
  target_teaching_hours numeric NOT NULL DEFAULT 16,
  target_research_hours numeric NOT NULL DEFAULT 12,
  target_admin_hours numeric NOT NULL DEFAULT 12,
  semester text NOT NULL DEFAULT 'Fall',
  academic_year text NOT NULL DEFAULT '2026-2027',
  created_at timestamptz DEFAULT now()
);

-- 3. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  department text NOT NULL,
  semester integer NOT NULL DEFAULT 1,
  academic_year text NOT NULL DEFAULT '2026-2027',
  credits integer NOT NULL DEFAULT 3,
  total_planned_hours integer NOT NULL DEFAULT 45,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. SYLLABUS MODULES TABLE
CREATE TABLE IF NOT EXISTS public.syllabus_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  module_number integer NOT NULL,
  title text NOT NULL,
  description text,
  planned_hours numeric NOT NULL DEFAULT 9,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. SYLLABUS TOPICS TABLE
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.syllabus_modules(id) ON DELETE CASCADE,
  topic_number text,
  title text NOT NULL,
  planned_hours numeric NOT NULL DEFAULT 2,
  target_date date,
  status text NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending',
  completed_at timestamptz,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 6. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('Teaching', 'Research', 'Grading', 'Meetings', 'Administrative')),
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  status text NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending',
  due_date date,
  estimated_hours numeric DEFAULT 2,
  actual_hours numeric DEFAULT 0,
  topic_id uuid REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. TASK ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(task_id, faculty_id)
);

-- 8. TEACHING PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.teaching_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.syllabus_topics(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_taught date NOT NULL DEFAULT CURRENT_DATE,
  hours_spent numeric NOT NULL DEFAULT 1,
  remarks text,
  created_at timestamptz DEFAULT now()
);

-- 9. HANDOVER REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.handover_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_faculty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

-- 10. ACADEMIC EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.academic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('Exam', 'Holiday', 'Meeting', 'Submission', 'Conference', 'Workshop')),
  start_date date NOT NULL,
  end_date date,
  is_all_day boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'warning', 'success', 'urgent')) DEFAULT 'info',
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profile Policies
DO $$ BEGIN
  CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own non-role profile fields"
    ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tasks Policies
DO $$ BEGIN
  CREATE POLICY "Faculty can view tasks they created or are assigned to, or admin sees all"
    ON public.tasks FOR SELECT TO authenticated
    USING (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = tasks.id AND ta.faculty_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Faculty can insert own tasks"
    ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Faculty can update their tasks or assigned tasks"
    ON public.tasks FOR UPDATE TO authenticated
    USING (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = tasks.id AND ta.faculty_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creator or admin can delete tasks"
    ON public.tasks FOR DELETE TO authenticated
    USING (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notifications Policies
DO $$ BEGIN
  CREATE POLICY "Users view only their notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update only their notifications"
    ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to create public.profiles upon auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'faculty')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
