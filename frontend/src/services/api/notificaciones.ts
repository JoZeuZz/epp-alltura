import { get, put, del } from './http';
import type { InAppNotification, NotificationStats } from '../../types/clientNotes';

// ============ IN-APP NOTIFICATIONS ENDPOINTS ============

export interface InAppNotificationsResponse {
  data: InAppNotification[];
  pagination: { limit: number; offset: number };
  total: number;
}

export const getInAppNotifications = (params?: {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}) => get<InAppNotificationsResponse>('/notifications/in-app', params);

export const getUnreadNotificationsCount = () =>
  get<{ count: number }>('/notifications/in-app/unread-count');

export const getNotificationStats = () => get<NotificationStats>('/notifications/in-app/stats');

export const markNotificationAsRead = (notificationId: number) =>
  put(`/notifications/in-app/${notificationId}/read`, {});

export const markAllNotificationsAsRead = () =>
  put('/notifications/in-app/mark-all-read', {});

export const deleteNotification = (notificationId: number) =>
  del(`/notifications/in-app/${notificationId}`);

export const deleteAllReadNotifications = () =>
  del('/notifications/in-app/clear-read');
