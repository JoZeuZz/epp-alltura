import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import * as api from '../services/apiService';
import { jwtDecode } from 'jwt-decode';
import { User } from '../types/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUserData: (newUserData: User, token?: string) => void;
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
      if (token && typeof token === 'string') {
        const decodedUser = jwtDecode<{ user: User; exp: number }>(token);
        const isExpired = decodedUser.exp * 1000 < Date.now();

        if (isExpired) {
          throw new Error('Token expired');
        }

        setUser(decodedUser.user);
      }
    } catch (error) {
      console.error('Error validating token on mount:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response;

      // Guardar ambos tokens en localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Establecer usuario desde la respuesta del backend
      setUser(user);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      logout(); // Ensure clean state on failure
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const refreshUserData = (newUserData: User, token?: string) => {
    try {
      // If a new token is provided, update it in localStorage
      if (token) {
        localStorage.setItem('accessToken', token);
      }
      // Update user state with the new data from the API response
      setUser(newUserData);
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
    refreshUserData,
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
