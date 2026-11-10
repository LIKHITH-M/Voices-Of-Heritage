import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { apiClient } from '@/lib/api';

export type UserRole = 'user' | 'researcher' | 'guide' | 'institution' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  heritage_interests?: string[];
  is_verified?: boolean;
}

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role?: UserRole) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Firebase user to our Postgres backend and return the full profile.
  const syncProfile = async (
    fbUser: FirebaseUser,
    extra?: { name?: string; role?: string; avatar_url?: string | null }
  ): Promise<void> => {
    try {
      const res = await apiClient.post<{ user: User }>('/api/auth/sync', {
        name: extra?.name || fbUser.displayName || fbUser.email?.split('@')[0],
        role: extra?.role || 'user',
        avatar_url: extra?.avatar_url ?? fbUser.photoURL ?? null,
      });
      setUser(res.data.user);
      localStorage.setItem('voh_user_id', res.data.user.id);
    } catch {
      // Backend unreachable — fall back to Firebase identity
      const fallbackUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email || 'User',
        email: fbUser.email || '',
        role: 'user',
        avatar_url: fbUser.photoURL,
        is_verified: fbUser.emailVerified,
      };
      setUser(fallbackUser);
      localStorage.setItem('voh_user_id', fallbackUser.id);
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) await syncProfile(firebaseUser);
  };

  useEffect(() => {
    const savedDemo = localStorage.getItem('voh_demo_user');
    if (savedDemo) {
      try {
        setUser(JSON.parse(savedDemo));
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('voh_demo_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await syncProfile(fbUser);
      } else {
        const stored = localStorage.getItem('voh_demo_user');
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will fire and call syncProfile
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncProfile(result.user);
    } catch (err: any) {
      // Surface the Firebase error to the console for easier debugging
      console.error('Google sign-in failed:', err?.code || err?.message || err);
      throw err;
    }
  };

  const loginAsDemo = (role: UserRole = 'researcher') => {
    const demoUser: User = {
      id: 'demo-researcher-001',
      name: 'Dr. Vikramaditya (Demo Researcher)',
      email: 'researcher@voicesofheritage.org',
      role,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      heritage_interests: ['Hampi', 'Vijayanagara Architecture', 'Mysore Palace', 'Belur Hoysala'],
      is_verified: true,
    };
    localStorage.setItem('voh_demo_user', JSON.stringify(demoUser));
    localStorage.setItem('voh_user_id', demoUser.id);
    setUser(demoUser);
    setLoading(false);
  };

  const logout = async () => {
    localStorage.removeItem('voh_demo_user');
    localStorage.removeItem('voh_user_id');
    try {
      await signOut(auth);
    } catch {}
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, loginWithGoogle, loginAsDemo, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
