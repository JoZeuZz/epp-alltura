import { createContext } from 'react';

export interface ShellUser {
  id: string;
  email?: string;
  role?: string;
  roles?: string[];
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string | null;
  [key: string]: unknown;
}

interface AuthContextType {
  user: ShellUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUserData: (newUserData: ShellUser, token?: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
