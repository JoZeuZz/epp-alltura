import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../Modal';
import { getReturnEligibleAssets, type ReturnEligibleAssetRow } from '../../services/apiService';

interface TrabajadorOption {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  cargo?: string | null;
}

interface AlertaBadge {
  trabajador_id: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trabajadores: TrabajadorOption[];
  alertas: AlertaBadge[];
  /** Called when user confirms custodias to return; parent sequences DevolucionActivoModal */
  onConfirm: (trabajador: TrabajadorOption, custodias: ReturnEligibleAssetRow[]) => void;
}

type Step = 1 | 2;

const DevolucionRapidaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  trabajadores,
  alertas,
  onConfirm,
}) => {
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const [selectedTrabajador, setSelectedTrabajador] = useState<TrabajadorOption | null>(null);
  const [selectedCustodiaIds, setSelectedCustodiaIds] = useState<Set<string>>(new Set());

  const { data: custodias = [], isFetching: loadingCustodias } = useQuery({
    queryKey: ['return-eligible', selectedTrabajador?.id],
    queryFn: () => getReturnEligibleAssets({ trabajador_id: selectedTrabajador!.id }),
    enabled: step === 2 && Boolean(selectedTrabajador),
  });

  const alertaWorkerIds = new Set(alertas.map((a) => a.trabajador_id));

  const filteredTrabajadores = trabajadores.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.nombres.toLowerCase().includes(q) ||
      t.apellidos.toLowerCase().includes(q) ||
      t.rut.toLowerCase().includes(q)
    );
  });

  const sortedCustodias = [...custodias].sort((a, b) => {
    return new Date(a.desde_en).getTime() - new Date(b.desde_en).getTime();
  });

  const toggleCustodia = (id: string) => {
    setSelectedCustodiaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setStep(1);
    setSearch('');
    setSelectedTrabajador(null);
    setSelectedCustodiaIds(new Set());
    onClose();
  };

  const handleSelectTrabajador = (t: TrabajadorOption) => {
    setSelectedTrabajador(t);
    setSelectedCustodiaIds(new Set());
    setStep(2);
  };

  const handleConfirm = () => {
    if (!selectedTrabajador) return;
    const selected = sortedCustodias.filter((c) => selectedCustodiaIds.has(c.custodia_id));
    if (!selected.length) return;
    onConfirm(selectedTrabajador, selected);
    handleClose();
  };

  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch {
      return d;
    }
  };

  const title = step === 1 ? 'Nueva Devolución' : `Devolución — ${selectedTrabajador?.nombres} ${selectedTrabajador?.apellidos}`;
  const subtitle = step === 1 ? 'Paso 1 de 2 — Seleccionar trabajador' : `Paso 2 de 2 — Seleccionar custodias a devolver`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      {/* Subtitle / step label */}
      <p className="text-xs text-content-muted mb-3">{subtitle}</p>

      {/* Step indicator */}
      <div className="flex gap-1.5 mb-5">
        <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-edge'}`} />
        <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-edge'}`} />
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Buscar por nombre o RUT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
          />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {filteredTrabajadores.length === 0 && (
              <p className="text-sm text-content-muted text-center py-6">Sin resultados</p>
            )}
            {filteredTrabajadores.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTrabajador(t)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-content-primary truncate">
                    {t.nombres} {t.apellidos}
                  </p>
                  <p className="text-xs text-content-muted">{t.rut}{t.cargo ? ` · ${t.cargo}` : ''}</p>
                </div>
                {alertaWorkerIds.has(t.id) && (
                  <span className="flex-shrink-0 text-xs font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                    alerta
                  </span>
                )}
                <svg className="w-4 h-4 text-content-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {loadingCustodias && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loadingCustodias && sortedCustodias.length === 0 && (
            <p className="text-sm text-content-muted text-center py-6">
              Este trabajador no tiene custodias activas.
            </p>
          )}
          {!loadingCustodias && sortedCustodias.map((c) => {
            const checked = selectedCustodiaIds.has(c.custodia_id);
            return (
              <button
                key={c.custodia_id}
                type="button"
                onClick={() => toggleCustodia(c.custodia_id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  checked
                    ? 'border-primary bg-primary/5'
                    : 'border-edge hover:bg-surface-muted'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                    checked ? 'bg-primary border-primary' : 'border-edge'
                  }`}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-content-primary truncate">{c.codigo} — {c.nombre}</p>
                  <p className="text-xs text-content-muted">desde {fmtDate(c.desde_en)}</p>
                </div>
              </button>
            );
          })}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 border border-edge rounded-lg px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-muted transition-colors"
            >
              ← Volver
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCustodiaIds.size === 0}
              className="flex-1 bg-primary text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Devolver {selectedCustodiaIds.size > 0 ? `${selectedCustodiaIds.size} seleccionado${selectedCustodiaIds.size > 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DevolucionRapidaModal;
