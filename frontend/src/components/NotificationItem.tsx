import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { InAppNotification } from '../types/clientNotes';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NotificationItemProps {
  notification: InAppNotification;
  onMarkAsRead: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  compact?: boolean;
}

const notificationIcons: Record<string, string> = {
  new_client_note: '📝',
  note_resolved: '✅',
  scaffold_updated: '🔄',
  scaffold_modification_added: '➕',
  project_assigned: '📋',
  note_urgent: '⚠️',
  system: 'ℹ️',
};

const notificationColors: Record<string, string> = {
  new_client_note: 'bg-blue-50 border-blue-200',
  note_resolved: 'bg-green-50 border-green-200',
  scaffold_updated: 'bg-purple-50 border-purple-200',
  scaffold_modification_added: 'bg-cyan-50 border-cyan-200',
  project_assigned: 'bg-indigo-50 border-indigo-200',
  note_urgent: 'bg-red-50 border-red-200',
  system: 'bg-gray-50 border-gray-200',
};

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Convertir link genérico a link específico del rol
  const getNavigationLink = (): string | null => {
    if (!notification.link) return null;

    const { metadata } = notification;
    const role = user?.role;

    // Si el link es genérico (/scaffolds/:id o /projects/:id), convertirlo según el rol
    if (notification.link.startsWith('/scaffolds/')) {
      const projectId = metadata?.project_id;
      
      // Si no tenemos project_id, intentar con scaffold_id para buscar el proyecto
      if (!projectId) {
        // Para clientes, redirigir al dashboard si no tenemos project_id
        // El cliente puede encontrar el andamio desde ahí
        if (role === 'client') {
          return `/client/dashboard`;
        }
        // Para admin, ir a la lista de andamios
        if (role === 'admin') {
          return `/admin/scaffolds`;
        }
        // Para supervisor, ir al dashboard
        if (role === 'supervisor') {
          return `/supervisor/dashboard`;
        }
        return null;
      }
      
      switch (role) {
        case 'admin':
          // Para admin, redirigir a la página de andamios con filtro del proyecto
          return `/admin/scaffolds?project=${projectId}`;
        case 'supervisor':
          // Para supervisor, ir a la página del proyecto
          return `/supervisor/project/${projectId}`;
        case 'client':
          // Para cliente, ir a la página del proyecto
          return `/client/project/${projectId}`;
        default:
          return null;
      }
    }

    if (notification.link.startsWith('/projects/') && metadata?.project_id) {
      const projectId = metadata.project_id;
      
      switch (role) {
        case 'admin':
          return `/admin/projects`;
        case 'supervisor':
          return `/supervisor/project/${projectId}`;
        case 'client':
          return `/client/project/${projectId}`;
        default:
          return null;
      }
    }

    // Si el link ya es específico del rol, usarlo tal cual
    return notification.link;
  };

  const handleClick = async () => {
    if (!notification.is_read) {
      try {
        await onMarkAsRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    const link = getNavigationLink();
    if (link) {
      navigate(link);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onDelete(notification.id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const icon = notificationIcons[notification.type] || 'ℹ️';
  const colorClass = notification.is_read
    ? 'bg-white'
    : notificationColors[notification.type] || 'bg-gray-50';
  
  const hasValidLink = getNavigationLink() !== null;

  return (
    <div
      onClick={handleClick}
      className={`${colorClass} ${
        hasValidLink ? 'cursor-pointer hover:bg-gray-100' : ''
      } ${compact ? 'px-3 py-2.5 sm:px-4 sm:py-3' : 'p-3 sm:p-4 border rounded-lg'} transition-colors relative group`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* Icon */}
        <div className="text-xl flex-shrink-0">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  notification.is_read ? 'font-normal' : 'font-semibold'
                } text-gray-900 break-words`}
              >
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 mt-0.5 break-words">{notification.message}</p>
            </div>

            {/* Unread indicator */}
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
            )}
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-500 mt-1.5">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>

        {/* Delete button (visible on hover) */}
        {!compact && (
          <button
            onClick={handleDelete}
            className="opacity-0 sm:group-hover:opacity-100 sm:opacity-0 opacity-100 transition-opacity text-gray-400 hover:text-red-600 p-1 flex-shrink-0"
            aria-label="Eliminar notificación"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
