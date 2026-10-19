-- ====================================================================
-- FACULTY FLOW: SECURITY HARDENING & PRIVILEGE ESCALATION SAFEGUARDS
-- Version: 20261018000001
-- Safe to execute in the Supabase SQL Editor
-- ====================================================================

-- 1. SECURE SIGNUP TRIGGER: Ensure all new registrations are strictly 'faculty'
-- Prevents malicious actors from injecting role='admin' via raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    department,
    designation,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Computer Science & Engineering'),
    COALESCE(NEW.raw_user_meta_data->>'designation', 'Assistant Professor'),
    'faculty' -- HARDCODED: Strict institutional baseline. Never allow client self-promotion to admin.
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. PREVENT ROLE ELEVATION ON UPDATE
-- Prevents any client from executing `UPDATE profiles SET role = 'admin'`
CREATE OR REPLACE FUNCTION public.prevent_self_promotion()
RETURNS trigger AS $$
DECLARE
  caller_role text;
BEGIN
  -- If role column is unchanged, permit update
  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  -- Verify if the caller executing the update is an existing verified Admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Security Violation: Only verified Departmental Administrators (HOD) can modify user roles.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_self_promotion ON public.profiles;
CREATE TRIGGER tr_prevent_self_promotion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_promotion();


-- 3. ENSURE TASK OWNERSHIP & INSERT VALIDATION
-- Ensure that users cannot insert tasks attributed to other users
DROP POLICY IF EXISTS "Faculty can insert own tasks" ON public.tasks;
CREATE POLICY "Faculty can insert own tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Ensure that users cannot delete tasks unless they are the creator or an admin
DROP POLICY IF EXISTS "Creator or admin can delete tasks" ON public.tasks;
CREATE POLICY "Creator or admin can delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
