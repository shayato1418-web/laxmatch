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
  impersonate: (userId: string) => Promise<void>;
  returnToAdmin: () => Promise<void>;
  register: (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'area' | 'level' | 'lineId' | 'notes'>>) => Promise<void>;
  changePassword: (currentPw: string, newPw: string) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
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

  // Ensure a profiles row exists the moment the user is available
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
      .then(({ error }) => {
        if (error?.code === 'PGRST116') {
          // Row not found — create it from user_metadata
          supabase.from('profiles').insert({
            user_id: user.id,
            university_name: user.name || '',
            gender: user.gender || '',
            region: user.area || '',
            level: user.level || '',
            line_id: user.lineId || '',
            notes: user.notes || '',
            is_public: false,
          }).then(({ error: e }) => { if (e) console.error('[profile] ensure:', e); });
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
        // Create Supabase profile (fire-and-forget; may fail silently if email confirmation pending)
        supabase.from('profiles').upsert(
          {
            user_id: data.user.id,
            university_name: userData.name || '',
            gender: userData.gender || '',
            region: userData.area || '',
            level: userData.level || '',
            line_id: userData.lineId || '',
            notes: userData.notes || '',
            is_public: false,
          },
          { onConflict: 'user_id', ignoreDuplicates: true }
        ).then(({ error }) => { if (error) console.error('[profile] create:', error); });

        const stored = JSON.parse(localStorage.getItem('users') ?? '[]');
        if (!stored.some((u: { id: string }) => u.id === data.user!.id)) {
          stored.push({
            id: data.user.id,
            email: userData.email,
            name: userData.name,
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

  const impersonate = async (userId: string) => {
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
        expires_at: session.expires_at ?? 0,
      },
    };
    localStorage.setItem('adminImpersonationBackup', JSON.stringify(backup));

    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        localStorage.removeItem('adminImpersonationBackup');
        throw new Error(body.error ?? '代理ログインに失敗しました');
      }
      const { token } = await res.json() as { token: string };
      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'magiclink',
      });
      if (otpErr) {
        localStorage.removeItem('adminImpersonationBackup');
        throw new Error(`代理ログインに失敗しました: ${otpErr.message}`);
      }
    } catch (err) {
      if (!(err instanceof Error && err.message.startsWith('代理ログイン'))) {
        localStorage.removeItem('adminImpersonationBackup');
      }
      throw err;
    }

    setImpersonation(backup);
  };

  const returnToAdmin = async () => {
    const stored = localStorage.getItem('adminImpersonationBackup');
    if (!stored) return;
    const backup = JSON.parse(stored) as ImpersonationBackup;

    // Always clean up backup first so we're not stuck in impersonation state
    localStorage.removeItem('adminImpersonationBackup');
    setImpersonation(null);

    const { error } = await supabase.auth.setSession({
      access_token: backup.session.access_token,
      refresh_token: backup.session.refresh_token,
    });
    if (error) {
      // Session expired — sign out and let user re-authenticate
      await supabase.auth.signOut();
      setUser(null);
      throw new Error('管理者セッションの有効期限が切れています。再度ログインしてください。');
    }
  };

  const updateProfile = async (
    updates: Partial<Pick<User, 'name' | 'area' | 'level' | 'lineId' | 'notes'>>
  ) => {
    if (!user) return;

    // Build the profiles table patch
    const profilePatch: Record<string, string> = {};
    if (updates.name   !== undefined) profilePatch.university_name = updates.name;
    if (updates.area   !== undefined) profilePatch.region          = updates.area;
    if (updates.level  !== undefined) profilePatch.level           = updates.level;
    if (updates.lineId !== undefined) profilePatch.line_id         = updates.lineId;
    if (updates.notes  !== undefined) profilePatch.notes           = updates.notes;

    // Run both updates in parallel; throw on first error
    const tasks: Promise<{ error: { message: string } | null }>[] = [
      supabase.auth.updateUser({ data: updates }).then((r) => ({ error: r.error })),
    ];
    if (Object.keys(profilePatch).length > 0) {
      tasks.push(
        supabase.from('profiles')
          .upsert({ user_id: user.id, ...profilePatch }, { onConflict: 'user_id' })
          .then((r) => ({ error: r.error }))
      );
    }

    const results = await Promise.all(tasks);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);

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

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, impersonation, login, impersonate, returnToAdmin, register, logout, updateProfile, changePassword, resetPasswordForEmail }}>
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
