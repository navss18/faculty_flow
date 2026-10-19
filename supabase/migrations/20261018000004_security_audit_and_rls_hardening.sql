-- ====================================================================
-- FACULTY FLOW: COMPREHENSIVE SECURITY AUDIT & RLS HARDENING MIGRATION
-- Migration Version: 20261018000004 (Corrected Second Security Review)
-- Target Database: PostgreSQL 15+ / Supabase Auth
--
-- Security Guarantees & Audit Corrections:
-- 1. Automated dynamic purge of ALL legacy policies across 11 tables to
--    eliminate PostgreSQL permissive OR policy pollution without guessing names.
-- 2. Fixed search_path (public, pg_temp) and strict EXECUTE grants on all
--    SECURITY DEFINER functions to prevent search-path injection.
-- 3. Strict prevention of privilege escalation (role = 'admin') across
--    signup metadata, direct profile inserts, and profile updates.
-- 4. Protection of task ownership (created_by) and assignment data.
--    Caller must be creator, assignee, or admin. Assignees may ONLY
--    update 'status'; ownership and task attributes are locked.
-- 5. Full handover lifecycle validation: blocks self-approval, blocks reopening
--    resolved requests, blocks altering requester/recipient/task/timestamps,
--    and restricts reason modifications strictly to requester while pending.
-- 6. Removal of arbitrary assignment-based topic updates. In the active schema,
--    tasks/task_assignments have no foreign key relationship to syllabus_topics.
--    Therefore, topic updates are strictly restricted to verified course owners
--    (subject creators) and HOD/admins.
-- 7. Exact alignment with active database schema:
--    - task_assignments (task_id, faculty_id, assigned_at) [no assigned_by, no id]
--    - handover_requests (requested_by, requested_to) [no requester_id, no target_faculty_id]
--    - notifications (read_at) [no is_read]
--    - subjects (subject_code) [no code]
--    - profiles (no designation column)
-- 8. 100% idempotent, rerunnable, and safe after partial failure.
-- ====================================================================

-- --------------------------------------------------------------------
-- STEP 1: DYNAMIC PURGE OF ALL EXISTING POLICIES ON THE 11 TABLES
-- Safely queries pg_policies to drop every existing policy regardless of name.
-- Eliminates permissive OR pollution from previous migrations/dashboards.
-- --------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'tasks',
        'task_assignments',
        'faculty_capacity',
        'handover_requests',
        'notifications',
        'subjects',
        'syllabus_modules',
        'syllabus_topics',
        'academic_events',
        'teaching_progress'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- STEP 2: SECURITY DEFINER HELPER FUNCTION
-- --------------------------------------------------------------------

-- is_admin(): Evaluates if current session user has verified admin role.
-- Defined with SECURITY DEFINER and fixed search_path to prevent recursion and injection.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- --------------------------------------------------------------------
-- STEP 3: PROFILE INTEGRITY & ROLE ENFORCEMENT TRIGGERS
-- --------------------------------------------------------------------

-- handle_new_user(): Executes after auth.users insertion.
-- Reliably creates public.profiles row matching exact schema:
-- id, email, full_name, department, role.
-- Strictly assigns 'faculty' role regardless of raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    'faculty' -- HARDCODED BASELINE: Clients can NEVER grant themselves admin role on signup.
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    department = COALESCE(NULLIF(EXCLUDED.department, ''), public.profiles.department);
    -- Note: role is intentionally excluded from DO UPDATE to prevent elevation on duplicate signups
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- enforce_profile_role(): Guards public.profiles against client self-promotion on INSERT and UPDATE.
CREATE OR REPLACE FUNCTION public.enforce_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. On INSERT: Disallow non-admins from inserting any profile with role <> 'faculty'
  IF TG_OP = 'INSERT' THEN
    IF NEW.role <> 'faculty' AND NOT public.is_admin() THEN
      NEW.role := 'faculty';
    END IF;
    -- Non-admins cannot insert a profile for any user ID other than their own auth.uid()
    IF auth.uid() IS NOT NULL AND NEW.id <> auth.uid() AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Violation: Cannot insert profile for another user identity.';
    END IF;
    RETURN NEW;
  END IF;

  -- 2. On UPDATE: Block role escalation unless caller is verified admin
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Violation: Only verified Departmental Administrators (HOD) can modify user roles.';
    END IF;
    -- Prevent changing primary key ID
    IF OLD.id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'Security Violation: Profile identity (id) cannot be modified.';
    END IF;
    -- Non-admins can only update their own profile
    IF auth.uid() IS NOT NULL AND OLD.id <> auth.uid() AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Violation: Cannot modify another user''s profile.';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_profile_role() TO authenticated, service_role;

