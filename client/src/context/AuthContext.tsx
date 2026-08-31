import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  personas: any[];
  login: (credentials: any) => Promise<void>;
  switchPersona: (roleNameOrPayload?: any, email?: string) => Promise<void>;
  logout: () => void;

  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('eprocure_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [personas, setPersonas] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load demo personas list
      const pList = await api.getDemoPersonas().catch(() => []);
      setPersonas(pList);

      const savedToken = localStorage.getItem('eprocure_token');
      if (savedToken) {
        const me = await api.getMe();
        setUser(me);
      } else {
        // Auto sign in as Super Admin by default for seamless instant demonstration
        const res = await api.switchPersona({ roleName: 'Super Administrator' });
        localStorage.setItem('eprocure_token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
    } catch (err) {
      console.warn('Could not auto-authenticate:', err);
      localStorage.removeItem('eprocure_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: any) => {
    const res = await api.login(credentials);
    localStorage.setItem('eprocure_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const switchPersona = async (roleNameOrPayload?: any, email?: string) => {
    setLoading(true);
    try {
      let params = {};
      if (typeof roleNameOrPayload === 'object' && roleNameOrPayload !== null) {
        params = roleNameOrPayload;
      } else if (typeof roleNameOrPayload === 'string') {
        params = { roleName: roleNameOrPayload, email };
      }
      const res = await api.switchPersona(params);
      localStorage.setItem('eprocure_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };


  const logout = () => {
    localStorage.removeItem('eprocure_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        personas,
        login,
        switchPersona,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
