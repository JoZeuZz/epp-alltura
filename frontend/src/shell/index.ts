// Shell public surface

// Components
export { default as Modal } from './components/Modal';
export { default as ConfirmationModal } from './components/ConfirmationModal';
export type { ConfirmationModalProps } from './components/ConfirmationModal';
export { default as ErrorMessage } from './components/ErrorMessage';
export { default as ErrorModal } from './components/ErrorModal';
export { default as ErrorPage } from './components/ErrorPage';
export { default as LoadingOverlay } from './components/LoadingOverlay';
export { default as Spinner } from './components/Spinner';
export { default as UploadProgress } from './components/UploadProgress';
export type { UploadStage } from './components/UploadProgress';
export type { UploadProgressProps } from './components/UploadProgress';
export { default as ImageWithFallback } from './components/ImageWithFallback';
export { default as NotificationBell } from './components/NotificationBell';
export type { NotificationBellProps } from './components/NotificationBell';
export { default as NotificationItem } from './components/NotificationItem';
export type { NotificationItemProps } from './components/NotificationItem';
export { default as TourOverlay } from './components/TourOverlay';

// Layout
export { default as AppLayout } from './layout/AppLayout';
export {
  Container,
  Section,
  type ContainerProps,
  type SectionProps,
  type ContainerVariant,
} from './layout/Container';
export {
  ResponsiveGrid,
  CustomGrid,
  type ResponsiveGridProps,
  type CustomGridProps,
  type GridVariant,
  type GridGap,
} from './layout/ResponsiveGrid';
export {
  default as ResponsiveTable,
  type ResponsiveTableProps,
  type TableColumn,
} from './layout/ResponsiveTable';

// Context
export { AuthProvider } from './context/AuthContext';
export { NotificationProvider } from './context/NotificationContext';
export { TourProvider } from './context/TourContext';
export * from './context/authContext.shared';
export * from './context/notificationContext.shared';
export * from './context/tourContext.shared';

// Services
export * from './services/apiService';
export * from './services/authRefresh';
export * from './services/httpClient';
export * from './services/notificationService';
export * from './services/performanceService';
export { frontendLogger } from './services/frontendLogger';

// Shell utils
export * from './utils/tourSteps';
export * from './utils/imageProcessing';
export * from './utils/image';
export * from './utils/name';