DROP TRIGGER IF EXISTS tr_enforce_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS tr_prevent_self_promotion ON public.profiles;
CREATE TRIGGER tr_enforce_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role();

-- --------------------------------------------------------------------
-- STEP 4: TASK MUTATION GUARD TRIGGER
-- --------------------------------------------------------------------

-- validate_task_mutation(): Enforces caller authorization and field protection:
-- - Caller must be task creator, assigned faculty, or admin.
-- - Task ownership (created_by) and task ID cannot be altered.
-- - Assignees may only update task 'status'; structural fields are locked.
-- - Status values must be valid enum members.
CREATE OR REPLACE FUNCTION public.validate_task_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_is_admin boolean;
  caller_is_creator boolean;
  caller_is_assignee boolean;
BEGIN
  caller_is_admin := public.is_admin();
  caller_is_creator := (auth.uid() = OLD.created_by);

  SELECT EXISTS (
    SELECT 1 FROM public.task_assignments
    WHERE task_id = OLD.id AND faculty_id = auth.uid()
  ) INTO caller_is_assignee;

  -- 1. Caller Authorization Check:
  IF NOT caller_is_admin AND NOT caller_is_creator AND NOT caller_is_assignee THEN
    RAISE EXCEPTION 'Permission Denied: You are not authorized to update this task.';
  END IF;

  -- 2. Task ownership and identifier protection:
  IF OLD.created_by IS DISTINCT FROM NEW.created_by AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: Task ownership (created_by) cannot be transferred.';
  END IF;

  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Security Violation: Task identifier (id) cannot be modified.';
  END IF;

  -- 3. Assignee Field Restriction:
  -- If updater is solely an assignee (not creator, not admin), only 'status' can change.
  IF NOT caller_is_admin AND NOT caller_is_creator AND caller_is_assignee THEN
    IF (OLD.title IS DISTINCT FROM NEW.title) OR
       (OLD.description IS DISTINCT FROM NEW.description) OR
       (OLD.category IS DISTINCT FROM NEW.category) OR
       (OLD.priority IS DISTINCT FROM NEW.priority) OR
       (OLD.due_date IS DISTINCT FROM NEW.due_date) OR
       (OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours) THEN
      RAISE EXCEPTION 'Permission Denied: Assigned faculty may only update the task status.';
    END IF;
  END IF;

  -- 4. Status enum validation:
  IF NEW.status NOT IN ('Pending', 'In Progress', 'Completed') THEN
    RAISE EXCEPTION 'Invalid status value. Must be Pending, In Progress, or Completed.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_task_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_task_mutation() TO authenticated, service_role;

DROP TRIGGER IF EXISTS tr_validate_task_mutation ON public.tasks;
CREATE TRIGGER tr_validate_task_mutation
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_task_mutation();

-- --------------------------------------------------------------------
-- STEP 5: HANDOVER MUTATION GUARD TRIGGER
-- --------------------------------------------------------------------

