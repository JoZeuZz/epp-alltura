import React, { useState } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationContextValue {
  notifications: Notification[];
  showNotification: (type: NotificationType, message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const NotificationContext = React.createContext<NotificationContextValue | undefined>(undefined);

/**
 * Provider para el sistema de notificaciones
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
 * Hook para usar el sistema de notificaciones
 */
export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe usarse dentro de NotificationProvider');
  }
  return context;
};

/**
 * Contenedor de notificaciones (se muestra en la esquina superior derecha)
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
 * Item individual de notificación
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

/**
 * Hook para confirmaciones
 */
export const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      onCancel?: () => void;
      confirmText?: string;
      cancelText?: string;
    }
  ) => {
    setConfig({
      title,
      message,
      onConfirm,
      onCancel: options?.onCancel,
      confirmText: options?.confirmText || 'Confirmar',
      cancelText: options?.cancelText || 'Cancelar',
    });
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (config?.onConfirm) {
      config.onConfirm();
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (config?.onCancel) {
      config.onCancel();
    }
    setIsOpen(false);
  };

  const ConfirmationDialog = () => {
    if (!isOpen || !config) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4">{config.title}</h3>
          <p className="text-gray-600 mb-6">{config.message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {config.cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {config.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { showConfirmation, ConfirmationDialog };
};

export default NotificationProvider;
