import { useState } from 'react';

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
