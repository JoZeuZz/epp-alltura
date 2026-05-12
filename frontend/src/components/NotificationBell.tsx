import { useNotifications } from '../hooks/useNotifications';
import { getNotificationItemPresentation } from '../config/notificationItemCompat';
import ShellNotificationBell from '../shell/components/NotificationBell';
import type { NotificationBellProps as ShellNotificationBellProps } from '../shell/components/NotificationBell';
import type { ShellNotification, ShellNotificationPresentation } from '../shell/context/notificationContext.shared';

export type NotificationBellProps = Pick<ShellNotificationBellProps, 'variant' | 'previewLimit'>;

const POLL_INTERVAL_MS = 30000;

function resolvePresentation(
  n: Pick<ShellNotification, 'type' | 'link'>
): ShellNotificationPresentation {
  return getNotificationItemPresentation({ type: n.type, link: n.link ?? null });
}

export default function NotificationBell({
  variant = 'light',
  previewLimit = 5,
}: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotif,
  } = useNotifications({
    autoRefresh: true,
    refreshInterval: POLL_INTERVAL_MS,
    pauseWhenHidden: true,
    autoRefreshMode: 'unread-only',
  });

  return (
    <ShellNotificationBell
      notifications={notifications}
      unreadCount={unreadCount}
      loading={loading}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      onDelete={deleteNotif}
      onRefresh={fetchNotifications}
      resolvePresentation={resolvePresentation}
      variant={variant}
      previewLimit={previewLimit}
    />
  );
}
