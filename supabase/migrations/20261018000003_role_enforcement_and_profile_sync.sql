-- ====================================================================
-- FACULTY FLOW: ROLE ENFORCEMENT & SECURE PROFILE SYNCHRONIZATION
-- Migration Version: 20261018000003
-- Safe to resume and re-run. Handles partial previous migration attempts.
-- Preserves existing database schema and application data without modification.
-- ====================================================================

-- 1. HELPER FUNCTION: is_admin()
-- Evaluates whether the currently authenticated user has the 'admin' (HOD) role.
-- Defined as SECURITY DEFINER to bypass RLS recursion on public.profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. SECURE SIGNUP TRIGGER: handle_new_user()
-- Matches exact public.profiles columns: id, email, full_name, department, role
-- Strictly enforces role = 'faculty' baseline to prevent self-elevation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    department,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Computer Science & Engineering'),
    'faculty' -- STRICT: Institutional baseline. Never trust client metadata for admin role.
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    department = COALESCE(NULLIF(EXCLUDED.department, ''), public.profiles.department);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. PREVENT ROLE ELEVATION TRIGGER: prevent_self_promotion()
-- Prevents any client from executing `UPDATE profiles SET role = 'admin'`
CREATE OR REPLACE FUNCTION public.prevent_self_promotion()
RETURNS trigger AS $$
BEGIN
  -- If role column is unchanged, permit update
  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  -- Only existing verified Admins can change user roles
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Security Violation: Only verified Departmental Administrators (HOD) can modify user roles.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_self_promotion ON public.profiles;
CREATE TRIGGER tr_prevent_self_promotion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_promotion();

-- 4. PROFILES TABLE RLS POLICIES
-- Actual columns: id, email, full_name, department, role, created_at, updated_at
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by owner or admin" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own non-role profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Faculty can ONLY view their own profile; HOD/Admin can view all for directory
CREATE POLICY "Profiles viewable by owner or admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR public.is_admin()
  );

-- Users can update their own profile (trigger blocks role elevation)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Authenticated users can insert their own profile fallback
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 5. TASKS TABLE RLS POLICIES
-- Actual columns: id, title, description, category, priority, status, due_date, estimated_hours, created_by, created_at, updated_at
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can view tasks they created or are assigned to, or admin sees all" ON public.tasks;
DROP POLICY IF EXISTS "Tasks viewable by creator, assigned faculty, or admin" ON public.tasks;
DROP POLICY IF EXISTS "Faculty can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Faculty can update their tasks or assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by creator, assigned faculty, or admin" ON public.tasks;
DROP POLICY IF EXISTS "Creator or admin can delete tasks" ON public.tasks;

CREATE POLICY "Tasks viewable by creator, assigned faculty, or admin"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = tasks.id AND ta.faculty_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Faculty can insert own tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Tasks updatable by creator, assigned faculty, or admin"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = tasks.id AND ta.faculty_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Creator or admin can delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_admin()
  );

-- 6. TASK ASSIGNMENTS RLS POLICIES
-- Actual columns: task_id, faculty_id, assigned_at (NO assigned_by column)
-- Ownership is securely verified via tasks.created_by
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assignments viewable by assigned faculty, assigner, or admin" ON public.task_assignments;
DROP POLICY IF EXISTS "Assignments viewable by assigned faculty, task creator, or admin" ON public.task_assignments;
DROP POLICY IF EXISTS "Admin or task creator can insert assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Assignments insertable by task creator or admin" ON public.task_assignments;
DROP POLICY IF EXISTS "Assignments deletable by task creator or admin" ON public.task_assignments;

CREATE POLICY "Assignments viewable by assigned faculty, task creator, or admin"
  ON public.task_assignments FOR SELECT TO authenticated
  USING (
    faculty_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Assignments insertable by task creator or admin"
  ON public.task_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid())
  );

CREATE POLICY "Assignments deletable by task creator or admin"
  ON public.task_assignments FOR DELETE TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid())
  );

-- 7. FACULTY CAPACITY RLS POLICIES
-- Actual columns: faculty_id, weekly_hours, updated_at
ALTER TABLE public.faculty_capacity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Capacity viewable by owner or admin" ON public.faculty_capacity;
CREATE POLICY "Capacity viewable by owner or admin"
  ON public.faculty_capacity FOR SELECT TO authenticated
  USING (
    faculty_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Capacity updatable by owner or admin" ON public.faculty_capacity;
CREATE POLICY "Capacity updatable by owner or admin"
  ON public.faculty_capacity FOR UPDATE TO authenticated
  USING (
    faculty_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Capacity insertable by owner or admin" ON public.faculty_capacity;
CREATE POLICY "Capacity insertable by owner or admin"
  ON public.faculty_capacity FOR INSERT TO authenticated
  WITH CHECK (
    faculty_id = auth.uid() OR
    public.is_admin()
  );

-- 8. HANDOVER REQUESTS RLS POLICIES
-- Actual columns: id, task_id, requested_by, requested_to, reason, status, created_at
ALTER TABLE public.handover_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Handovers viewable by involved faculty or admin" ON public.handover_requests;
CREATE POLICY "Handovers viewable by involved faculty or admin"
  ON public.handover_requests FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid() OR
    requested_to = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Faculty can create handover requests" ON public.handover_requests;
CREATE POLICY "Faculty can create handover requests"
  ON public.handover_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

DROP POLICY IF EXISTS "Involved faculty or admin can update handovers" ON public.handover_requests;
CREATE POLICY "Involved faculty or admin can update handovers"
  ON public.handover_requests FOR UPDATE TO authenticated
  USING (
    requested_by = auth.uid() OR
    requested_to = auth.uid() OR
    public.is_admin()
  );

-- 9. NOTIFICATIONS RLS POLICIES
-- Actual columns: id, user_id, title, message, read_at, created_at
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view only their notifications" ON public.notifications;
CREATE POLICY "Users view only their notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update only their notifications" ON public.notifications;
CREATE POLICY "Users update only their notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 10. SUBJECTS, MODULES & TOPICS POLICIES
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subjects are viewable by authenticated users" ON public.subjects;
CREATE POLICY "Subjects are viewable by authenticated users"
  ON public.subjects FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Subjects manageable by creator or admin" ON public.subjects;
CREATE POLICY "Subjects manageable by creator or admin"
  ON public.subjects FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Modules are viewable by authenticated users" ON public.syllabus_modules;
CREATE POLICY "Modules are viewable by authenticated users"
  ON public.syllabus_modules FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Modules manageable by admin or subject creator" ON public.syllabus_modules;
CREATE POLICY "Modules manageable by admin or subject creator"
  ON public.syllabus_modules FOR ALL TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = syllabus_modules.subject_id AND s.created_by = auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = syllabus_modules.subject_id AND s.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Topics are viewable by authenticated users" ON public.syllabus_topics;
CREATE POLICY "Topics are viewable by authenticated users"
  ON public.syllabus_topics FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Topics updatable by authenticated users" ON public.syllabus_topics;
CREATE POLICY "Topics updatable by authenticated users"
  ON public.syllabus_topics FOR UPDATE TO authenticated
  USING (true);
