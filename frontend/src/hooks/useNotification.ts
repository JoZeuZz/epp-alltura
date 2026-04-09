import { useContext } from 'react';
import { NotificationContext } from '../context/notificationContext.shared';

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe usarse dentro de NotificationProvider');
  }
  return context;
};
