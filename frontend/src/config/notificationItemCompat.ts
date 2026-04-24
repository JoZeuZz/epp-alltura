import type { InAppNotification } from '../types/clientNotes';

export interface NotificationItemPresentation {
  icon: string;
  unreadColorClass: string;
  navigationLink: string;
}

const LEGACY_NOTIFICATION_ICONS: Record<string, string> = {
  new_client_note: '📝',
  note_resolved: '✅',
  scaffold_updated: '🔄',
  scaffold_modification_added: '➕',
  project_assigned: '📋',
  note_urgent: '⚠️',
  custodia_vencida: '🚨',
  custodia_proxima_vencer: '⏰',
  system: 'ℹ️',
};

const LEGACY_NOTIFICATION_COLORS: Record<string, string> = {
  new_client_note: 'bg-blue-50 border-blue-200',
  note_resolved: 'bg-green-50 border-green-200',
  scaffold_updated: 'bg-purple-50 border-purple-200',
  scaffold_modification_added: 'bg-cyan-50 border-cyan-200',
  project_assigned: 'bg-indigo-50 border-indigo-200',
  note_urgent: 'bg-red-50 border-red-200',
  custodia_vencida: 'bg-red-50 border-red-200',
  custodia_proxima_vencer: 'bg-yellow-50 border-yellow-200',
  system: 'bg-gray-50 border-gray-200',
};

export const ALLOWED_NOTIFICATION_PATHS = new Set([
  '/admin/dashboard',
  '/admin/trazabilidad',
  '/admin/trabajadores',
  '/supervisor/dashboard',
  '/supervisor/trazabilidad',
  '/bodega/dashboard',
  '/bodega/operaciones',
  '/worker/dashboard',
  '/worker/firmas',
  '/notifications',
  '/profile',
]);

export const resolveNotificationItemIcon = (type: string): string => {
  return LEGACY_NOTIFICATION_ICONS[type] || 'ℹ️';
};

export const resolveNotificationItemUnreadColorClass = (type: string): string => {
  return LEGACY_NOTIFICATION_COLORS[type] || 'bg-gray-50';
};

export const resolveNotificationItemNavigationLink = (
  link: string | null | undefined
): string => {
  if (!link || typeof link !== 'string') {
    return '/notifications';
  }

  if (!link.startsWith('/')) {
    return '/notifications';
  }

  const [path] = link.split('?');
  if (ALLOWED_NOTIFICATION_PATHS.has(path)) {
    return link;
  }

  return '/notifications';
};

export const getNotificationItemPresentation = (
  notification: Pick<InAppNotification, 'type' | 'link'>
): NotificationItemPresentation => {
  return {
    icon: resolveNotificationItemIcon(notification.type),
    unreadColorClass: resolveNotificationItemUnreadColorClass(notification.type),
    navigationLink: resolveNotificationItemNavigationLink(notification.link),
  };
};
