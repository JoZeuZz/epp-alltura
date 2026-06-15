import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import {
  getPlantillas,
  createArticulosBatch,
  type ArticuloTipo,
  type BatchInstancia,
  type Plantilla,
} from '../../services/apiService';
import { PlantillaCreateModal } from './PlantillaCreateModal';
import { useFormErrors } from '../../hooks/useFormErrors';
import ErrorAlert from '../ui/ErrorAlert';
import FacturaUpload from './FacturaUpload';
import type { FacturaAnalysis } from '../../services/api/facturas';

interface Props {
  tipo: ArticuloTipo;
  bodegas: { id: string; nombre: string }[];
  isOpen: boolean;
  onClose: () => void;
}

interface Row extends BatchInstancia {
  _id: number;
}

let _rowId = 0;
const newRow = (valor = 0, proveedor_id = '', fecha_compra = ''): Row => ({
  _id: ++_rowId, valor, nro_serie: '', fecha_vencimiento: '', proveedor_id, fecha_compra,
});

const TIPO_LABELS: Record<ArticuloTipo, string> = { epp: 'EPP', herramienta: 'Herramienta', equipo: 'Equipo' };

export function ArticuloBatchModal({ tipo, bodegas, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [plantillaId, setPlantillaId] = useState('');
  const [bodegaId, setBodegaId] = useState('');
  const [valorDefault, setValorDefault] = useState(0);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [facturaFile,        setFacturaFile]        = useState<File | null>(null);
  const [analysisResult,     setAnalysisResult]     = useState<FacturaAnalysis | null>(null);
  const [proveedorIdDefault, setProveedorIdDefault] = useState('');
  const [fechaCompraDefault, setFechaCompraDefault] = useState('');
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [showPlantillaCreate, setShowPlantillaCreate] = useState(false);
  const { error, handleError, clearError } = useFormErrors();

  const { data: plantillas = [] } = useQuery<Plantilla[]>({
    queryKey: ['plantillas', tipo],
    queryFn: () => getPlantillas(tipo),
    enabled: isOpen,
  });

  const handleAnalysis = (result: FacturaAnalysis | null) => {
    setAnalysisResult(result);
    if (result) {
      if (result.valor !== null) setValorDefault(result.valor);
      if (result.proveedor_id) setProveedorIdDefault(result.proveedor_id);
      if (result.fecha_compra) setFechaCompraDefault(result.fecha_compra);
      if (result.proveedor_creado) {
        queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      }
    }
  };

  const addRows = useCallback(
    (n: number) => {
      setRows((prev) => [...prev, ...Array.from({ length: n }, () => newRow(valorDefault, proveedorIdDefault, fechaCompraDefault))]);
    },
    [valorDefault, proveedorIdDefault, fechaCompraDefault],
  );

  const updateRow = (id: number, field: keyof Row, value: string | number) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r._id !== id) : prev));
  };

  const mutation = useMutation({
    mutationFn: () =>
      createArticulosBatch(
        {
          plantilla_id: plantillaId,
          bodega_id: bodegaId,
          instancias: rows.map(({ nro_serie, valor, fecha_vencimiento, proveedor_id, fecha_compra }) => ({
            nro_serie: nro_serie || undefined,
            fecha_vencimiento: fecha_vencimiento || undefined,
            fecha_compra: fecha_compra || undefined,
            proveedor_id: proveedor_id || undefined,
            valor: Number(valor) || 0,
          })),
        },
        fotoFile || undefined,
      ),
    onSuccess: (result) => {
      toast.success(`${result.created} ${TIPO_LABELS[tipo]}(s) creados correctamente`);
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      clearError();
      setStep(1);
      setPlantillaId('');
      setBodegaId('');
      setRows([newRow()]);
      setFotoFile(null);
      setFacturaFile(null);
      setAnalysisResult(null);
      setProveedorIdDefault('');
      setFechaCompraDefault('');
      onClose();
    },
    onError: (err: unknown) => {
      handleError(err);
    },
  });

  const fileCls =
    'w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-100 file:text-sm file:cursor-pointer';

  const inputCls =
    'w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Crear ${TIPO_LABELS[tipo]}s en lote`}>
      {/* Advisory banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 mb-4 text-xs text-amber-800">
        <span></span>
        <span>
          <strong>Mejor desde computador.</strong> En celular podés crear las unidades y agregar
          fotos individuales después desde cada artículo.
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {/* Plantilla */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Plantilla *</label>
            <div className="flex gap-2">
              <select
                className={`${inputCls} flex-1`}
                value={plantillaId}
                onChange={(e) => setPlantillaId(e.target.value)}
              >
                <option value="">Seleccione plantilla…</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.marca ? ` — ${p.marca}` : ''}
                    {p.modelo ? ` ${p.modelo}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowPlantillaCreate(true)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 whitespace-nowrap"
              >
                + Nueva
              </button>
            </div>
          </div>

          {/* Bodega */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Bodega inicial *</label>
            <select
              className={inputCls}
              value={bodegaId}
              onChange={(e) => setBodegaId(e.target.value)}
            >
              <option value="">Seleccione bodega…</option>
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Factura + Valor default */}
          <div className="space-y-3">
            <FacturaUpload
              articuloNombre={plantillas.find(p => p.id === plantillaId)?.nombre ?? ''}
              value={facturaFile}
              onChange={setFacturaFile}
              onAnalysis={handleAnalysis}
            />
            {analysisResult?.extractado_ok && (
              <div className="bg-green-50 border border-green-300 rounded-lg px-3 py-2 text-xs text-green-800">
                <strong>✓ Datos extraídos:</strong>{' '}
                {analysisResult.proveedor_nombre && <span>{analysisResult.proveedor_nombre} · </span>}
                {analysisResult.fecha_compra && <span>{analysisResult.fecha_compra} · </span>}
                {analysisResult.valor !== null
                  ? <span>${analysisResult.valor.toLocaleString('es-CL')}</span>
                  : <span className="italic text-green-700">Precio no detectado.</span>
                }
                {analysisResult.proveedor_creado && (
                  <span className="block mt-1 text-green-700">Proveedor nuevo creado en la base de datos.</span>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">
                Valor por defecto (CLP)
              </label>
              <input
                type="number"
                min={0}
                className={`${inputCls} ${analysisResult?.valor !== null && analysisResult?.valor !== undefined ? 'border-green-400' : ''}`}
                value={valorDefault}
                onChange={(e) => setValorDefault(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Foto compartida */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">
              Foto de referencia <span className="text-xs text-gray-400">(opcional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
              className={fileCls}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-content-secondary bg-surface-overlay rounded-md hover:bg-edge"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!plantillaId || !bodegaId}
              onClick={() => {
                setRows([newRow(valorDefault, proveedorIdDefault, fechaCompraDefault)]);
                setStep(2);
              }}
              className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50"
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              <strong>{rows.length}</strong> unidad{rows.length !== 1 ? 'es' : ''} —{' '}
              {TIPO_LABELS[tipo]}
            </p>
            <div className="flex gap-2">
              {[1, 10, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => addRows(n)}
                  className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                >
                  +{n}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left border-b border-gray-200 font-medium w-8">#</th>
                  <th className="px-2 py-2 text-left border-b border-gray-200 font-medium">
                    N° Serie <span className="text-gray-400 font-normal">(opc.)</span>
                  </th>
                  <th className="px-2 py-2 text-left border-b border-gray-200 font-medium w-28">Valor</th>
                  <th className="px-2 py-2 text-left border-b border-gray-200 font-medium w-36">
                    Vencimiento <span className="text-gray-400 font-normal">(opc.)</span>
                  </th>
                  <th className="px-2 py-2 w-8 border-b border-gray-200"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row._id} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
                    <td className="px-2 py-1 text-gray-400 border-b border-gray-100">{idx + 1}</td>
                    <td className="px-2 py-1 border-b border-gray-100">
                      <input
                        className="w-full border-none bg-transparent outline-none text-xs"
                        placeholder="Ej: MSA-001"
                        value={row.nro_serie ?? ''}
                        onChange={(e) => updateRow(row._id, 'nro_serie', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1 border-b border-gray-100">
                      <input
                        type="number"
                        min={0}
                        className="w-full border-none bg-transparent outline-none text-xs"
                        value={row.valor}
                        onChange={(e) => updateRow(row._id, 'valor', Number(e.target.value))}
                      />
                    </td>
                    <td className="px-2 py-1 border-b border-gray-100">
                      <input
                        type="date"
                        className="w-full border-none bg-transparent outline-none text-xs"
                        value={row.fecha_vencimiento ?? ''}
                        onChange={(e) => updateRow(row._id, 'fecha_vencimiento', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1 border-b border-gray-100 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row._id)}
                        className="text-red-400 hover:text-red-600 text-sm leading-none"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ErrorAlert message={error} className="mb-3" />

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm text-content-secondary bg-surface-overlay rounded-md hover:bg-edge"
            >
              ← Volver
            </button>
            <button
              type="button"
              disabled={mutation.isPending || rows.length === 0}
              onClick={() => mutation.mutate()}
              className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50"
            >
              {mutation.isPending
                ? 'Creando…'
                : `Crear ${rows.length} ${TIPO_LABELS[tipo]}${rows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Nested PlantillaCreateModal */}
      {showPlantillaCreate && (
        <PlantillaCreateModal
          isOpen={showPlantillaCreate}
          defaultTipo={tipo}
          onClose={() => setShowPlantillaCreate(false)}
          onCreated={(p) => {
            queryClient.invalidateQueries({ queryKey: ['plantillas'] });
            setPlantillaId(p.id);
            setShowPlantillaCreate(false);
          }}
        />
      )}
    </Modal>
  );
}
