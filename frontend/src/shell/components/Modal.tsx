import { ReactNode, useEffect, useId, useRef } from 'react';
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
  const dialogContainerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';

      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: () => closeButtonRef.current ?? dialogContainerRef.current ?? document.body,
        fallbackFocus: () => dialogContainerRef.current ?? document.body,
        clickOutsideDeactivates: false,
        escapeDeactivates: false,
        returnFocusOnDeactivate: false,
      }}
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
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
          ref={dialogContainerRef}
          className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          role="document"
          tabIndex={-1}
          style={{
            animation: 'modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="flex justify-end mb-2">
            <button
              ref={closeButtonRef}
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 text-2xl leading-none transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2"
              aria-label="Cerrar modal"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div>
            {title && <h2 id={titleId} className="sr-only">{title}</h2>}
            {description && <p id={descId} className="sr-only">{description}</p>}
            {children}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
