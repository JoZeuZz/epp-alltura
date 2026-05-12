import { createContext } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationContextValue {
  notifications: Notification[];
  showNotification: (type: NotificationType, message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export interface ShellNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string | null;
}

export interface ShellNotificationPresentation {
  icon: string;
  unreadColorClass: string;
  navigationLink: string;
}
