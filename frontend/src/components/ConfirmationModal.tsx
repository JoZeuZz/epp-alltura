import Modal from './Modal';
import { ReactNode } from 'react';
import WarningIcon from './icons/WarningIcon';
import InfoIcon from './icons/InfoIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
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
  children,
}: ConfirmationModalProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <WarningIcon className="w-7 h-7" />,
          iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
          iconColor: 'text-white',
          iconRing: 'ring-red-500/20',
          buttonBg: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500 active:scale-95',
          glowColor: 'shadow-red-500/50',
        };
      case 'warning':
        return {
          icon: <WarningIcon className="w-7 h-7" />,
          iconBg: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
          iconColor: 'text-yellow-900',
          iconRing: 'ring-yellow-500/20',
          buttonBg: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 focus:ring-yellow-500 active:scale-95',
          glowColor: 'shadow-yellow-500/50',
        };
      case 'info':
        return {
          icon: <InfoIcon className="w-7 h-7" />,
          iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
          iconColor: 'text-white',
          iconRing: 'ring-blue-500/20',
          buttonBg: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 active:scale-95',
          glowColor: 'shadow-blue-500/50',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={message}>
      <div className="p-6 sm:p-8">
        <style>{`
          @keyframes scaleIn {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
        
        <div className="flex items-start gap-5">
          {/* Icono con animación */}
          <div 
            className={`flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl ${styles.iconBg} ${styles.iconColor} shadow-lg ${styles.glowColor} ring-8 ${styles.iconRing}`}
            style={{
              animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {styles.icon}
          </div>
          
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
              {title}
            </h3>
            <p className="text-base text-gray-600 leading-relaxed">
              {message}
            </p>
            {children}
          </div>
        </div>

        {/* Botones modernos */}
        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            className="group inline-flex justify-center items-center rounded-xl border-2 border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-gray-300/50 focus:border-gray-400 active:scale-[0.98] transition-all duration-200"
            onClick={onClose}
          >
            <span className="group-hover:-translate-x-0.5 transition-transform duration-200">
              {cancelText}
            </span>
          </button>
          <button
            type="button"
            className={`inline-flex justify-center items-center rounded-xl border-2 border-transparent ${styles.buttonBg} px-6 py-3 text-sm font-bold text-white shadow-lg ${styles.glowColor} focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-200`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
