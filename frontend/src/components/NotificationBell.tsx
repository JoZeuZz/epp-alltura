import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from './NotificationItem';

interface NotificationBellProps {
  variant?: 'light' | 'dark';
}

export default function NotificationBell({ variant = 'light' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
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
    refreshInterval: 60000,
    pauseWhenHidden: true,
    autoRefreshMode: 'unread-only',
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleToggleDropdown = () => {
    const shouldOpen = !isOpen;
    setIsOpen(shouldOpen);

    if (shouldOpen) {
      fetchNotifications().catch((error: unknown) => {
        console.error('Error refreshing notifications:', error);
      });
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  // Estilos dinámicos basados en la variante
  const buttonClasses = variant === 'dark'
    ? "relative p-2 text-white hover:text-gray-200 hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
    : "relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggleDropdown}
        className={buttonClasses}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} no leídas)` : ''}`}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay solo en móvil */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="fixed inset-x-0 bottom-0 sm:absolute sm:left-auto sm:right-0 sm:bottom-auto mt-0 sm:mt-2 sm:w-96 bg-white rounded-t-2xl sm:rounded-lg shadow-xl border-t sm:border border-gray-200 z-50 overflow-hidden max-h-[80vh] sm:max-h-[32rem] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Notificaciones</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Marcar todas como leídas</span>
                  <span className="sm:hidden">Marcar</span>
                </button>
              )}
            </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-sm">No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotif}
                    compact
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {recentNotifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium block text-center w-full"
              >
                Ver todas
              </button>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
