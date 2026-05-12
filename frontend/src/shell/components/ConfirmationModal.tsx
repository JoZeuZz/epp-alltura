import Modal from './Modal';
import { ReactNode, useId } from 'react';

const WarningIconInline = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2L2 20h20L12 2z" fill="currentColor" fillOpacity="0.2" />
    <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InfoIconInline = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmDisabled?: boolean;
  confirmDisabledReason?: string;
  children?: ReactNode;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  confirmDisabled = false,
  confirmDisabledReason,
  children,
}: ConfirmationModalProps) {
  const titleId = useId();
  const messageId = useId();
  const confirmDisabledReasonId = useId();

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <WarningIconInline className="w-7 h-7" />,
          iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
          iconColor: 'text-white',
          iconRing: 'ring-red-500/20',
          buttonBg: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-danger active:scale-95',
          glowColor: 'shadow-red-500/50',
        };
      case 'warning':
        return {
          icon: <WarningIconInline className="w-7 h-7" />,
          iconBg: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
          iconColor: 'text-yellow-900',
          iconRing: 'ring-yellow-500/20',
          buttonBg: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 focus:ring-warning active:scale-95',
          glowColor: 'shadow-yellow-500/50',
        };
      case 'info':
        return {
          icon: <InfoIconInline className="w-7 h-7" />,
          iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
          iconColor: 'text-white',
          iconRing: 'ring-blue-500/20',
          buttonBg: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-info active:scale-95',
          glowColor: 'shadow-blue-500/50',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={titleId} descriptionId={messageId}>
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-5">
          <div
            className={`flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl ${styles.iconBg} ${styles.iconColor} shadow-lg ${styles.glowColor} ring-8 ${styles.iconRing} animate-icon-scale-in`}
          >
            {styles.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h3 id={titleId} className="heading-3 text-content-primary mb-2 leading-tight">
              {title}
            </h3>
            <p id={messageId} className="body-base text-content-secondary leading-relaxed">
              {message}
            </p>
            {children}
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            autoFocus
            className="group inline-flex justify-center items-center rounded-xl border-2 border-edge-strong bg-surface px-5 py-3 label-base text-content-secondary shadow-sm hover:bg-surface-muted hover:border-edge-strong hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-edge/50 active:scale-[0.98] transition-all duration-200 min-h-touch"
            onClick={onClose}
          >
            <span className="group-hover:-translate-x-0.5 transition-transform duration-200">
              {cancelText}
            </span>
          </button>
          <button
            type="button"
            className={`inline-flex justify-center items-center rounded-xl border-2 border-transparent ${styles.buttonBg} px-6 py-3 label-base text-white shadow-lg ${styles.glowColor} focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-200 min-h-touch disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
            disabled={confirmDisabled}
            aria-disabled={confirmDisabled}
            aria-describedby={
              confirmDisabled && confirmDisabledReason ? confirmDisabledReasonId : undefined
            }
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>

        {confirmDisabled && confirmDisabledReason && (
          <p id={confirmDisabledReasonId} className="mt-3 text-xs text-content-muted" aria-live="polite">
            {confirmDisabledReason}
          </p>
        )}
      </div>
    </Modal>
  );
}
