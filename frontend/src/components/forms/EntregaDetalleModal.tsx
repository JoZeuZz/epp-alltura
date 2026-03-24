import React from 'react';
import Modal from '../Modal';
import type { EntregaRow, EntregaEstado, EntregaTipo, CondicionSalida } from '../../services/apiService';
import { formatQuantityInteger } from '../../utils/quantity';

interface EntregaDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  entrega: EntregaRow | null;
}

const ESTADO_LABELS: Record<EntregaEstado, string> = {
  borrador: 'Borrador',
  pendiente_firma: 'Pendiente firma',
  en_transito: 'En tránsito',
  recibido: 'Recibido',
  confirmada: 'Confirmada',
  anulada: 'Anulada',
  revertida_admin: 'Revertida',
};

const ESTADO_CLASSES: Record<EntregaEstado, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  pendiente_firma: 'bg-yellow-100 text-yellow-800',
  en_transito: 'bg-indigo-100 text-indigo-800',
  recibido: 'bg-teal-100 text-teal-800',
  confirmada: 'bg-green-100 text-green-800',
  anulada: 'bg-red-100 text-red-700',
  revertida_admin: 'bg-slate-200 text-slate-700',
};

const TIPO_LABELS: Record<EntregaTipo, string> = {
  entrega: 'Entrega',
  prestamo: 'Entrega',
  traslado: 'Traslado',
};

const CONDICION_LABELS: Record<CondicionSalida, string> = {
  ok: 'OK',
  usado: 'Usado',
  danado: 'Dañado',
};

const CONDICION_CLASSES: Record<CondicionSalida, string> = {
  ok: 'bg-green-100 text-green-700',
  usado: 'bg-yellow-100 text-yellow-700',
  danado: 'bg-red-100 text-red-700',
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const EntregaDetalleModal: React.FC<EntregaDetalleModalProps> = ({
  isOpen,
  onClose,
  entrega,
}) => {
  if (!entrega) return null;

  const estado = entrega.estado as EntregaEstado;
  const tipo = entrega.tipo as EntregaTipo;
  const trabajadorNombre =
    entrega.nombres && entrega.apellidos
      ? `${entrega.nombres} ${entrega.apellidos}`
      : '—';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de entrega">
      {/* Encabezado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Trabajador</p>
          <p className="text-sm text-gray-900">{trabajadorNombre}</p>
          {entrega.rut && <p className="text-xs text-gray-500">RUT {entrega.rut}</p>}
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estado</p>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_CLASSES[estado] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {ESTADO_LABELS[estado] ?? estado}
          </span>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo</p>
          <p className="text-sm text-gray-900">{TIPO_LABELS[tipo] ?? tipo}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Creado el
          </p>
          <p className="text-sm text-gray-900">{formatDate(entrega.creado_en)}</p>
        </div>

        {entrega.confirmada_en && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Confirmado el
            </p>
            <p className="text-sm text-gray-900">{formatDate(entrega.confirmada_en)}</p>
          </div>
        )}

        {entrega.nota_destino && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nota</p>
            <p className="text-sm text-gray-700">{entrega.nota_destino}</p>
          </div>
        )}
      </div>

      {/* Tabla de artículos */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Artículos</h3>
        {entrega.detalles && entrega.detalles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Artículo</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cant.</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cond.</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lote / Activo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {entrega.detalles.map((d) => {
                  const cond = d.condicion_salida as CondicionSalida;
                  return (
                    <tr key={d.id}>
                      <td className="px-3 py-2 text-gray-900">{d.articulo_nombre ?? `#${d.articulo_id}`}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{formatQuantityInteger(d.cantidad)}</td>
                      <td className="px-3 py-2">
                        {cond ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CONDICION_CLASSES[cond] ?? ''}`}
                          >
                            {CONDICION_LABELS[cond] ?? cond}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {d.codigo_lote ?? d.activo_codigo ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{d.notas ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Sin artículos registrados.</p>
        )}
      </div>

      {/* Firma (visible cuando el flujo ya fue cerrado) */}
      {(estado === 'confirmada' || estado === 'recibido') && (
        <div className="border-t pt-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Firma de recepción</h3>
          {entrega.firma_imagen_url ? (
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <img
                src={entrega.firma_imagen_url}
                alt="Firma del trabajador"
                className="border border-gray-200 rounded-lg max-h-32 bg-white"
              />
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Firmado el:</span>{' '}
                  {formatDate(entrega.firmado_en)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Firma no disponible.</p>
          )}
        </div>
      )}

      {/* Botón cerrar */}
      <div className="mt-5">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
};

export default EntregaDetalleModal;
