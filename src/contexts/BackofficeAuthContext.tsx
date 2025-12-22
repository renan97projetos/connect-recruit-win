import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface BackofficeAuthContextType {
  user: User | null;
  session: Session | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const BackofficeAuthContext = createContext<BackofficeAuthContextType | undefined>(undefined);

export function BackofficeAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSuperAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking super admin role:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking super admin role:', error);
      return false;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            const isSA = await checkSuperAdminRole(session.user.id);
            setIsSuperAdmin(isSA);
            setLoading(false);
          }, 0);
        } else {
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const isSA = await checkSuperAdminRole(session.user.id);
        setIsSuperAdmin(isSA);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const isSA = await checkSuperAdminRole(data.user.id);
        if (!isSA) {
          await supabase.auth.signOut();
          return { error: { message: 'Acesso não autorizado. Apenas Super Admins podem acessar o backoffice.' } };
        }
        setIsSuperAdmin(true);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsSuperAdmin(false);
  };

  return (
    <BackofficeAuthContext.Provider
      value={{
        user,
        session,
        isSuperAdmin,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </BackofficeAuthContext.Provider>
  );
}

export function useBackofficeAuth() {
  const context = useContext(BackofficeAuthContext);
  if (context === undefined) {
    throw new Error('useBackofficeAuth must be used within a BackofficeAuthProvider');
  }
  return context;
}
