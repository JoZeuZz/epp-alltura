import { ReactNode, useEffect, useId, useRef } from 'react';
import FocusTrap from 'focus-trap-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  /** External element id for aria-labelledby — skips rendering internal <h2> */
  titleId?: string;
  /** External element id for aria-describedby — skips rendering internal sr-only <p> */
  descriptionId?: string;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  titleId: externalTitleId,
  descriptionId: externalDescId,
}: ModalProps) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const dialogPanelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const internalTitleId = useId();
  const internalDescId = useId();
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

  const effectiveTitleId = externalTitleId ?? (title ? internalTitleId : undefined);
  const effectiveDescId  = externalDescId  ?? (description ? internalDescId : undefined);
  const showInternalTitle = title && !externalTitleId;

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: () => {
          const panel = dialogPanelRef.current;
          if (!panel) return closeButtonRef.current ?? document.body;
          // Respect explicit autofocus attribute (e.g. cancel button in ConfirmationModal)
          const autoFocused = panel.querySelector<HTMLElement>('[autofocus]');
          if (autoFocused) return autoFocused;
          // First focusable form field for form-type modals
          const firstField = panel.querySelector<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
          );
          return firstField ?? closeButtonRef.current ?? document.body;
        },
        fallbackFocus: () => dialogPanelRef.current ?? document.body,
        clickOutsideDeactivates: false,
        escapeDeactivates: false,
        returnFocusOnDeactivate: false,
      }}
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-backdrop-in"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogPanelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={effectiveTitleId}
          aria-describedby={effectiveDescId}
          className="bg-surface p-4 sm:p-6 md:p-8 rounded-2xl shadow-modal w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto animate-modal-in"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <div className={`flex items-center mb-2 ${showInternalTitle ? 'justify-between' : 'justify-end'}`}>
            {showInternalTitle && (
              <h2 id={internalTitleId} className="heading-4 text-content-primary">
                {title}
              </h2>
            )}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-content-disabled hover:text-content-secondary hover:bg-surface-overlay transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex-shrink-0"
              aria-label="Cerrar"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {description && !externalDescId && (
            <p id={internalDescId} className="sr-only">{description}</p>
          )}
          {children}
        </div>
      </div>
    </FocusTrap>
  );
}
