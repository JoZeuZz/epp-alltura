import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import ProveedorCreateModal from './ProveedorCreateModal';
import FotoEvidenciaUpload from './FotoEvidenciaUpload';
import FacturaUpload from './FacturaUpload';
import type { FacturaAnalysis } from '../../services/api/facturas';
import {
  updateArticulo,
  addCertificacion,
  deleteCertificacion,
  getProveedores,
  type Articulo,
  type ArticuloEspecialidad,
  type ArticuloCertificacion,
  type Proveedor,
} from '../../services/apiService';
import { useFormErrors } from '../../hooks/useFormErrors';
import ErrorAlert from '../ui/ErrorAlert';

const ESPECIALIDADES = ['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'] as const;
const ESP_LABELS: Record<string, string> = {
  oocc: 'OOCC',
  ooee: 'OOEE',
  equipos: 'Equipos',
  trabajos_verticales_lineas_de_vida: 'Trabajos Verticales / Líneas de Vida',
};

interface Props {
  activo: Articulo;
  onClose: () => void;
  onSuccess: () => void;
}

const fileCls = 'w-full text-sm text-content-secondary file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-surface-overlay file:text-sm file:cursor-pointer';

const EditarActivoModal: React.FC<Props> = ({ activo, onClose, onSuccess }) => {
  const queryClient = useQueryClient();

  const [nombre,      setNombre]      = useState(activo.nombre ?? '');
  const [marca,       setMarca]       = useState(activo.marca ?? '');
  const [modelo,      setModelo]      = useState(activo.modelo ?? '');
  const [descripcion, setDescripcion] = useState(activo.descripcion ?? '');

  const [fechaCompra,  setFechaCompra]  = useState(activo.fecha_compra?.slice(0, 10) ?? '');
  const [proveedorId,  setProveedorId]  = useState(activo.proveedor_id ?? '');
  const [valor,        setValor]        = useState(activo.valor != null ? String(activo.valor) : '');
  const [facturaFile,  setFacturaFile]  = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FacturaAnalysis | null>(null);

  const [manualTab,  setManualTab]  = useState<'file' | 'url'>('url');
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualUrl,  setManualUrl]  = useState(activo.manual_url ?? '');
  const [newCertFile, setNewCertFile] = useState<File | null>(null);
  const [newCertName, setNewCertName] = useState('');

  const [fechaVencimiento, setFechaVencimiento] = useState(
    activo.fecha_vencimiento ? activo.fecha_vencimiento.slice(0, 10) : ''
  );
  const [hasVencimiento, setHasVencimiento] = useState(!!activo.fecha_vencimiento);
  const [especialidades, setEspecialidades] = useState<ArticuloEspecialidad[]>(
    activo.especialidades ?? []
  );

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [nroSerie, setNroSerie] = useState(activo.nro_serie ?? '');
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const { error, handleError, clearError } = useFormErrors();

  const { data: proveedores = [] } = useQuery<Proveedor[]>({
    queryKey: ['proveedores'],
    queryFn: getProveedores,
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const files = {
        ...(fotoFile    ? { foto: fotoFile }      : {}),
        ...(facturaFile ? { factura: facturaFile } : {}),
        ...(manualFile && manualTab === 'file' ? { manual: manualFile } : {}),
      };
      return updateArticulo(
        {
          id:                activo.id,
          nombre:            nombre.trim()      || undefined,
          marca:             marca.trim()       || undefined,
          modelo:            modelo.trim()      || undefined,
          descripcion:       descripcion.trim() || undefined,
          nro_serie:         nroSerie.trim()    || undefined,
          valor:             valor.trim() ? parseInt(valor, 10) : undefined,
          fecha_vencimiento: hasVencimiento ? fechaVencimiento || null : null,
          fecha_compra:      fechaCompra     || null,
          proveedor_id:      proveedorId     || null,
          manual_url:        manualTab === 'url' ? (manualUrl.trim() || null) : undefined,
          especialidades,
        },
        files
      );
    },
    onSuccess: () => {
      toast.success('Artículo actualizado correctamente.');
      clearError();
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      queryClient.invalidateQueries({ queryKey: ['activo-profile'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-activos'] });
      onSuccess();
    },
    onError: (err: unknown) => { handleError(err); },
  });

  const addCertMutation = useMutation({
    mutationFn: () => {
      if (!newCertFile) throw new Error('Selecciona un archivo PDF');
      return addCertificacion(activo.id, newCertFile, newCertName.trim() || undefined);
    },
    onSuccess: () => {
      toast.success('Certificación agregada.');
      setNewCertFile(null); setNewCertName('');
      queryClient.invalidateQueries({ queryKey: ['activo-profile', activo.id] });
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      onSuccess();
    },
    onError: (err: unknown) => { handleError(err); },
  });

  const deleteCertMutation = useMutation({
    mutationFn: (certId: string) => deleteCertificacion(activo.id, certId),
    onSuccess: () => {
      toast.success('Certificación eliminada.');
      queryClient.invalidateQueries({ queryKey: ['activo-profile', activo.id] });
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      onSuccess();
    },
    onError: (err: unknown) => { handleError(err); },
  });

  const toggleEsp = (esp: ArticuloEspecialidad) => {
    setEspecialidades(prev =>
      prev.includes(esp) ? prev.filter(e => e !== esp) : [...prev, esp]
    );
  };

  const handleAnalysis = (result: FacturaAnalysis | null) => {
    setAnalysisResult(result);
    if (result) {
      if (result.proveedor_id) setProveedorId(result.proveedor_id);
      if (result.fecha_compra) setFechaCompra(result.fecha_compra);
      if (result.valor !== null) setValor(String(result.valor));
      if (result.proveedor_creado) {
        queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      }
    }
  };

  const inputCls = 'w-full rounded-md border border-edge px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none';
  const sectionCls = 'space-y-3';
  const labelCls = 'block text-sm font-medium text-content-secondary mb-1';
  const sectionTitleCls = 'text-xs font-semibold text-content-muted uppercase tracking-wide border-b border-edge pb-2';

  const certs = (activo.certificaciones ?? []) as ArticuloCertificacion[];

  return (
    <Modal isOpen onClose={onClose} title={`Editar — ${activo.codigo}`} mobileFullscreen>
      <div className="space-y-6">

        {/* IDENTIFICACIÓN */}
        <section className={sectionCls}>
          <h4 className={sectionTitleCls}>Identificación</h4>
          <div>
            <label className={labelCls}>Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Marca</label>
              <input value={marca} onChange={e => setMarca(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Modelo</label>
              <input value={modelo} onChange={e => setModelo(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>N° de Serie</label>
            <input
              value={nroSerie}
              onChange={e => setNroSerie(e.target.value)}
              className={inputCls}
              placeholder="Ej: MSA-VGARD-001"
            />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
              rows={2} className={inputCls} />
          </div>
        </section>

        {/* COMPRA */}
        <section className={sectionCls}>
          <h4 className={sectionTitleCls}>Compra</h4>

          <FacturaUpload
            articuloNombre={nombre}
            value={facturaFile}
            onChange={setFacturaFile}
            onAnalysis={handleAnalysis}
            existingUrl={activo.factura_url ?? undefined}
          />

          {analysisResult?.extractado_ok && (
            <div className="bg-green-50 border border-green-300 rounded-lg px-3 py-2 text-xs text-green-800 leading-relaxed">
              <strong>✓ Datos extraídos de la factura:</strong>{' '}
              {analysisResult.proveedor_nombre && <span>{analysisResult.proveedor_nombre} · </span>}
              {analysisResult.fecha_compra && <span>{analysisResult.fecha_compra} · </span>}
              {analysisResult.valor !== null
                ? <span>${analysisResult.valor.toLocaleString('es-CL')}</span>
                : <span className="italic text-green-700">Precio no detectado — completá el valor manualmente.</span>
              }
              {analysisResult.proveedor_creado && (
                <span className="block mt-1 text-green-700">Proveedor nuevo creado en la base de datos.</span>
              )}
              <span className="block mt-1 text-green-600 italic">Podés editar los campos si algo no es correcto.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha de compra</label>
              <input
                type="date"
                value={fechaCompra}
                onChange={e => setFechaCompra(e.target.value)}
                className={`${inputCls} ${analysisResult?.fecha_compra ? 'border-green-400' : ''}`}
              />
            </div>
            <div>
              <label className={labelCls}>Valor (CLP)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={valor}
                onChange={e => setValor(e.target.value)}
                className={`${inputCls} ${analysisResult?.valor !== null && analysisResult?.valor !== undefined ? 'border-green-400' : ''}`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Proveedor</label>
            <div className="flex gap-2">
              <select
                value={proveedorId}
                onChange={e => setProveedorId(e.target.value)}
                className={`${inputCls} flex-1 ${analysisResult?.proveedor_id ? 'border-green-400' : ''}`}
              >
                <option value="">Sin proveedor</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowProveedorModal(true)}
                className="px-3 py-2 text-xs border border-edge rounded-md text-content-secondary hover:bg-surface-muted whitespace-nowrap">
                + Nuevo
              </button>
            </div>
          </div>
        </section>

        {/* DOCUMENTOS */}
        <section className={sectionCls}>
          <h4 className={sectionTitleCls}>Documentos</h4>

          <div>
            <label className={labelCls}>Manual / Ficha técnica</label>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setManualTab('url')}
                className={`px-3 py-1 text-xs rounded border transition-colors ${manualTab === 'url' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-surface border-edge text-content-secondary'}`}>
                Link URL
              </button>
              <button type="button" onClick={() => setManualTab('file')}
                className={`px-3 py-1 text-xs rounded border transition-colors ${manualTab === 'file' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-surface border-edge text-content-secondary'}`}>
                Subir PDF
              </button>
            </div>
            {manualTab === 'url' ? (
              <input type="url" value={manualUrl} onChange={e => setManualUrl(e.target.value)}
                className={inputCls} placeholder="https://..." />
            ) : (
              <>
                {activo.manual_url && (
                  <a href={activo.manual_url} target="_blank" rel="noopener noreferrer"
                    className="block text-xs text-primary-blue hover:underline mb-1">
                    ↓ Ver manual actual
                  </a>
                )}
                <input type="file" accept=".pdf,application/pdf"
                  onChange={e => setManualFile(e.target.files?.[0] ?? null)}
                  className={fileCls} />
              </>
            )}
          </div>

          <div>
            <label className={labelCls}>
              Certificaciones
              <span className="ml-1 text-xs font-normal text-content-muted">
                ({certs.length}/5)
              </span>
            </label>
            {certs.length > 0 && (
              <ul className="space-y-1 mb-3">
                {certs.map(cert => (
                  <li key={cert.id} className="flex items-center justify-between text-xs bg-surface-muted px-2 py-1.5 rounded">
                    <a href={cert.url} target="_blank" rel="noopener noreferrer"
                      className="text-primary-blue hover:underline truncate">
                      {cert.nombre || 'Certificación'}
                    </a>
                    <button type="button"
                      onClick={() => deleteCertMutation.mutate(cert.id)}
                      disabled={deleteCertMutation.isPending}
                      className="ml-2 text-danger hover:text-danger-text disabled:opacity-50">✕</button>
                  </li>
                ))}
              </ul>
            )}
            {certs.length < 5 && (
              <div className="space-y-2 border border-edge rounded-md p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nombre (ej: Certificado EN361)"
                    value={newCertName} onChange={e => setNewCertName(e.target.value)}
                    className={inputCls} />
                  <input type="file" accept=".pdf,application/pdf"
                    onChange={e => setNewCertFile(e.target.files?.[0] ?? null)}
                    className={fileCls} />
                </div>
                <button type="button"
                  onClick={() => addCertMutation.mutate()}
                  disabled={!newCertFile || addCertMutation.isPending}
                  className="px-3 py-1.5 text-sm text-white bg-primary-blue rounded-md hover:bg-dark-blue disabled:opacity-50">
                  {addCertMutation.isPending ? 'Subiendo...' : '+ Agregar certificación'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* VIGENCIA */}
        <section className={sectionCls}>
          <h4 className={sectionTitleCls}>Vigencia</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasVencimiento}
                onChange={() => {
                  setHasVencimiento(v => {
                    if (v) setFechaVencimiento('');
                    return !v;
                  });
                }}
                className="rounded border-edge text-primary-blue focus:ring-primary-blue"
              />
              <span className="text-sm font-medium text-content-secondary">¿Tiene fecha de vencimiento?</span>
            </label>
            {hasVencimiento && (
              <input
                type="date"
                value={fechaVencimiento}
                onChange={e => setFechaVencimiento(e.target.value)}
                className={inputCls}
                aria-label="Fecha de vencimiento"
              />
            )}
          </div>
          <div>
            <label className={labelCls}>Especialidades</label>
            <div className="flex flex-wrap gap-2">
              {ESPECIALIDADES.map(esp => (
                <button key={esp} type="button" onClick={() => toggleEsp(esp as ArticuloEspecialidad)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    especialidades.includes(esp as ArticuloEspecialidad)
                      ? 'bg-primary-blue text-white border-primary-blue'
                      : 'bg-surface text-content-secondary border-edge hover:border-primary-blue'
                  }`}>
                  {ESP_LABELS[esp]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* FOTO */}
        <section className={sectionCls}>
          <h4 className={sectionTitleCls}>Foto</h4>
          <FotoEvidenciaUpload
            value={fotoFile}
            onChange={setFotoFile}
            required={false}
          />
        </section>

        <ErrorAlert message={error} className="mb-3" />

        <div className="flex justify-end gap-2 pt-2 border-t border-edge">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-content-secondary bg-surface-overlay rounded-md hover:bg-edge">
            Cancelar
          </button>
          <button type="button" onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm text-white bg-primary-blue rounded-md hover:bg-dark-blue disabled:opacity-50">
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {showProveedorModal && (
        <ProveedorCreateModal
          isOpen
          onClose={() => setShowProveedorModal(false)}
          onCreated={(prov) => {
            setProveedorId(prov.id);
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            setShowProveedorModal(false);
          }}
        />
      )}
    </Modal>
  );
};

export default EditarActivoModal;
