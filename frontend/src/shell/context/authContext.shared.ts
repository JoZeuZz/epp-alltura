import { createContext } from 'react';
import type { User } from '../../types/api';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUserData: (newUserData: User, token?: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
