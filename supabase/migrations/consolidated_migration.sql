-- ====================================================================
-- FACULTY FLOW: CONSOLIDATED IDEMPOTENT DATABASE MIGRATION
-- Migration Name: consolidated_migration.sql
-- Target Database: PostgreSQL 15+ / Supabase Auth
--
-- Security Guarantees & Verification:
-- 1. Full Transactional Atomicity (BEGIN ... COMMIT): If any statement
--    fails, the entire migration rolls back instantly, preventing tables
--    from ever being left exposed or locked out without policies.
-- 2. Immediate RLS assertion: Row Level Security is explicitly enabled
--    across all 11 tables BEFORE any policy drops to guarantee continuous
--    default-deny protection during the migration.
-- 3. Dynamic purge of ALL legacy policies across 11 tables to eliminate
--    permissive OR policy pollution without guessing names.
-- 4. Empty search_path ('') on all SECURITY DEFINER functions with fully
--    qualified object references (public.*, auth.*, pg_catalog.*) to prevent
--    search-path injection vulnerabilities.
-- 5. Strict prevention of privilege escalation (role = 'admin') across
--    signup metadata, direct profile inserts, and profile updates.
-- 6. Task assignee field protection: assignees may ONLY update status;
--    all structural fields, ownership (created_by), creation timestamps,
--    and updated_at are strictly guarded against unauthorized modification.
-- 7. Exact status validation and normalization matching frontend values:
--    - Tasks: 'Pending', 'In Progress', 'Completed'
--    - Syllabus Topics: 'Pending', 'In Progress', 'Completed'
--    - Handovers: 'pending', 'approved', 'rejected'
-- 8. Handover lifecycle validation: blocks requester self-approval, blocks
--    reopening resolved requests, restricts rejection, and locks linkages.
-- 9. Syllabus topic update restriction: only verified subject creators
--    and admins may update topics (no unlinked task assignment bypass).
-- 10. Preservation of all existing columns on teaching_progress and all
--     other tables. Zero destructive DDL (no drop table, no drop column).
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- STEP 1: GUARANTEE RLS IS ENABLED BEFORE ANY POLICY MODIFICATION
-- Ensures continuous default-deny protection so tables are never exposed.
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_progress ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- STEP 2: DYNAMIC PURGE OF ALL EXISTING POLICIES ON THE 11 CORE TABLES
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
    EXECUTE pg_catalog.format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- STEP 3: SECURITY DEFINER HELPER FUNCTIONS (EMPTY SEARCH_PATH)
-- --------------------------------------------------------------------

