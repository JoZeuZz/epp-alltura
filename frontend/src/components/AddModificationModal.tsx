import { useState } from 'react';
import type { CreateScaffoldModificationDTO } from '../types/scaffoldModifications';

interface AddModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateScaffoldModificationDTO) => Promise<void>;
  scaffoldCubicMeters: number;
  currentModificationsCount: number;
}

export default function AddModificationModal({
  isOpen,
  onClose,
  onSubmit,
  scaffoldCubicMeters,
  currentModificationsCount,
}: AddModificationModalProps) {
  const [formData, setFormData] = useState({
    height: '',
    width: '',
    length: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatedCubicMeters = 
    formData.height && formData.width && formData.length
      ? parseFloat(formData.height) * parseFloat(formData.width) * parseFloat(formData.length)
      : 0;

  const requiresApproval = calculatedCubicMeters > scaffoldCubicMeters;
  const isLimitReached = currentModificationsCount >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLimitReached) {
      setError('Se ha alcanzado el límite de 5 modificaciones para este andamio');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        height: parseFloat(formData.height),
        width: parseFloat(formData.width),
        length: parseFloat(formData.length),
        reason: formData.reason || undefined,
      });
      
      // Limpiar y cerrar
      setFormData({ height: '', width: '', length: '', reason: '' });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear modificación');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ height: '', width: '', length: '', reason: '' });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Agregar Metros Cúbicos Adicionales
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Dimensiones */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alto (m) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ancho (m) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Largo (m) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Preview de metros cúbicos */}
            {calculatedCubicMeters > 0 && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Metros cúbicos a agregar:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {calculatedCubicMeters.toFixed(2)} m³
                  </span>
                </div>
                
                {requiresApproval && (
                  <div className="flex items-start gap-2 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Requiere aprobación de administrador</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Esta modificación ({calculatedCubicMeters.toFixed(2)} m³) es mayor que el andamio original ({scaffoldCubicMeters.toFixed(2)} m³).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Motivo */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo (opcional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Ej: Ampliación del área de trabajo solicitada por el cliente..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.reason.length}/500 caracteres
              </p>
            </div>

            {/* Contador de modificaciones */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  Modificaciones permitidas:
                </span>
                <span className={`text-lg font-bold ${isLimitReached ? 'text-red-600' : 'text-blue-600'}`}>
                  {currentModificationsCount}/5
                </span>
              </div>
              {isLimitReached && (
                <p className="text-xs text-red-600 mt-2">
                  Se ha alcanzado el límite máximo de modificaciones para este andamio
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || isLimitReached || calculatedCubicMeters === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creando...' : 'Agregar Modificación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