-- validate_handover_mutation(): Enforces handover workflow rules:
-- - Immutable requested_by, requested_to, task_id, created_at, and id.
-- - No self-delegation (requested_by <> requested_to).
-- - No requester self-approval (requester cannot approve own request).
-- - Only target faculty (requested_to) or admin can approve.
-- - Reopening resolved requests is strictly blocked.
-- - Status flipping between resolved states is blocked.
-- - Only recipient, requester, or admin can reject.
-- - Only requester can modify reason, and only while pending.
CREATE OR REPLACE FUNCTION public.validate_handover_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  caller_is_admin := public.is_admin();

  -- 1. Primary key, timestamp, and linkage immutability:
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Security Violation: Handover request id cannot be modified.';
  END IF;

  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Security Violation: Handover created_at timestamp cannot be modified.';
  END IF;

  IF OLD.requested_by IS DISTINCT FROM NEW.requested_by THEN
    RAISE EXCEPTION 'Security Violation: Handover requester cannot be altered.';
  END IF;

  IF OLD.requested_to IS DISTINCT FROM NEW.requested_to AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: Handover recipient cannot be altered.';
  END IF;

  IF OLD.task_id IS DISTINCT FROM NEW.task_id AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: Handover task cannot be altered.';
  END IF;

  -- 2. Prevent self-delegation:
  IF NEW.requested_by = NEW.requested_to THEN
    RAISE EXCEPTION 'Security Violation: Requester and recipient cannot be the same user.';
  END IF;

  -- 3. State transition validation:
  -- Prevent reopening resolved requests:
  IF OLD.status IN ('approved', 'rejected') AND NEW.status = 'pending' AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: A resolved handover request cannot be reopened.';
  END IF;

  -- Prevent flipping between resolved states:
  IF OLD.status IN ('approved', 'rejected') AND NEW.status <> OLD.status AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: A resolved handover request cannot be transitioned to a different status.';
  END IF;

  -- Status transition to 'approved':
  -- ONLY the recipient (requested_to) or an admin can approve.
  -- Requester self-approval is strictly blocked.
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    IF auth.uid() = OLD.requested_by AND NOT caller_is_admin THEN
      RAISE EXCEPTION 'Security Violation: Requester cannot approve their own handover request.';
    END IF;
    IF auth.uid() <> OLD.requested_to AND NOT caller_is_admin THEN
      RAISE EXCEPTION 'Permission Denied: Only the assigned coverage faculty or an HOD can approve this handover.';
    END IF;
  END IF;

  -- Status transition to 'rejected':
  -- Permitted only for: recipient (declining), requester (cancelling), or admin
  IF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
    IF auth.uid() <> OLD.requested_to AND auth.uid() <> OLD.requested_by AND NOT caller_is_admin THEN
      RAISE EXCEPTION 'Permission Denied: You are not authorized to reject or cancel this handover request.';
    END IF;
  END IF;

  -- 4. Reason field modification:
  -- Only the requester may modify the reason, and ONLY while the request is pending
  IF OLD.reason IS DISTINCT FROM NEW.reason THEN
    IF (auth.uid() <> OLD.requested_by AND NOT caller_is_admin) OR OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Permission Denied: Only the requester can modify the handover reason, and only while pending.';
    END IF;
  END IF;

  -- 5. Valid status values:
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status value. Must be pending, approved, or rejected.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_handover_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_handover_mutation() TO authenticated, service_role;

DROP TRIGGER IF EXISTS tr_validate_handover_mutation ON public.handover_requests;
CREATE TRIGGER tr_validate_handover_mutation
  BEFORE UPDATE ON public.handover_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_handover_mutation();

-- --------------------------------------------------------------------
-- STEP 6: SYLLABUS TOPIC MUTATION GUARD TRIGGER
-- --------------------------------------------------------------------

-- validate_topic_mutation(): Enforces topic update authorization:
-- - Immutable id and module_id.
-- - Only subject creator or admin can update topics.
-- - Status values must be valid.
CREATE OR REPLACE FUNCTION public.validate_topic_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_is_admin boolean;
  caller_is_course_owner boolean;
BEGIN
  caller_is_admin := public.is_admin();

  -- Verify if caller created the parent subject owning this module
  SELECT EXISTS (
    SELECT 1 FROM public.syllabus_modules m
    JOIN public.subjects s ON s.id = m.subject_id
    WHERE m.id = OLD.module_id AND s.created_by = auth.uid()
  ) INTO caller_is_course_owner;

  -- Primary key (id) and parent module_id immutability
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Security Violation: Topic identifier (id) cannot be modified.';
  END IF;

  IF OLD.module_id IS DISTINCT FROM NEW.module_id AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: Topic cannot be moved across modules.';
  END IF;

  -- Only course owner or admin can update topics
  IF NOT caller_is_admin AND NOT caller_is_course_owner THEN
    RAISE EXCEPTION 'Permission Denied: Only the course creator or an HOD can update syllabus topics.';
  END IF;

  -- Validate status enum values
  IF NEW.status NOT IN ('Pending', 'In Progress', 'Completed') THEN
    RAISE EXCEPTION 'Invalid status value. Must be Pending, In Progress, or Completed.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_topic_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_topic_mutation() TO authenticated, service_role;