-- is_admin(): Evaluates if current session user has verified admin role.
-- Defined with SECURITY DEFINER and empty search_path to prevent recursion and injection.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- is_task_assignee(): Checks if a given faculty user is assigned to a task.
-- Uses SECURITY DEFINER with empty search_path to query public.task_assignments
-- with table-owner privileges, breaking circular RLS recursion between tasks and task_assignments.
CREATE OR REPLACE FUNCTION public.is_task_assignee(
  _task_id uuid,
  _faculty_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_caller uuid;
BEGIN
  IF _task_id IS NULL THEN
    RETURN false;
  END IF;

  v_caller := auth.uid();
  IF _faculty_id IS NULL THEN
    _faculty_id := v_caller;
  END IF;

  IF _faculty_id IS NULL THEN
    RETURN false;
  END IF;

  -- Security barrier: Unauthorized callers cannot probe arbitrary users' task assignments.
  -- Caller is authorized to inspect their own assignment. Probing another user's assignment
  -- requires admin privileges or task creator ownership.
  IF v_caller IS NOT NULL AND _faculty_id IS DISTINCT FROM v_caller THEN
    IF NOT (public.is_admin() OR EXISTS (
      SELECT 1
      FROM public.tasks
      WHERE id = _task_id
        AND created_by = v_caller
    )) THEN
      RETURN false;
    END IF;
  ELSIF v_caller IS NULL AND NOT (
    current_user IN ('postgres', 'service_role', 'supabase_admin')
    OR NULLIF(current_setting('request.jwt.claim.role', true), '') = 'service_role'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.task_assignments
    WHERE task_id = _task_id
      AND faculty_id = _faculty_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_task_assignee(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) TO authenticated, service_role;

-- is_task_creator(): Checks if a given user is the creator of a task.
-- Uses SECURITY DEFINER with empty search_path to query public.tasks
-- with table-owner privileges, breaking circular RLS recursion between tasks and task_assignments.
CREATE OR REPLACE FUNCTION public.is_task_creator(
  _task_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_caller uuid;
BEGIN
  IF _task_id IS NULL THEN
    RETURN false;
  END IF;

  v_caller := auth.uid();
  IF _user_id IS NULL THEN
    _user_id := v_caller;
  END IF;

  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Security barrier: Unauthorized callers cannot probe arbitrary users' task ownership.
  -- Caller is authorized to verify their own task creation. Probing another user's task
  -- ownership requires verified administrative privileges.
  IF v_caller IS NOT NULL AND _user_id IS DISTINCT FROM v_caller THEN
    IF NOT public.is_admin() THEN
      RETURN false;
    END IF;
  ELSIF v_caller IS NULL AND NOT (
    current_user IN ('postgres', 'service_role', 'supabase_admin')
    OR NULLIF(current_setting('request.jwt.claim.role', true), '') = 'service_role'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE id = _task_id
      AND created_by = _user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_task_creator(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_creator(uuid, uuid) TO authenticated, service_role;

-- Explicitly assign function ownership to a trusted role capable of bypassing RLS
DO $$
DECLARE
  v_target_owner text;
  v_assignee_trusted boolean;
  v_creator_trusted boolean;
  v_assignee_owner text;
  v_creator_owner text;
BEGIN
  -- 1. Identify target trusted role: preferentially 'postgres', or the owner of public.tasks
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
    v_target_owner := 'postgres';
  ELSE
    SELECT tableowner INTO v_target_owner
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'tasks';
  END IF;

  IF v_target_owner IS NULL THEN
    RAISE EXCEPTION 'Function Ownership Error: Unable to determine a trusted role or table owner for public.tasks.';
  END IF;

  -- 2. Explicitly alter ownership to the trusted role (errors are NOT swallowed)
  EXECUTE pg_catalog.format('ALTER FUNCTION public.is_task_assignee(uuid, uuid) OWNER TO %I', v_target_owner);
  EXECUTE pg_catalog.format('ALTER FUNCTION public.is_task_creator(uuid, uuid) OWNER TO %I', v_target_owner);

  -- 3. Verify that public.is_task_assignee is owned by a role that can bypass RLS
  SELECT
    (r.rolsuper OR r.rolbypassrls OR r.rolname = t.tableowner),
    r.rolname
  INTO
    v_assignee_trusted,
    v_assignee_owner
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
  CROSS JOIN (
    SELECT tableowner FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'tasks'
  ) t
  WHERE p.oid = 'public.is_task_assignee(uuid, uuid)'::regprocedure;

  IF NOT coalesce(v_assignee_trusted, false) THEN
    RAISE EXCEPTION 'Security Enforcement Error: Function public.is_task_assignee(uuid, uuid) is owned by "%", which cannot bypass RLS (lacks superuser, bypassrls, and table-owner privileges). Aborting transaction.', v_assignee_owner;
  END IF;

  -- 4. Verify that public.is_task_creator is owned by a role that can bypass RLS
  SELECT
    (r.rolsuper OR r.rolbypassrls OR r.rolname = t.tableowner),
    r.rolname
  INTO
    v_creator_trusted,
    v_creator_owner
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
  CROSS JOIN (
    SELECT tableowner FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'tasks'
  ) t
  WHERE p.oid = 'public.is_task_creator(uuid, uuid)'::regprocedure;

  IF NOT coalesce(v_creator_trusted, false) THEN
    RAISE EXCEPTION 'Security Enforcement Error: Function public.is_task_creator(uuid, uuid) is owned by "%", which cannot bypass RLS (lacks superuser, bypassrls, and table-owner privileges). Aborting transaction.', v_creator_owner;
  END IF;
END;
$$;

-- --------------------------------------------------------------------
-- STEP 4: PROFILE INTEGRITY & ROLE ENFORCEMENT TRIGGERS
-- --------------------------------------------------------------------

-- handle_new_user(): Executes after auth.users insertion.
-- Reliably creates public.profiles row matching exact schema:
-- id, email, full_name, department, role.
-- Strictly assigns 'faculty' role regardless of raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), pg_catalog.split_part(NEW.email, '@', 1)),
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
SET search_path = ''
AS $$
BEGIN
  -- 1. On INSERT: Disallow non-admins from inserting any profile with role <> 'faculty'
  IF TG_OP = 'INSERT' THEN
    IF NEW.role <> 'faculty' AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      NEW.role := 'faculty';
    END IF;
    -- Non-admins cannot insert a profile for any user ID other than their own auth.uid()
    IF auth.uid() IS NOT NULL AND NEW.id <> auth.uid() AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Violation: Cannot insert profile for another user identity.';
    END IF;
    RETURN NEW;
  END IF;

  -- 2. On UPDATE: Block role escalation unless caller is verified admin or direct DB administrator
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      -- If called from client session (auth.uid() is not null), caller must be an existing verified admin
      IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Security Violation: Only verified Departmental Administrators (HOD) can modify user roles.';
      END IF;
    END IF;

    -- Prevent changing primary key ID
    IF OLD.id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'Security Violation: Profile identity (id) cannot be modified.';
    END IF;

    -- Non-admins can only update their own profile
    IF auth.uid() IS NOT NULL AND OLD.id <> auth.uid() AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Violation: Cannot modify another user''s profile.';
    END IF;

    -- Server-side assignment of updated_at timestamp
    NEW.updated_at := pg_catalog.now();

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_profile_role() TO authenticated, service_role;

DROP TRIGGER IF EXISTS tr_enforce_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS tr_prevent_self_promotion ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_self_promotion() CASCADE;

CREATE TRIGGER tr_enforce_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role();

-- --------------------------------------------------------------------
-- STEP 5: TASK MUTATION GUARD TRIGGER
-- --------------------------------------------------------------------

-- validate_task_mutation(): Enforces caller authorization and field protection:
-- - Caller must be task creator, assigned faculty, or admin.
-- - Task ownership (created_by), creation timestamp (created_at), and id cannot be altered.
-- - Assignees may ONLY update task 'status'; structural fields and arbitrary updated_at forging are locked.
-- - Status normalization & validation guarantees exact support for ('Pending', 'In Progress', 'Completed').
CREATE OR REPLACE FUNCTION public.validate_task_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_is_admin boolean;
  caller_is_creator boolean;
  caller_is_assignee boolean;
  normalized_status text;
BEGIN
  caller_is_admin := public.is_admin();
  caller_is_creator := (auth.uid() = OLD.created_by);
  caller_is_assignee := public.is_task_assignee(OLD.id, auth.uid());

  -- 1. Caller Authorization Check:
  IF NOT caller_is_admin AND NOT caller_is_creator AND NOT caller_is_assignee THEN
    RAISE EXCEPTION 'Permission Denied: You are not authorized to update this task.';
  END IF;

  -- 2. Primary key, ownership, and creation timestamp protection:
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Security Violation: Task identifier (id) cannot be modified.';
  END IF;

  IF OLD.created_by IS DISTINCT FROM NEW.created_by AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: Task ownership (created_by) cannot be transferred.';
  END IF;

  IF OLD.created_at IS DISTINCT FROM NEW.created_at AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: Task creation timestamp cannot be modified.';
  END IF;

  -- 3. Status normalization & exact value validation:
  normalized_status := pg_catalog.lower(pg_catalog.trim(NEW.status));
  IF normalized_status = 'pending' THEN
    NEW.status := 'Pending';
  ELSIF normalized_status IN ('in progress', 'in-progress') THEN
    NEW.status := 'In Progress';
  ELSIF normalized_status = 'completed' THEN
    NEW.status := 'Completed';
  ELSE
    RAISE EXCEPTION 'Invalid task status value: %. Supported values are: Pending, In Progress, Completed.', NEW.status;
  END IF;

  -- 4. Assignee Field Restriction:
  -- If updater is solely an assignee (not creator, not admin), ONLY 'status' can change.
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

  -- 5. Always assign updated_at server-side:
  -- Discards any client-supplied timestamp to guarantee clients cannot forge timestamps,
  -- while allowing legitimate updates from creators and assignees to succeed seamlessly.
  NEW.updated_at := pg_catalog.now();

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
-- STEP 6: HANDOVER MUTATION GUARD TRIGGER
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
-- - Status normalization to exact lowercase values ('pending', 'approved', 'rejected').
CREATE OR REPLACE FUNCTION public.validate_handover_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_is_admin boolean;
  normalized_status text;
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

  -- 3. Status normalization & exact value validation:
  normalized_status := pg_catalog.lower(pg_catalog.trim(NEW.status));
  IF normalized_status IN ('pending', 'approved', 'rejected') THEN
    NEW.status := normalized_status;
  ELSE
    RAISE EXCEPTION 'Invalid handover status value: %. Supported values are: pending, approved, rejected.', NEW.status;
  END IF;

  -- 4. State transition validation:
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

  -- 5. Reason field modification:
  -- Only the requester may modify the reason, and ONLY while the request is pending
  IF OLD.reason IS DISTINCT FROM NEW.reason THEN
    IF (auth.uid() <> OLD.requested_by AND NOT caller_is_admin) OR OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Permission Denied: Only the requester can modify the handover reason, and only while pending.';
    END IF;
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
-- STEP 7: SYLLABUS TOPIC MUTATION GUARD TRIGGER
-- --------------------------------------------------------------------

-- validate_topic_mutation(): Enforces topic update authorization:
-- - Immutable id, created_at, and module_id.
-- - Only subject creator or admin can update topics.
-- - Status normalization & validation guarantees exact support for ('Pending', 'In Progress', 'Completed').
CREATE OR REPLACE FUNCTION public.validate_topic_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_is_admin boolean;
  caller_is_course_owner boolean;
  normalized_status text;
BEGIN
  caller_is_admin := public.is_admin();

  -- Verify if caller created the parent subject owning this module
  SELECT EXISTS (
    SELECT 1 FROM public.syllabus_modules m
    JOIN public.subjects s ON s.id = m.subject_id
    WHERE m.id = OLD.module_id AND s.created_by = auth.uid()
  ) INTO caller_is_course_owner;

  -- Primary key (id), created_at, and parent module_id immutability
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Security Violation: Topic identifier (id) cannot be modified.';
  END IF;

  IF OLD.created_at IS DISTINCT FROM NEW.created_at AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: Topic creation timestamp cannot be modified.';
  END IF;

  IF OLD.module_id IS DISTINCT FROM NEW.module_id AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Security Violation: Topic cannot be moved across modules.';
  END IF;

  -- Only course owner or admin can update topics
  IF NOT caller_is_admin AND NOT caller_is_course_owner THEN
    RAISE EXCEPTION 'Permission Denied: Only the course creator or an HOD can update syllabus topics.';
  END IF;

  -- Status normalization & exact value validation:
  -- Canonical values in PostgreSQL CHECK constraint: 'Pending', 'In Progress', 'Completed'
  normalized_status := pg_catalog.lower(pg_catalog.trim(NEW.status));
  IF normalized_status = 'pending' THEN
    NEW.status := 'Pending';
  ELSIF normalized_status IN ('in progress', 'in-progress') THEN
    NEW.status := 'In Progress';
  ELSIF normalized_status = 'completed' THEN
    NEW.status := 'Completed';
  ELSE
    RAISE EXCEPTION 'Invalid syllabus topic status value: %. Supported values are: Pending, In Progress, Completed.', NEW.status;
  END IF;

  -- Automatic management of completed_at timestamp:
  IF NEW.status = 'Completed' AND (OLD.status <> 'Completed' OR NEW.completed_at IS NULL) THEN
    NEW.completed_at := COALESCE(NEW.completed_at, pg_catalog.now());
  ELSIF NEW.status <> 'Completed' THEN
    NEW.completed_at := NULL;
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
-- STEP 8: ROW LEVEL SECURITY (RLS) POLICIES FOR ALL 11 TABLES
-- All tables verified with RLS ENABLED and exact column mapping
-- ====================================================================

-- --------------------------------------------------------------------
-- Table 1: public.profiles
-- Actual columns: id, email, full_name, department, role, created_at, updated_at
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Authenticated users can view institutional directory profiles
-- (Required for peer handover selection and task assignee name resolution)
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- INSERT: Self-registration only with 'faculty' baseline role
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND (role = 'faculty' OR public.is_admin()));

-- UPDATE: Users can update their own profile fields; role change blocked by trigger
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- DELETE: Only institutional administrator can delete user profiles
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
    public.is_task_assignee(id, auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "tasks_insert_policy"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "tasks_update_policy"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_task_assignee(id, auth.uid()) OR
    public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid() OR
    public.is_task_assignee(id, auth.uid()) OR
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
    public.is_task_creator(task_id, auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "task_assignments_insert_policy"
  ON public.task_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR
    public.is_task_creator(task_id, auth.uid())
  );

CREATE POLICY "task_assignments_delete_policy"
  ON public.task_assignments FOR DELETE TO authenticated
  USING (
    public.is_admin() OR
    public.is_task_creator(task_id, auth.uid())
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
-- Actual columns: id, topic_id, faculty_id, date_taught, hours_spent, remarks, created_at
-- (Preserves all columns including hours_completed, notes, recorded_at if present)
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

-- --------------------------------------------------------------------
-- SUPPORTING PERFORMANCE INDEXES FOR RLS HELPER FUNCTION LOOKUPS
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_task_assignments_faculty_id ON public.task_assignments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

COMMIT;

-- ====================================================================
-- OPERATIONAL RUNBOOK: PREFLIGHT CHECKLIST, MANUAL PROVISIONING & ROLLBACK
-- ====================================================================

-- --------------------------------------------------------------------
-- A. PREFLIGHT CHECKLIST (Execute BEFORE applying migration)
-- --------------------------------------------------------------------
-- [ ] 1. Run supabase/diagnostics.sql in Supabase SQL Editor to audit:
--        - Table existence for all 11 core public tables.
--        - Actual column names across information_schema.columns.
--        - Current active RLS policies on pg_policies.
-- [ ] 2. Create a manual snapshot / backup of your Supabase database.
-- [ ] 3. Verify no long-running active client transactions or table locks:
--        SELECT pid, query, state, age(clock_timestamp(), query_start)
--        FROM pg_stat_activity
--        WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%';
-- [ ] 4. Confirm environment variables in frontend/.env match the project URL.

-- --------------------------------------------------------------------
-- B. DESIGNATED MANUAL STEP: FIRST-ADMIN (HOD) PROVISIONING
-- --------------------------------------------------------------------
-- Security Rationale:
-- 1. Client web requests cannot self-promote to 'admin' (blocked across
--    signup trigger, client INSERTs, and client UPDATEs).
-- 2. First-admin bootstrapping MUST be performed out-of-band by the
--    Database Administrator / Supabase Project Owner.
-- 3. In the Supabase SQL Editor, queries execute under direct PostgreSQL
--    session authority (where auth.uid() is NULL), allowing the trigger
--    enforce_profile_role() to permit this manual role assignment while
--    continuing to strictly reject all client PostgREST attempts.
--
-- Execution Instructions (Run once in Supabase SQL Editor after user signup):
-- Replace '<TARGET_ADMIN_EMAIL>' with the verified administrator email:
--
-- Step 1: Confirm the registered user exists in public.profiles:
--   SELECT id, email, full_name, role
--   FROM public.profiles
--   WHERE email = '<TARGET_ADMIN_EMAIL>';
--
-- Step 2: Promote the verified user to institutional administrator:
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = '<TARGET_ADMIN_EMAIL>';
--
-- Step 3: Verify administrator role status:
--   SELECT id, email, full_name, role
--   FROM public.profiles
--   WHERE role = 'admin';

-- --------------------------------------------------------------------
-- C. ROLLBACK GUIDANCE
-- --------------------------------------------------------------------
-- 1. AUTOMATIC ATOMIC ROLLBACK (During Migration):
--    The entire migration is enclosed within a single transaction
--    (BEGIN ... COMMIT). If any SQL statement encounters an error,
--    PostgreSQL rolls back all operations instantly. No table will be
--    left partially migrated or devoid of RLS protection.
--
-- 2. POST-MIGRATION EMERGENCY REVERSION (If needed after COMMIT):
--    To remove custom guard triggers while preserving application data:
--
--    DROP TRIGGER IF EXISTS tr_validate_task_mutation ON public.tasks;
--    DROP TRIGGER IF EXISTS tr_validate_handover_mutation ON public.handover_requests;
--    DROP TRIGGER IF EXISTS tr_validate_topic_mutation ON public.syllabus_topics;
--    DROP TRIGGER IF EXISTS tr_enforce_profile_role ON public.profiles;
--    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--
--    DROP FUNCTION IF EXISTS public.validate_task_mutation();
--    DROP FUNCTION IF EXISTS public.validate_handover_mutation();
--    DROP FUNCTION IF EXISTS public.validate_topic_mutation();
--    DROP FUNCTION IF EXISTS public.enforce_profile_role();
--    DROP FUNCTION IF EXISTS public.handle_new_user();
--    DROP FUNCTION IF EXISTS public.is_task_assignee(uuid, uuid);
--    DROP FUNCTION IF EXISTS public.is_task_creator(uuid, uuid);
--    DROP FUNCTION IF EXISTS public.is_admin();
-- ====================================================================
