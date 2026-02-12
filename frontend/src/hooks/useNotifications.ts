import { useState, useEffect, useCallback, useRef } from 'react';
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

type UseNotificationsParams = {
  unreadOnly?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
  offset?: number;
  pauseWhenHidden?: boolean;
  autoRefreshMode?: 'full' | 'unread-only';
  refreshOnVisibilityReturn?: boolean;
};

const DEFAULT_REFRESH_INTERVAL = 60000;

/**
 * Hook para gestionar notificaciones in-app
 */
export const useNotifications = (params?: UseNotificationsParams) => {
  const unreadOnly = params?.unreadOnly;
  const autoRefresh = params?.autoRefresh ?? false;
  const refreshInterval = params?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL;
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;
  const pauseWhenHidden = params?.pauseWhenHidden ?? true;
  const autoRefreshMode = params?.autoRefreshMode ?? 'full';
  const refreshOnVisibilityReturn = params?.refreshOnVisibilityReturn ?? true;

  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden
  );
  const wasHiddenRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const response = (await getInAppNotifications({
        unread_only: unreadOnly,
        limit,
        offset,
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
  }, [unreadOnly, limit, offset]);

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

  const runAutoRefresh = useCallback(() => {
    if (autoRefreshMode === 'unread-only') {
      fetchUnreadCount();
      return;
    }

    fetchNotifications();
    fetchUnreadCount();
  }, [autoRefreshMode, fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (autoRefreshMode === 'unread-only') {
      setLoading(false);
      fetchUnreadCount();
      return;
    }

    fetchNotifications();
    fetchUnreadCount();
  }, [autoRefreshMode, fetchNotifications, fetchUnreadCount]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    if (pauseWhenHidden && !isDocumentVisible) {
      return;
    }

    const interval = window.setInterval(runAutoRefresh, refreshInterval);
    return () => window.clearInterval(interval);
  }, [autoRefresh, pauseWhenHidden, isDocumentVisible, runAutoRefresh, refreshInterval]);

  useEffect(() => {
    if (!autoRefresh) {
      wasHiddenRef.current = !isDocumentVisible;
      return;
    }

    if (!isDocumentVisible) {
      wasHiddenRef.current = true;
      return;
    }

    if (wasHiddenRef.current && refreshOnVisibilityReturn) {
      runAutoRefresh();
    }

    wasHiddenRef.current = false;
  }, [autoRefresh, isDocumentVisible, refreshOnVisibilityReturn, runAutoRefresh]);

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
