import { ReactNode, useEffect, useRef } from 'react';
import FocusTrap from 'focus-trap-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function Modal({ isOpen, onClose, children, title, description }: ModalProps) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).substr(2, 9)}`);
  const descId = useRef(`modal-desc-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Guardar el elemento activo antes de abrir el modal
      previousActiveElement.current = document.activeElement as HTMLElement;
      window.addEventListener('keydown', handleEsc);
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
      
      // Restaurar foco al cerrar
      if (!isOpen && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <FocusTrap>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        aria-describedby={description ? descId.current : undefined}
        style={{
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
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
        
        <div
          className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          style={{
            animation: 'modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="flex justify-end mb-2">
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 text-2xl leading-none transition-all duration-200 active:scale-95"
              aria-label="Cerrar modal"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div>
            {title && <h2 id={titleId.current} className="sr-only">{title}</h2>}
            {description && <p id={descId.current} className="sr-only">{description}</p>}
            {children}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
