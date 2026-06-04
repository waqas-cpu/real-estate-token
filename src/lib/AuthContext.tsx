import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { setBackendAccessToken } from './backendClient';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  userRole: 'investor' | 'issuer' | 'admin';
  investorWallet: string;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUserRole: (role: 'investor' | 'issuer' | 'admin') => void;
  setInvestorWallet: (wallet: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'investor' | 'issuer' | 'admin'>('investor');
  const [investorWallet, setInvestorWalletState] = useState('');
  const [loading, setLoading] = useState(true);

  const setInvestorWallet = (wallet: string) => {
    setInvestorWalletState(wallet);
    localStorage.setItem('investorWallet', wallet);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        setBackendAccessToken(session?.access_token ?? null);

        const storedRole = localStorage.getItem('userRole') as 'investor' | 'issuer' | 'admin' | null;
        if (storedRole) setUserRole(storedRole);
        const storedWallet = localStorage.getItem('investorWallet');
        if (storedWallet) setInvestorWalletState(storedWallet);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setBackendAccessToken(session?.access_token ?? null);
      if (!session?.user) {
        localStorage.removeItem('userRole');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setUser(authUser || null);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      localStorage.removeItem('userRole');
      setUserRole('investor');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updateUserRole = (role: 'investor' | 'issuer' | 'admin') => {
    setUserRole(role);
    localStorage.setItem('userRole', role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        investorWallet,
        loading,
        signUp,
        signIn,
        signOut,
        setUserRole: updateUserRole,
        setInvestorWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
