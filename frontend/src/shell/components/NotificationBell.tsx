import { useEffect, useId, useRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBreakpoints } from '../hooks/useBreakpoints';
import { frontendLogger } from '../services/frontendLogger';
import NotificationItem from './NotificationItem';
import type { ShellNotification, ShellNotificationPresentation } from '../context/notificationContext.shared';

export interface NotificationBellProps {
  notifications: ShellNotification[];
  unreadCount: number;
  loading?: boolean;
  onMarkAsRead: (id: number) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  resolvePresentation?: (
    n: Pick<ShellNotification, 'type' | 'link'>
  ) => ShellNotificationPresentation;
  variant?: 'light' | 'dark';
  previewLimit?: number;
}

export default function NotificationBell({
  notifications,
  unreadCount,
  loading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onRefresh,
  resolvePresentation,
  variant = 'light',
  previewLimit = 5,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const panelId = useId();
  const headingId = useId();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoints();
  const isNotificationsRoute = location.pathname.startsWith('/notifications');

  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerButtonRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    try {
      await onMarkAllAsRead();
    } catch (error) {
      frontendLogger.error('Error marking all as read', error);
    }
  };

  const handleToggleDropdown = () => {
    const shouldOpen = !isOpen;
    setIsOpen(shouldOpen);
    if (shouldOpen && !isNotificationsRoute) {
      onRefresh().catch((error: unknown) => {
        frontendLogger.error('Error refreshing notifications', error);
      });
    }
  };

  const handleClose = () => setIsOpen(false);
  const handleViewAll = () => {
    navigate('/notifications');
    setIsOpen(false);
  };

  const previewNotifications = notifications.slice(0, previewLimit);

  const buttonClasses = variant === 'dark'
    ? 'relative p-2 text-white hover:text-gray-200 hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
    : 'relative p-2 text-content-secondary hover:text-content-primary hover:bg-surface-overlay rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  const renderNotificationList = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      );
    }
    if (previewNotifications.length === 0) {
      return (
        <div className="text-center py-8 text-content-muted">
          <svg className="w-12 h-12 mx-auto mb-2 text-content-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm">No hay notificaciones</p>
        </div>
      );
    }
    return (
      <div className="divide-y divide-edge-subtle">
        {previewNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onDelete={onDelete}
            resolvePresentation={resolvePresentation}
            compact
          />
        ))}
      </div>
    );
  };

  const renderHeader = () => (
    <div className="px-4 py-3 border-b border-edge flex items-center justify-between bg-surface-muted flex-shrink-0">
      <h3 id={headingId} className="text-base font-semibold text-content-primary">Notificaciones</h3>
      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead} className="text-sm text-primary hover:text-primary-dark font-medium whitespace-nowrap">
            <span className="hidden sm:inline">Marcar todas como leídas</span>
            <span className="sm:hidden">Marcar</span>
          </button>
        )}
        {isMobile && (
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-content-muted hover:text-content-secondary hover:bg-surface-overlay"
            aria-label="Cerrar notificaciones"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={bellRef}>
      <button
        ref={triggerButtonRef}
        onClick={handleToggleDropdown}
        className={buttonClasses}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} no leídas)` : ''}`}
        aria-haspopup={isMobile ? 'dialog' : 'menu'}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-danger rounded-full transform translate-x-1/2 -translate-y-1/2">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && !isMobile && (
        <div
          id={panelId}
          role="menu"
          aria-labelledby={headingId}
          className="absolute right-0 mt-2 w-96 bg-surface rounded-lg shadow-dropdown border border-edge z-50 overflow-hidden max-h-[32rem] flex flex-col"
        >
          {renderHeader()}
          <div className="flex-1 overflow-y-auto">{renderNotificationList()}</div>
          {previewNotifications.length > 0 && (
            <div className="px-4 py-3 border-t border-edge bg-surface-muted flex-shrink-0">
              <button onClick={handleViewAll} className="text-sm text-primary hover:text-primary-dark font-medium block text-center w-full">
                Ver todas
              </button>
            </div>
          )}
        </div>
      )}

      {isOpen && isMobile && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} aria-hidden="true" />
          <FocusTrap
            focusTrapOptions={{
              initialFocus: () => closeButtonRef.current ?? triggerButtonRef.current ?? document.body,
              fallbackFocus: () => closeButtonRef.current ?? triggerButtonRef.current ?? document.body,
              clickOutsideDeactivates: false,
              escapeDeactivates: false,
              returnFocusOnDeactivate: false,
            }}
          >
            <div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              className="fixed inset-0 z-50 bg-surface flex flex-col"
            >
              {renderHeader()}
              <div className="flex-1 overflow-y-auto">{renderNotificationList()}</div>
              {previewNotifications.length > 0 && (
                <div className="px-4 py-3 border-t border-edge bg-surface-muted flex-shrink-0">
                  <button onClick={handleViewAll} className="text-sm text-primary hover:text-primary-dark font-medium block text-center w-full">
                    Ver todas
                  </button>
                </div>
              )}
            </div>
          </FocusTrap>
        </>
      )}
    </div>
  );
}
