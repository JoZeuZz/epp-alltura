import React, { useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { ShellUser, AuthContext } from './authContext.shared';
import {
  refreshAccessToken,
  clearStoredTokens,
  getStoredAccessToken,
  storeTokens,
} from '../services/authRefresh';

interface AuthProviderProps {
  children: ReactNode;
  loginFn: (email: string, password: string) => Promise<{
    accessToken: string;
    refreshToken: string;
    user: ShellUser;
  }>;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, loginFn }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<ShellUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        let token = getStoredAccessToken();
        if (token && typeof token === 'string') {
          const decodedUser = jwtDecode<{ user: ShellUser; exp: number }>(token);
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

          const freshDecoded = jwtDecode<{ user: ShellUser }>(token);
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
      const response = await loginFn(email, password);
      const { accessToken, refreshToken, user } = response;
      storeTokens(accessToken, refreshToken);
      setUser(user);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      logout();
      return false;
    }
  }, [loginFn]);

  const logout = useCallback(() => {
    clearStoredTokens();
    queryClient.clear();
    setUser(null);
    window.location.href = '/login';
  }, [queryClient]);

  const refreshUserData = useCallback((newUserData: ShellUser, token?: string) => {
    try {
      if (token) {
        storeTokens(token);
      }
      setUser(newUserData);
    } catch (error) {
      console.error('Failed to refresh token', error);
      logout();
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
