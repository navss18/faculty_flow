import { createClient } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

// Read public environment variables exposed by Vite
// NEVER expose service_role or database passwords in frontend code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Validates whether legitimate Supabase credentials have been configured
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-ref.supabase.co' &&
    supabaseAnonKey !== 'your-anon-public-key-here' &&
    !supabaseUrl.includes('placeholder') &&
    supabaseUrl.startsWith('https://')
  );
};

// Safe client instantiation (uses real credentials if present, or inert placeholder during pre-config build)
const safeUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

/**
 * Safely fetches profile for the authenticated user from public.profiles
 */
export async function getCurrentProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase profile query warning:', error.message);
      return null;
    }
    return data as Profile | null;
  } catch (err) {
    console.error('Failed to get current profile:', err);
    return null;
  }
}