DROP TRIGGER IF EXISTS tr_validate_topic_mutation ON public.syllabus_topics;
CREATE TRIGGER tr_validate_topic_mutation
  BEFORE UPDATE ON public.syllabus_topics
  FOR EACH ROW EXECUTE FUNCTION public.validate_topic_mutation();

-- ====================================================================
-- STEP 7: ROW LEVEL SECURITY (RLS) POLICIES FOR ALL 11 TABLES
-- All tables verified with RLS ENABLED and exact column mapping
-- ====================================================================

-- --------------------------------------------------------------------
-- Table 1: public.profiles
-- Actual columns: id, email, full_name, department, role, created_at, updated_at
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND (role = 'faculty' OR public.is_admin()));

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- --------------------------------------------------------------------
-- Table 2: public.tasks
-- Actual columns: id, title, description, category, priority, status, due_date, estimated_hours, created_by, created_at, updated_at
-- --------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_policy"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = tasks.id AND ta.faculty_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "tasks_insert_policy"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "tasks_update_policy"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = tasks.id AND ta.faculty_id = auth.uid()) OR
    public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = tasks.id AND ta.faculty_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "tasks_delete_policy"
  ON public.tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

-- --------------------------------------------------------------------
-- Table 3: public.task_assignments
-- Actual columns: task_id, faculty_id, assigned_at (NO assigned_by, NO id)
-- --------------------------------------------------------------------
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_assignments_select_policy"
  ON public.task_assignments FOR SELECT TO authenticated
  USING (
    faculty_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "task_assignments_insert_policy"
  ON public.task_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid())
  );

CREATE POLICY "task_assignments_delete_policy"
  ON public.task_assignments FOR DELETE TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid())
  );

-- --------------------------------------------------------------------
-- Table 4: public.faculty_capacity
-- Actual columns: faculty_id, weekly_hours, updated_at
-- --------------------------------------------------------------------
ALTER TABLE public.faculty_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faculty_capacity_select_policy"
  ON public.faculty_capacity FOR SELECT TO authenticated
  USING (faculty_id = auth.uid() OR public.is_admin());

CREATE POLICY "faculty_capacity_insert_policy"
  ON public.faculty_capacity FOR INSERT TO authenticated
  WITH CHECK (faculty_id = auth.uid() OR public.is_admin());

CREATE POLICY "faculty_capacity_update_policy"
  ON public.faculty_capacity FOR UPDATE TO authenticated
  USING (faculty_id = auth.uid() OR public.is_admin())
  WITH CHECK (faculty_id = auth.uid() OR public.is_admin());

CREATE POLICY "faculty_capacity_delete_policy"
  ON public.faculty_capacity FOR DELETE TO authenticated
  USING (public.is_admin());

-- --------------------------------------------------------------------
-- Table 5: public.handover_requests
-- Actual columns: id, task_id, requested_by, requested_to, reason, status, created_at
-- --------------------------------------------------------------------
ALTER TABLE public.handover_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_requests_select_policy"
  ON public.handover_requests FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid() OR
    requested_to = auth.uid() OR
    public.is_admin()
  );

CREATE POLICY "handover_requests_insert_policy"
  ON public.handover_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    requested_by <> requested_to AND
    status = 'pending'
  );

CREATE POLICY "handover_requests_update_policy"
  ON public.handover_requests FOR UPDATE TO authenticated
  USING (
    requested_by = auth.uid() OR
    requested_to = auth.uid() OR
    public.is_admin()
  )
  WITH CHECK (
    requested_by = auth.uid() OR
    requested_to = auth.uid() OR
    public.is_admin()
  );

CREATE POLICY "handover_requests_delete_policy"
  ON public.handover_requests FOR DELETE TO authenticated
  USING (
    (requested_by = auth.uid() AND status = 'pending') OR
    public.is_admin()
  );

