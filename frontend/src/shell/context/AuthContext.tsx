import React, { useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../services/apiService';
import { jwtDecode } from 'jwt-decode';
import { User } from '../../types/api';
import {
  refreshAccessToken,
  clearStoredTokens,
  getStoredAccessToken,
  storeTokens,
} from '../services/authRefresh';
import { AuthContext } from './authContext.shared';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        let token = getStoredAccessToken();
        if (token && typeof token === 'string') {
          const decodedUser = jwtDecode<{ user: User; exp: number }>(token);
          const isExpired = decodedUser.exp * 1000 < Date.now();

          if (isExpired) {
            const refreshedToken = await refreshAccessToken();
            if (!refreshedToken) {
              clearStoredTokens();
              queryClient.clear();
              if (isMounted) setUser(null);
              return;
            }
            token = refreshedToken;
          }

          const freshDecoded = jwtDecode<{ user: User }>(token);
          if (isMounted) {
            setUser(freshDecoded.user);
          }
          return;
        }

        if (isMounted) setUser(null);
      } catch (error) {
        console.error('Error validating token on mount:', error);
        clearStoredTokens();
        queryClient.clear();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response;

      // Guardar ambos tokens en storage estandarizado
      storeTokens(accessToken, refreshToken);
      
      // Establecer usuario desde la respuesta del backend
      setUser(user);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      logout(); // Ensure clean state on failure
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredTokens();
    queryClient.clear();
    setUser(null);
    // Redirigir al login
    window.location.href = '/login';
  }, [queryClient]);

  const refreshUserData = useCallback((newUserData: User, token?: string) => {
    try {
      // Si llega un nuevo access token, se actualiza sin tocar refresh token.
      if (token) {
        storeTokens(token);
      }
      // Update user state with the new data from the API response
      setUser(newUserData);
    } catch (error) {
      console.error('Failed to refresh token', error);
      logout(); // Fallback to logout on error
    }
  }, [logout]);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    refreshUserData,
  }), [user, loading, login, logout, refreshUserData]);

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
