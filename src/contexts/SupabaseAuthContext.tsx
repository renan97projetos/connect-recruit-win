import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SignUpMetadata {
  city?: string;
  state?: string;
  desired_role?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'company' | 'candidate' | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'admin' | 'company' | 'candidate', metadata?: SignUpMetadata) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; role?: 'admin' | 'company' | 'candidate' | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'company' | 'candidate' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setUserRole((data?.role as 'admin' | 'company' | 'candidate') || null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'company' | 'candidate', metadata?: SignUpMetadata) => {
    try {
      const redirectUrl = `https://www.sinapserh.com.br/`;
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
            ...metadata,
          }
        }
      });

      if (signUpError) return { error: signUpError };
      if (!data.user) return { error: new Error('Falha ao criar usuário') };

      // O trigger handle_new_user agora cria automaticamente o perfil e a role
      // Não precisamos mais inserir manualmente

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: any; role?: 'admin' | 'company' | 'candidate' | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error };

    // Buscar o role imediatamente após o login
    if (data.user) {
      try {
        const { data: roleData } = await (supabase as any)
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        const role = (roleData?.role as 'admin' | 'company' | 'candidate') || null;
        setUserRole(role);
        return { error: null, role };
      } catch (e) {
        return { error: null, role: null };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://www.sinapserh.com.br/reset-password`,
    });

    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userRole,
      loading,
      signUp, 
      signIn, 
      signOut,
      resetPassword,
      updatePassword,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
}