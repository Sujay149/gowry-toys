import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  refreshingProfile: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data || !data.active) {
    return null;
  }
  return data as Profile;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const refreshProfile = async () => {
    const current = supabase.auth.getSession();
    const { data } = await current;
    if (!data.session) {
      setProfile(null);
      return;
    }
    setRefreshingProfile(true);
    try {
      const p = await fetchProfile(data.session.user.id);
      setProfile(p);
    } finally {
      setRefreshingProfile(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const activeSession = data.session;
      setSession(activeSession);
      if (activeSession) {
        fetchProfile(activeSession.user.id).then(setProfile).finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        fetchProfile(nextSession.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        initializing,
        refreshingProfile,
        signIn,
        signOut,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}