// Shell public surface

// Components
export { default as Modal } from './components/Modal';
export { default as ConfirmationModal } from './components/ConfirmationModal';
export type { ConfirmationModalProps } from './components/ConfirmationModal';
export { default as ErrorMessage } from './components/ErrorMessage';
export { default as ErrorPage } from './components/ErrorPage';
export { default as Spinner } from './components/Spinner';
export { default as UploadProgress } from './components/UploadProgress';
export type { UploadStage, UploadProgressProps } from './components/UploadProgress';
export { default as NotificationBell } from './components/NotificationBell';
export type { NotificationBellProps } from './components/NotificationBell';
export { default as NotificationItem } from './components/NotificationItem';
export type { NotificationItemProps } from './components/NotificationItem';
export { default as TourOverlay } from './components/TourOverlay';

// Layout
export { default as AppLayout } from './layout/AppLayout';
export type { NavItem } from './layout/AppLayout';
export { Container, Section } from './layout/Container';
export { ResponsiveGrid, CustomGrid } from './layout/ResponsiveGrid';
export { default as ResponsiveTable } from './layout/ResponsiveTable';
export type { ResponsiveTableProps, TableColumn } from './layout/ResponsiveTable';

// Context
export { AuthProvider } from './context/AuthContext';
export { NotificationProvider } from './context/NotificationContext';
export { TourProvider } from './context/TourContext';
export * from './context/authContext.shared';
export * from './context/notificationContext.shared';
export * from './context/tourContext.shared';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useTour } from './hooks/useTour';
export { useBreakpoints } from './hooks/useBreakpoints';
export { useMediaQuery } from './hooks/useMediaQuery';

// Services
export * from './services/authRefresh';
export * from './services/httpClient';
export * from './services/notificationService';
export * from './services/performanceService';
export { frontendLogger } from './services/frontendLogger';

// Utils
export * from './utils/imageProcessing';
export * from './utils/name';
export * from './utils/tourSteps';
