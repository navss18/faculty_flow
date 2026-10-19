-- ====================================================================
-- FACULTY FLOW: READ-ONLY DATABASE DIAGNOSTIC QUERIES
-- Execution Mode: 100% READ-ONLY (SELECT only; no schema or data modification)
-- Target: Supabase SQL Editor
--
-- Coverage across all 11 tables:
-- 1. Row Level Security (RLS) activation status (rls_enabled, rls_forced)
-- 2. Inventory of all active RLS policies (permissive, cmd, using, with_check)
-- 3. Actual column definitions and types from information_schema
-- 4. Foreign key relationships and target tables/columns (corrected join)
-- 5. Relevant triggers on public tables and auth.users
-- 6. Function security properties (SECURITY DEFINER, search_path, volatility)
-- 7. Verified institutional administrator profiles (role = 'admin')
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY (RLS) STATUS ACROSS ALL 11 CORE TABLES
-- Verifies whether RLS is active (rls_enabled) and forced (rls_forced).
-- --------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
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
ORDER BY c.relname;

-- --------------------------------------------------------------------
-- 2. INVENTORY OF ACTIVE RLS POLICIES ON THE 11 CORE TABLES
-- Inspects existing policies before/after migration to detect permissive OR rules.
-- --------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
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
ORDER BY tablename, cmd, policyname;

-- --------------------------------------------------------------------
-- 3. ACTUAL COLUMN DEFINITIONS ACROSS THE 11 CORE TABLES
-- Confirms existing column names and data types (e.g. subject_code, read_at, etc.).
-- --------------------------------------------------------------------
SELECT
  table_name,
  column_name,
  ordinal_position,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
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
ORDER BY table_name, ordinal_position;

-- --------------------------------------------------------------------
-- 4. FOREIGN KEY CONSTRAINTS (CORRECTED CROSS-SCHEMA JOIN)
-- Validates linkages and demonstrates that tasks does NOT link to syllabus_topics.
-- Joins constraint_column_usage using constraint_name and constraint_schema
-- so cross-schema foreign keys (e.g. public.profiles.id -> auth.users.id) resolve cleanly.
-- --------------------------------------------------------------------
SELECT
  tc.table_schema AS source_schema,
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_schema AS target_schema,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
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
ORDER BY source_table, source_column;

-- --------------------------------------------------------------------
-- 5. RELEVANT TRIGGERS ON ALL 11 TABLES & AUTH.USERS
-- Checks trigger presence, firing conditions, and called procedures.
-- --------------------------------------------------------------------
SELECT
  event_object_schema AS schema_name,
  event_object_table AS table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE (
  (event_object_schema = 'public' AND event_object_table IN (
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
  ))
  OR (event_object_schema = 'auth' AND event_object_table = 'users')
)
ORDER BY schema_name, table_name, trigger_name;

-- --------------------------------------------------------------------
-- 6. SECURITY DEFINER STATUS AND SEARCH PATH ON CUSTOM FUNCTIONS
-- Confirms that security-sensitive functions have prosecdef = true and fixed search_path.
-- --------------------------------------------------------------------
SELECT
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS function_owner,
  p.prosecdef AS is_security_definer,
  p.proconfig AS search_path_settings,
  p.provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_admin',
    'handle_new_user',
    'enforce_profile_role',
    'validate_task_mutation',
    'validate_handover_mutation',
    'validate_topic_mutation',
    'prevent_self_promotion'
  )
ORDER BY p.proname;

-- --------------------------------------------------------------------
-- 7. EXISTING INSTITUTIONAL ADMINISTRATOR PROFILES
-- Displays users currently holding the 'admin' role. Excludes sensitive auth tokens.
-- --------------------------------------------------------------------
SELECT
  id,
  email,
  full_name,
  department,
  role,
  created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at;
