'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'university' | 'individual' | 'manager';

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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'area' | 'level' | 'lineId' | 'notes'>>) => Promise<void>;
  changePassword: (currentPw: string, newPw: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化：localStorage からユーザー情報を復元
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 固定管理者アカウント
      if (email === "admin" && password === "laxmatch2024") {
        const adminUser: User = {
          id: "admin",
          email: "admin",
          name: "管理者",
          role: "manager",
          createdAt: new Date().toISOString(),
        };
        setUser(adminUser);
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        return;
      }

      // ローカル ストレージから登録ユーザーを取得
      const users = JSON.parse(localStorage.getItem('users') || '[]') as Array<{
        id: string;
        email: string;
        password: string;
        name: string;
        role: UserRole;
      }>;

      const foundUser = users.find((u) => u.email === email && u.password === password);
      if (!foundUser) {
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }

      const userData: User = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        createdAt: new Date().toISOString(),
      };

      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => {
    setIsLoading(true);
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');

      // メールが既に登録されていないか確認
      if (users.some((u: { email: string }) => u.email === userData.email)) {
        throw new Error('このメールアドレスは既に登録されています');
      }

      const newUser = {
        id: `user_${Date.now()}`,
        ...userData,
        createdAt: new Date().toISOString(),
      };

      users.push({
        id: newUser.id,
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
      });

      localStorage.setItem('users', JSON.stringify(users));

      // 登録後は自動ログイン
      const loginUser: User = {
        id: newUser.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        individualType: userData.individualType,
        area: userData.area,
        level: userData.level,
        gender: userData.gender,
        memberCount: userData.memberCount,
        lineId: userData.lineId,
        notes: userData.notes,
        createdAt: newUser.createdAt,
      };

      setUser(loginUser);
      localStorage.setItem('currentUser', JSON.stringify(loginUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'area' | 'level' | 'lineId' | 'notes'>>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('currentUser', JSON.stringify(updated));
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const idx = users.findIndex((u: { id: string }) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem('users', JSON.stringify(users));
    }
  };

  const changePassword = async (currentPw: string, newPw: string) => {
    if (!user) throw new Error('ログインしていません');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const idx = users.findIndex((u: { id: string; password: string }) => u.id === user.id && u.password === currentPw);
    if (idx < 0) throw new Error('現在のパスワードが正しくありません');
    users[idx].password = newPw;
    localStorage.setItem('users', JSON.stringify(users));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile, changePassword }}>
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
