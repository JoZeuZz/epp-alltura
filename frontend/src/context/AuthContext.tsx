import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import * as api from '../services/apiService';
import { jwtDecode } from 'jwt-decode';
import { User } from '../types/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUserToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const decodedUser = jwtDecode<{ user: User; exp: number }>(token);
        const isExpired = decodedUser.exp * 1000 < Date.now();

        if (isExpired) {
          throw new Error('Token expired');
        }

        setUser(decodedUser.user);
      }
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post<{ token: string }>('/auth/login', { email, password });
      const { token } = response;

      localStorage.setItem('accessToken', token);
      const decodedUser = jwtDecode<{ user: User }>(token);
      setUser(decodedUser.user);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      logout(); // Ensure clean state on failure
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const refreshUserToken = (token: string) => {
    try {
      localStorage.setItem('accessToken', token);
      const decodedUser = jwtDecode<{ user: User }>(token);
      setUser(decodedUser.user);
    } catch (error) {
      console.error('Failed to refresh token', error);
      logout(); // Fallback to logout on error
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUserToken,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
