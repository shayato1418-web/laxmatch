'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'university' | 'individual' | 'manager';

export const ADMIN_EMAILS = ['s.hayato1418@gmail.com', 'laxmatch14@gmail.com'] as const;

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  individualType?: string;
  area?: string;
  level?: string;
  gender?: string;
  memberCount?: string;
  lineId?: string;
  notes?: string;
  createdAt: string;
}

interface ImpersonationBackup {
  adminUser: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  impersonation: ImpersonationBackup | null;
  login: (email: string, password: string) => Promise<void>;
  impersonate: (email: string, password: string) => Promise<void>;
  returnToAdmin: () => Promise<void>;
  register: (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'area' | 'level' | 'lineId' | 'notes'>>) => Promise<void>;
  changePassword: (currentPw: string, newPw: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(sbUser: SupabaseUser): User {
  const meta = sbUser.user_metadata ?? {};
  const email = sbUser.email ?? '';
  const isAdmin = (ADMIN_EMAILS as readonly string[]).includes(email);
  return {
    id: sbUser.id,
    email,
    name: meta.name ?? email,
    role: isAdmin ? 'manager' : (meta.role ?? 'university'),
    individualType: meta.individualType,
    area: meta.area,
    level: meta.level,
    gender: meta.gender,
    memberCount: meta.memberCount,
    lineId: meta.lineId,
    notes: meta.notes,
    createdAt: sbUser.created_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationBackup | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const stored = localStorage.getItem("adminImpersonationBackup");
    if (stored) {
      try {
        setImpersonation(JSON.parse(stored));
      } catch {
        localStorage.removeItem("adminImpersonationBackup");
      }
    }
  }, []);

  useEffect(() => {
    // Subscribe to auth state — INITIAL_SESSION fires immediately with current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ? mapSupabaseUser(session.user) : null);
        setIsLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const storedUsers = JSON.parse(localStorage.getItem('users') ?? '[]') as Array<any>;
      const target = storedUsers.find((u) => u.email === email);
      if (target?.status === 'suspended') {
        throw new Error('このアカウントは停止されています');
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('メールアドレスの確認が完了していません。受信ボックスをご確認ください。');
        }
        throw new Error(error.message);
      }

      const now = new Date().toLocaleString('ja-JP', { hour12: false });
      const updated = storedUsers.map((u) =>
        u.email === email ? { ...u, lastLogin: now, status: u.status || 'active' } : u
      );
      localStorage.setItem('users', JSON.stringify(updated));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    userData: Omit<User, 'id' | 'createdAt'> & { password: string }
  ): Promise<{ needsConfirmation: boolean }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
          password: userData.password,
            memberCount: userData.memberCount,
            lineId: userData.lineId,
            notes: userData.notes,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          throw new Error('このメールアドレスは既に登録されています');
        }
        throw new Error(error.message);
      }

      // Also persist to localStorage for admin page compatibility
      if (data.user) {
        const stored = JSON.parse(localStorage.getItem('users') ?? '[]');
        if (!stored.some((u: { id: string }) => u.id === data.user!.id)) {
          stored.push({
            id: data.user.id,
            email: userData.email,
            name: userData.name,
            password: userData.password,
            role: userData.role,
            area: userData.area ?? '',
            registeredAt: new Date().toLocaleDateString('ja-JP'),
            lastLogin: '—',
            status: 'active',
            flagged: false,
          });
          localStorage.setItem('users', JSON.stringify(stored));
        }
      }

      // session is null when email confirmation is required
      return { needsConfirmation: !data.session };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('adminImpersonationBackup');
    setImpersonation(null);
    setUser(null);
  };

  const impersonate = async (email: string, password: string) => {
    if (!user) throw new Error('ログインしていません');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('現在の管理者セッションを取得できませんでした');
    }

    const backup: ImpersonationBackup = {
      adminUser: user,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      },
    };
    localStorage.setItem('adminImpersonationBackup', JSON.stringify(backup));

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      localStorage.removeItem('adminImpersonationBackup');
      throw new Error(error.message);
    }
    setImpersonation(backup);
  };

  const returnToAdmin = async () => {
    const stored = localStorage.getItem('adminImpersonationBackup');
    if (!stored) return;
    const backup = JSON.parse(stored) as ImpersonationBackup;
    const { error } = await supabase.auth.setSession(backup.session as any);
    if (error) {
      throw new Error(error.message);
    }
    localStorage.removeItem('adminImpersonationBackup');
    setImpersonation(null);
  };

  const updateProfile = async (
    updates: Partial<Pick<User, 'name' | 'area' | 'level' | 'lineId' | 'notes'>>
  ) => {
    if (!user) return;
    const { error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw new Error(error.message);
    const updated = { ...user, ...updates };
    setUser(updated);

    // Keep localStorage in sync for admin page
    const users = JSON.parse(localStorage.getItem('users') ?? '[]');
    const idx = users.findIndex((u: { id: string }) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem('users', JSON.stringify(users));
    }
  };

  const changePassword = async (currentPw: string, newPw: string) => {
    if (!user) throw new Error('ログインしていません');

    // Verify current password by re-authenticating
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });
    if (verifyError) throw new Error('現在のパスワードが正しくありません');

    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, impersonation, login, impersonate, returnToAdmin, register, logout, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