-- --------------------------------------------------------------------
-- Table 6: public.notifications
-- Actual columns: id, user_id, title, message, read_at, created_at
-- --------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_policy"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_policy"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_update_policy"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_policy"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- --------------------------------------------------------------------
-- Table 7: public.subjects
-- Actual columns: id, subject_code, name, department, semester, academic_year, created_by, created_at
-- --------------------------------------------------------------------
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select_policy"
  ON public.subjects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "subjects_insert_policy"
  ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "subjects_update_policy"
  ON public.subjects FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "subjects_delete_policy"
  ON public.subjects FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

-- --------------------------------------------------------------------
-- Table 8: public.syllabus_modules
-- Actual columns: id, subject_id, module_number, title, planned_hours, created_at
-- --------------------------------------------------------------------
ALTER TABLE public.syllabus_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syllabus_modules_select_policy"
  ON public.syllabus_modules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "syllabus_modules_insert_policy"
  ON public.syllabus_modules FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = syllabus_modules.subject_id AND s.created_by = auth.uid())
  );

CREATE POLICY "syllabus_modules_update_policy"
  ON public.syllabus_modules FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = syllabus_modules.subject_id AND s.created_by = auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = syllabus_modules.subject_id AND s.created_by = auth.uid())
  );

CREATE POLICY "syllabus_modules_delete_policy"
  ON public.syllabus_modules FOR DELETE TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = syllabus_modules.subject_id AND s.created_by = auth.uid())
  );

-- --------------------------------------------------------------------
-- Table 9: public.syllabus_topics
-- Actual columns: id, module_id, title, planned_hours, target_date, status, completed_at, created_at
-- --------------------------------------------------------------------
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syllabus_topics_select_policy"
  ON public.syllabus_topics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "syllabus_topics_insert_policy"
  ON public.syllabus_topics FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.syllabus_modules m
      JOIN public.subjects s ON s.id = m.subject_id
      WHERE m.id = syllabus_topics.module_id AND s.created_by = auth.uid()
    )
  );

-- Unrestricted USING(true) and unlinked task assignment bypass completely removed.
-- Only verified subject creator or HOD/admin can update topics.
-- (Trigger tr_validate_topic_mutation validates and guards fields).
CREATE POLICY "syllabus_topics_update_policy"
  ON public.syllabus_topics FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.syllabus_modules m
      JOIN public.subjects s ON s.id = m.subject_id
      WHERE m.id = syllabus_topics.module_id AND s.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.syllabus_modules m
      JOIN public.subjects s ON s.id = m.subject_id
      WHERE m.id = syllabus_topics.module_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "syllabus_topics_delete_policy"
  ON public.syllabus_topics FOR DELETE TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.syllabus_modules m
      JOIN public.subjects s ON s.id = m.subject_id
      WHERE m.id = syllabus_topics.module_id AND s.created_by = auth.uid()
    )
  );

-- --------------------------------------------------------------------
-- Table 10: public.academic_events
-- Actual columns: id, title, description, starts_at, ends_at, created_by, created_at
-- --------------------------------------------------------------------
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academic_events_select_policy"
  ON public.academic_events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "academic_events_insert_policy"
  ON public.academic_events FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "academic_events_update_policy"
  ON public.academic_events FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "academic_events_delete_policy"
  ON public.academic_events FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

-- --------------------------------------------------------------------
-- Table 11: public.teaching_progress
-- Actual columns: id, topic_id, faculty_id
-- --------------------------------------------------------------------
ALTER TABLE public.teaching_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teaching_progress_select_policy"
  ON public.teaching_progress FOR SELECT TO authenticated
  USING (faculty_id = auth.uid() OR public.is_admin());

CREATE POLICY "teaching_progress_insert_policy"
  ON public.teaching_progress FOR INSERT TO authenticated
  WITH CHECK (faculty_id = auth.uid() OR public.is_admin());

CREATE POLICY "teaching_progress_update_policy"
  ON public.teaching_progress FOR UPDATE TO authenticated
  USING (faculty_id = auth.uid() OR public.is_admin())
  WITH CHECK (faculty_id = auth.uid() OR public.is_admin());

CREATE POLICY "teaching_progress_delete_policy"
  ON public.teaching_progress FOR DELETE TO authenticated
  USING (faculty_id = auth.uid() OR public.is_admin());
