import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, getCurrentProfile } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

interface SignUpResult {
  error: Error | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    meta: { fullName: string; department: string; designation: string }
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<Profile | null>;
  switchDemoUser: (role: UserRole) => void;
  enterDemoMode: () => void;
  isDemoUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Standalone fallback faculty/admin profile for offline evaluation (₹0 unconfigured mode)
const DEMO_FACULTY: Profile = {
  id: 'demo-faculty-01',
  email: 'priya.sharma@university.edu',
  full_name: 'Dr. Priya Sharma',
  department: 'Computer Science & Engineering',
  designation: 'Associate Professor',
  role: 'faculty',
  created_at: new Date().toISOString()
};

const DEMO_ADMIN: Profile = {
  id: 'demo-admin-01',
  email: 'hod.cs@university.edu',
  full_name: 'Dr. Rajesh Verma (HOD)',
  department: 'Computer Science & Engineering',
  designation: 'Head of Department & Professor',
  role: 'admin',
  created_at: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const configured = isSupabaseConfigured();

  // Helper to resolve or construct a profile from user metadata if table row was delayed
  const resolveProfile = useCallback(async (u: User): Promise<Profile> => {
    const existing = await getCurrentProfile(u.id);
    if (existing) {
      // If full_name in DB is empty or fallback but user_metadata has the full name, sync it
      const meta = u.user_metadata || {};
      if (meta.full_name && (!existing.full_name || existing.full_name === u.email?.split('@')[0])) {
        try {
          const { data: updated } = await supabase
            .from('profiles')
            .update({ full_name: meta.full_name })
            .eq('id', u.id)
            .select()
            .single();
          if (updated) return updated as Profile;
        } catch {
          // silently continue
        }
      }
      const profWithMeta = {
        ...existing,
        designation: (u.user_metadata?.designation as string) || existing.designation || 'Assistant Professor'
      };
      return profWithMeta;
    }

    // Construct standard faculty profile from user auth metadata
    const meta = u.user_metadata || {};
    const fallbackProfile: Profile = {
      id: u.id,
      email: u.email || '',
      full_name: meta.full_name || u.email?.split('@')[0] || 'Faculty Member',
      department: meta.department || 'Computer Science & Engineering',
      designation: meta.designation || 'Assistant Professor',
      role: 'faculty', // STRICT: Institutional baseline. Never trust client for role elevation.
      created_at: u.created_at || new Date().toISOString()
    };

    // Attempt to persist profile row if database trigger was delayed
    try {
      await supabase.from('profiles').upsert({
        id: fallbackProfile.id,
        email: fallbackProfile.email,
        full_name: fallbackProfile.full_name,
        department: fallbackProfile.department,
        role: fallbackProfile.role
      });
    } catch (err) {
      console.warn('Profile sync fallback note:', err);
    }

    return fallbackProfile;
  }, []);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!user) return null;
    try {
      const prof = await resolveProfile(user);
      setProfile(prof);
      return prof;
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      return null;
    }
  }, [user, resolveProfile]);

  useEffect(() => {
    if (!configured) {
      // Supabase credentials not yet configured; initialize in standalone demo mode
      setProfile(DEMO_FACULTY);
      setIsDemoUser(true);
      setLoading(false);
      return;
    }

    // 1. Initial Session Retrieval from persistent storage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const prof = await resolveProfile(session.user);
        setProfile(prof);
        setIsDemoUser(false);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }).catch((err) => {
      console.error('Session retrieval error:', err);
      setLoading(false);
    });

    // 2. Real-time Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          const prof = await resolveProfile(currentSession.user);
          setProfile(prof);
          setIsDemoUser(false);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsDemoUser(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [configured, resolveProfile]);

  const signIn = async (email: string, password: string) => {
    if (!configured) {
      if (email.toLowerCase().includes('hod') || email.toLowerCase().includes('admin')) {
        setProfile(DEMO_ADMIN);
      } else {
        setProfile(DEMO_FACULTY);
      }
      setIsDemoUser(true);
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      setIsDemoUser(false);
      const prof = await resolveProfile(data.user);
      setProfile(prof);
    }
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    meta: { fullName: string; department: string; designation: string }
  ): Promise<SignUpResult> => {
    if (!configured) {
      const newProf: Profile = {
        id: `demo-${Date.now()}`,
        email,
        full_name: meta.fullName,
        department: meta.department,
        designation: meta.designation,
        role: 'faculty', // Strictly enforce faculty role
        created_at: new Date().toISOString()
      };
      setProfile(newProf);
      setIsDemoUser(true);
      return { error: null };
    }

    // STRICT SECURITY: New signups are strictly granted the 'faculty' role.
    // Self-promotion to 'admin' is prevented at client, API, and database trigger levels.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: meta.fullName,
          department: meta.department,
          designation: meta.designation,
          role: 'faculty' // Hardcoded to faculty
        }
      }
    });

    if (error) {
      return { error };
    }

    // Check if Supabase email confirmation is enabled and session was not returned immediately
    const needsEmailConfirmation = Boolean(data.user && !data.session);

    if (data.user && data.session) {
      // If we received an active session immediately, persist and resolve profile now
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: meta.fullName,
          department: meta.department,
          role: 'faculty'
        });
      } catch (upsertErr) {
        console.warn('Profile immediate upsert notice:', upsertErr);
      }
      const prof = await resolveProfile(data.user);
      setProfile(prof);
      setIsDemoUser(false);
    }

    return { error: null, needsEmailConfirmation };
  };

  const signOut = async () => {
    if (configured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out warning:', err);
      }
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsDemoUser(false);

    // Clear user-specific cached state from localStorage when signing out
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('faculty_flow_') || key.startsWith('ff_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Local storage cache clearance note:', e);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return { error: new Error('No active profile') };

    if (!configured || isDemoUser) {
      setProfile({ ...profile, ...updates });
      return { error: null };
    }

    // STRICT SECURITY: Strip 'role' and 'id' from client update payload to prevent self-elevation
    const { role, id, ...allowedUpdates } = updates;
    const { data, error } = await supabase
      .from('profiles')
      .update(allowedUpdates)
      .eq('id', profile.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
    return { error };
  };

  // Demo user switching ONLY allowed in standalone offline demo mode
  // Authenticated real Supabase sessions cannot be hijacked by client role switching
  const switchDemoUser = (role: UserRole) => {
    if (configured && user && !isDemoUser) {
      console.warn('Role switching blocked: Authenticated Supabase profile role is governed by database RLS.');
      return;
    }
    setIsDemoUser(true);
    setProfile(role === 'admin' ? DEMO_ADMIN : DEMO_FACULTY);
  };

  const enterDemoMode = () => {
    setIsDemoUser(true);
    setProfile(DEMO_FACULTY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isConfigured: configured,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
        switchDemoUser,
        enterDemoMode,
        isDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
