import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from '../components/NotificationItem';
import { useState } from 'react';
import { frontendLogger } from '../shell/services/frontendLogger';

const ITEMS_PER_PAGE = 10;
const NOTIFICATIONS_REFRESH_INTERVAL_MS = 30000;

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotif,
    clearAllRead,
  } = useNotifications({
    unreadOnly: filter === 'unread',
    autoRefresh: true,
    refreshInterval: NOTIFICATIONS_REFRESH_INTERVAL_MS,
    pauseWhenHidden: true,
    autoRefreshMode: 'full',
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const hasReadNotifications = notifications.some((n) => n.is_read);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      frontendLogger.error('Error marking all notifications as read', error);
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'unread') => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleClearAllRead = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar todas las notificaciones leídas?')) {
      return;
    }

    try {
      await clearAllRead();
    } catch (error) {
      frontendLogger.error('Error clearing read notifications', error);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-4 sm:px-4 pt-3 sm:pt-8 pb-3 sm:pb-6 flex-shrink-0">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-xs sm:text-base text-gray-500 mt-1">
          Mantente al día con las actualizaciones de tus proyectos
        </p>
      </div>

      {/* Filters & Actions */}
      <div className="px-4 mb-3 sm:mb-6 space-y-2 sm:space-y-0 flex-shrink-0" data-tour="notifications-filters">
        {/* Filters */}
        <div className="bg-gray-100 p-1 rounded-lg inline-flex w-full sm:w-auto">
          <button
            onClick={() => handleFilterChange('all')}
            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 text-sm font-medium rounded-md transition-all ${
              filter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => handleFilterChange('unread')}
            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 text-sm font-medium rounded-md transition-all ${
              filter === 'unread'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            No leídas
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Mark All as Read Button */}
        {unreadCount > 0 && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleMarkAllAsRead}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Marcar todas como leídas</span>
              <span className="sm:hidden">Marcar leídas</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4" data-tour="notifications-list">
        {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error al cargar las notificaciones</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 sm:py-20">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <p className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
            No hay notificaciones
          </p>
          <p className="text-sm text-gray-500 px-4">
            {filter === 'unread'
              ? 'No tienes notificaciones sin leer'
              : 'Cuando recibas notificaciones, aparecerán aquí'}
          </p>
        </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 pb-4">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotif}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer fijo - Paginación y Limpiar */}
      {!loading && notifications.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-gray-100">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          )}

          {/* Botón Limpiar */}
          {hasReadNotifications && (
            <div className="px-4 py-3">
              <button
                onClick={handleClearAllRead}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                <span className="hidden sm:inline">🗑️ Limpiar todas las notificaciones leídas</span>
                <span className="sm:hidden">🗑️ Limpiar leídas</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
