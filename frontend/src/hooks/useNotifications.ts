import { useState, useEffect, useCallback } from 'react';
import {
  getInAppNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllReadNotifications,
  getNotificationStats,
} from '../services/apiService';
import type {
  InAppNotification,
  NotificationStats,
} from '../types/clientNotes';

/**
 * Hook para gestionar notificaciones in-app
 */
export const useNotifications = (params?: {
  unreadOnly?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
  offset?: number;
}) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const response = (await getInAppNotifications({
        unread_only: params?.unreadOnly,
        limit: params?.limit || 20,
        offset: params?.offset || 0,
      })) as
        | InAppNotification[]
        | {
            data?: InAppNotification[];
            notifications?: InAppNotification[];
            total?: number;
          };

      const notificationsList = Array.isArray(response)
        ? response
        : response?.data || response?.notifications || [];

      setNotifications(notificationsList);
      setTotal(
        typeof response === 'object' && response && 'total' in response && typeof response.total === 'number'
          ? response.total
          : notificationsList.length
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cargar notificaciones';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [params?.unreadOnly, params?.limit, params?.offset]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = (await getUnreadNotificationsCount()) as
        | number
        | {
            count?: number;
            data?: { count?: number };
          };

      const count =
        typeof response === 'number'
          ? response
          : response?.count ?? response?.data?.count ?? 0;

      setUnreadCount(count);
    } catch (err: unknown) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Auto-refresh
  useEffect(() => {
    if (params?.autoRefresh) {
      const interval = setInterval(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, params.refreshInterval || 30000); // Default: 30 segundos

      return () => clearInterval(interval);
    }
  }, [params?.autoRefresh, params?.refreshInterval, fetchNotifications, fetchUnreadCount]);

  const markAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      await fetchUnreadCount();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al marcar como leída';
      throw new Error(errorMessage);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al marcar todas como leídas';
      throw new Error(errorMessage);
    }
  };

  const deleteNotif = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      await fetchUnreadCount();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al eliminar notificación';
      throw new Error(errorMessage);
    }
  };

  const clearAllRead = async () => {
    try {
      await deleteAllReadNotifications();
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Error al limpiar notificaciones leídas';
      throw new Error(errorMessage);
    }
  };

  return {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotif,
    clearAllRead,
  };
};

/**
 * Hook para estadísticas de notificaciones
 */
export const useNotificationStats = () => {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = (await getNotificationStats()) as
        | NotificationStats
        | {
            data?: NotificationStats;
          };

      const resolved = (response as { data?: NotificationStats })?.data || (response as NotificationStats);
      setStats(resolved);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cargar estadísticas';
      setError(errorMessage);
      console.error('Error fetching notification stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, fetchStats };
};
