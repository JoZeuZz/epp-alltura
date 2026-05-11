import React from 'react';

interface Props {
  onClose: () => void;
}

const TourDemoActivoModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-[1050] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Demo perfil de activo"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full sm:max-w-2xl bg-surface rounded-t-2xl sm:rounded-2xl shadow-modal flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-edge">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="label-base font-mono text-content-primary">EPP-DEMO-001</span>
              <span className="badge badge-success">disponible</span>
              <span className="text-xs text-content-disabled italic">(demo)</span>
            </div>
            <p className="heading-4 text-content-primary">Casco de Seguridad</p>
            <p className="body-small text-content-muted">Nº serie: SN-2024-0001</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-content-disabled hover:text-content-secondary shrink-0 p-1"
            aria-label="Cerrar demo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Info grid */}
          <section className="grid grid-cols-2 gap-3">
            <InfoField label="Ubicación" value="Bodega Central" />
            <InfoField label="Custodio" value="Sin asignar" />
            <InfoField label="Valor" value="$45.000" />
            <InfoField label="Vencimiento" value="31/12/2025" />
          </section>

          {/* Actions */}
          <section className="space-y-2">
            <p className="label-sm text-content-muted uppercase tracking-wide">Acciones disponibles</p>
            <div className="flex flex-wrap gap-2">
              <DemoButton label="Entregar" variant="primary" />
              <DemoButton label="Cambiar Estado" />
              <DemoButton label="Reubicar" />
              <DemoButton label="Descargar Ficha PDF" />
            </div>
            <p className="body-small text-content-muted italic">
              En un activo real cada acción abre un flujo guiado con firma digital.
            </p>
          </section>

          {/* History */}
          <section className="space-y-2">
            <p className="label-sm text-content-muted uppercase tracking-wide">Historial de movimientos</p>
            <div className="border border-edge rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted">
                  <tr>
                    <th className="text-left px-3 py-2 body-small text-content-muted font-semibold">Fecha</th>
                    <th className="text-left px-3 py-2 body-small text-content-muted font-semibold">Tipo</th>
                    <th className="text-left px-3 py-2 body-small text-content-muted font-semibold">Destino</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  <tr>
                    <td className="px-3 py-2 text-content-secondary">15/04/2025 09:12</td>
                    <td className="px-3 py-2"><span className="badge badge-warning">asignacion</span></td>
                    <td className="px-3 py-2 text-content-secondary">Juan Pérez — Proy. Norte</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-content-secondary">10/03/2025 14:30</td>
                    <td className="px-3 py-2"><span className="badge badge-success">ingreso</span></td>
                    <td className="px-3 py-2 text-content-secondary">Bodega Central</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-edge">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-white body-base font-semibold hover:bg-primary-hover transition-colors"
          >
            Entendido — continuar guía →
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-surface-muted rounded-lg p-3">
    <p className="label-sm text-content-muted">{label}</p>
    <p className="body-base text-content-primary mt-0.5">{value}</p>
  </div>
);

const DemoButton: React.FC<{ label: string; variant?: 'primary' }> = ({ label, variant }) => (
  <button
    type="button"
    disabled
    title="Disponible en activos reales"
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors opacity-60 cursor-not-allowed ${
      variant === 'primary'
        ? 'bg-primary text-white'
        : 'border border-edge text-content-secondary bg-surface'
    }`}
  >
    {label}
  </button>
);

export default TourDemoActivoModal;
