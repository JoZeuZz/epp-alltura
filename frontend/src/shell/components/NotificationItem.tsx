import type { KeyboardEvent, MouseEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { frontendLogger } from '../services/frontendLogger';
import type { ShellNotification, ShellNotificationPresentation } from '../context/notificationContext.shared';

const defaultResolvePresentation = (
  _n: Pick<ShellNotification, 'type' | 'link'>
): ShellNotificationPresentation => ({
  icon: 'ℹ️',
  unreadColorClass: 'bg-surface',
  navigationLink: '/notifications',
});

export interface NotificationItemProps {
  notification: ShellNotification;
  onMarkAsRead: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  resolvePresentation?: (
    n: Pick<ShellNotification, 'type' | 'link'>
  ) => ShellNotificationPresentation;
  compact?: boolean;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  resolvePresentation = defaultResolvePresentation,
  compact = false,
}: NotificationItemProps) {
  const navigate = useNavigate();

  const presentation = resolvePresentation(notification);
  const navigationLink = presentation.navigationLink;

  const handleClick = async () => {
    if (!notification.is_read) {
      try {
        await onMarkAsRead(notification.id);
      } catch (error) {
        frontendLogger.error('Error marking notification as read', error);
      }
    }
    navigate(navigationLink);
  };

  const handleDelete = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      await onDelete(notification.id);
    } catch (error) {
      frontendLogger.error('Error deleting notification', error);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void handleClick();
    }
  };

  const icon = presentation.icon;
  const colorClass = notification.is_read ? 'bg-surface' : presentation.unreadColorClass;

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Abrir notificación: ${notification.title}`}
      className={`${colorClass} cursor-pointer hover:bg-surface-overlay ${compact ? 'px-3 py-2.5 sm:px-4 sm:py-3' : 'p-3 sm:p-4 border rounded-lg'} transition-colors relative group`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="text-xl flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${notification.is_read ? 'font-normal' : 'font-semibold'} text-content-primary break-words`}>
                {notification.title}
              </p>
              <p className="text-sm text-content-secondary mt-0.5 break-words">{notification.message}</p>
            </div>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
            )}
          </div>
          <p className="text-xs text-content-muted mt-1.5">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>
        {!compact && (
          <button
            onClick={handleDelete}
            className="opacity-0 sm:group-hover:opacity-100 sm:opacity-0 opacity-100 transition-opacity text-content-disabled hover:text-danger p-1 flex-shrink-0"
            aria-label="Eliminar notificación"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
