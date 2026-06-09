import type { InAppNotification } from '../types/clientNotes';

export interface NotificationItemPresentation {
  icon: string;
  unreadColorClass: string;
  navigationLink: string;
}

const LEGACY_NOTIFICATION_ICONS: Record<string, string> = {
  new_client_note: '',
  note_resolved: '',
  asset_updated: '',
  asset_modification_added: '',
  project_assigned: '',
  note_urgent: '',
  custodia_vencida: '',
  custodia_proxima_vencer: '',
  system: '',
  proyecto_finalizado_con_articulos: '',
};

const LEGACY_NOTIFICATION_COLORS: Record<string, string> = {
  new_client_note: 'bg-blue-50 border-blue-200',
  note_resolved: 'bg-green-50 border-green-200',
  asset_updated: 'bg-purple-50 border-purple-200',
  asset_modification_added: 'bg-cyan-50 border-cyan-200',
  project_assigned: 'bg-indigo-50 border-indigo-200',
  note_urgent: 'bg-red-50 border-red-200',
  custodia_vencida: 'bg-red-50 border-red-200',
  custodia_proxima_vencer: 'bg-yellow-50 border-yellow-200',
  system: 'bg-gray-50 border-gray-200',
  proyecto_finalizado_con_articulos: 'bg-orange-50 border-orange-200',
};

export const ALLOWED_NOTIFICATION_PATHS = new Set([
  '/admin/dashboard',
  '/admin/trabajadores',
  '/supervisor/dashboard',
  '/notifications',
  '/profile',
  '/ubicacion/proyectos',
]);

export const resolveNotificationItemIcon = (type: string): string => {
  return LEGACY_NOTIFICATION_ICONS[type] ?? '';
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

  // Reject path traversal
  if (link.includes('..') || link.includes('//')) {
    return '/notifications';
  }

  const [path] = link.split('?');

  // Allow dynamic paths under /ubicacion/proyectos/
  if (path.startsWith('/ubicacion/proyectos/') && path.split('/').length === 4) {
    return link;
  }

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
