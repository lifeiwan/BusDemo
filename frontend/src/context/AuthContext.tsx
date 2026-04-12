import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthContextValue {
  isLoggedIn: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'evabus_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );

  function login(username: string, password: string): boolean {
    // TODO: replace with real backend auth check
    if (!username.trim() || !password.trim()) return false;
    setIsLoggedIn(true);
    localStorage.setItem(STORAGE_KEY, 'true');
    return true;
  }

  function logout() {
    setIsLoggedIn(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
