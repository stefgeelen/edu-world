import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { parentPinSession } from '@/hooks/useParentPin';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google') => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Supabase hands us a brand new User object on every token refresh (~hourly)
 * even when it's the same person. Reusing the previous object in that case keeps
 * `user` referentially stable, so consumers' effects and memos keyed on it don't
 * fire for what is really a no-op.
 */
function keepIdentity(prev: User | null, next: User | null): User | null {
  if (prev && next && prev.id === next.id && prev.updated_at === next.updated_at) return prev;
  return next;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Always lock parent portal on sign-out / user switch / token refresh failure
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        parentPinSession.lock();
      }
      setSession(session);
      setUser((prev) => keepIdentity(prev, session?.user ?? null));
      setLoading(false);
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser((prev) => keepIdentity(prev, session?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    parentPinSession.lock();
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore — local state is cleared via onAuthStateChange
    }
  }, []);

  // Supabase re-emits onAuthStateChange on every token refresh (~hourly). Without
  // this memo, every refresh hands consumers a new object and re-renders the whole
  // authenticated tree, including the route guards.
  const value = useMemo(
    () => ({ user, session, loading, signUp, signIn, signInWithOAuth, resetPasswordForEmail, signOut }),
    [user, session, loading, signUp, signIn, signInWithOAuth, resetPasswordForEmail, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
