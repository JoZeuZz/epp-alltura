import React, { useState } from 'react';
import {
  Notification,
  NotificationContext,
  NotificationType,
} from './notificationContext.shared';

/**
 * Provider para el sistema de notificaciones.
 */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (
    type: NotificationType,
    message: string,
    duration: number = 5000
  ) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, type, message, duration };

    setNotifications((prev) => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const showSuccess = (message: string, duration?: number) =>
    showNotification('success', message, duration);

  const showError = (message: string, duration?: number) =>
    showNotification('error', message, duration);

  const showWarning = (message: string, duration?: number) =>
    showNotification('warning', message, duration);

  const showInfo = (message: string, duration?: number) =>
    showNotification('info', message, duration);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        removeNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

/**
 * Contenedor de notificaciones (se muestra en la esquina superior derecha).
 */
const NotificationContainer: React.FC<{
  notifications: Notification[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

/**
 * Item individual de notificación.
 */
const NotificationItem: React.FC<{
  notification: Notification;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  };

  return (
    <div
      className={`${getStyles()} rounded-lg shadow-lg p-4 flex items-center space-x-3 transition-all duration-300 ${
        isExiting ? 'opacity-0 transform translate-x-full' : 'opacity-100'
      }`}
    >
      <span className="text-2xl">{getIcon()}</span>
      <p className="flex-1">{notification.message}</p>
      <button
        onClick={handleRemove}
        className="text-white hover:opacity-80 font-bold text-xl"
      >
        ✕
      </button>
    </div>
  );
};

export default NotificationProvider;
