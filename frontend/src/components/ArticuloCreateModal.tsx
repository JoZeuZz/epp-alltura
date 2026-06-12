import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@jozeuzz/alltura-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  createArticulo,
  addCertificacion,
  getProveedores,
  getPlantillas,
  getPlantilla,
  type Articulo,
  type ArticuloTipo,
  type Proveedor,
  type ArticleFiles,
  type Plantilla,
  type PlantillaWithCount,
} from '../services/apiService';
import ProveedorCreateModal from './forms/ProveedorCreateModal';
import FotoEvidenciaUpload from './forms/FotoEvidenciaUpload';
import { PlantillaCreateModal, PlantillaEditModal } from './forms';
import { useFormErrors } from '../hooks/useFormErrors';
import ErrorAlert from './ui/ErrorAlert';

const ESPECIALIDADES = ['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'] as const;

const schema = z.object({
  nombre:            z.string().min(2, 'Mínimo 2 caracteres').max(150),
  marca:             z.string().optional(),
  modelo:            z.string().optional(),
  descripcion:       z.string().optional(),
  nro_serie:         z.string().max(120).optional(),
  valor:             z.string().transform((v, ctx) => {
    const n = Number(v);
    if (v === '' || isNaN(n) || !Number.isInteger(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Valor mínimo 0' });
      return z.NEVER;
    }
    return n;
  }),
  bodega_id:         z.string().min(1, 'Seleccione una bodega'),
  especialidades:    z.array(z.enum(ESPECIALIDADES)).optional(),
  fecha_vencimiento: z.string().optional(),
  fecha_compra:      z.string().optional(),
  proveedor_id:      z.string().optional(),
  manual_url:        z.string().url('URL inválida').optional().or(z.literal('')),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

interface Props {
  tipo: ArticuloTipo;
  bodegas: { id: string; nombre: string }[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (articulo: Articulo) => void;
}

const TIPO_LABELS: Record<ArticuloTipo, string> = {
  epp: 'EPP',
  herramienta: 'Herramienta',
  equipo: 'Equipo',
};

const CODIGO_PREFIX: Record<ArticuloTipo, string> = {
  epp: 'EPP',
  herramienta: 'HRR',
  equipo: 'EQP',
};

const ESP_LABELS: Record<string, string> = {
  oocc: 'OOCC',
  ooee: 'OOEE',
  equipos: 'Equipos',
  trabajos_verticales_lineas_de_vida: 'Trabajos Verticales / Líneas de Vida',
};

const fileCls = 'w-full text-sm text-content-secondary file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-surface-overlay file:text-sm file:cursor-pointer';
const inputCls        = 'w-full rounded-md border border-edge px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none';
const sectionTitleCls = 'text-xs font-semibold text-content-muted uppercase tracking-wide border-b border-edge pb-2';
const labelCls        = 'block text-sm font-medium text-content-secondary mb-1';

export function ArticuloCreateModal({ tipo, bodegas, isOpen, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { especialidades: [], valor: '0' },
  });

  const [fotoFile,    setFotoFile]    = useState<File | null>(null);
  const [fotoError,   setFotoError]   = useState<string | null>(null);
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [manualFile,  setManualFile]  = useState<File | null>(null);
  const [certFiles,   setCertFiles]   = useState<File[]>([]);
  const [manualTab,   setManualTab]   = useState<'file' | 'url'>('file');
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [hasVenc, setHasVenc] = useState(false);
  const [showPlantillaCreate, setShowPlantillaCreate] = useState(false);
  const [showPlantillaEdit, setShowPlantillaEdit] = useState(false);
  const [selectedPlantilla, setSelectedPlantilla] = useState<PlantillaWithCount | null>(null);
  const { error, handleError, clearError } = useFormErrors();

  const { data: proveedores = [] } = useQuery<Proveedor[]>({
    queryKey: ['proveedores'],
    queryFn: getProveedores,
  });

  const { data: plantillas = [] } = useQuery<Plantilla[]>({
    queryKey: ['plantillas', tipo],
    queryFn: () => getPlantillas(tipo),
    enabled: !!tipo,
  });


  const mutation = useMutation({
    mutationFn: async ({ data, files }: { data: FormOutput; files: ArticleFiles }) => {
      const articulo = await createArticulo(
        {
          ...data,
          tipo,
          marca:       data.marca       || undefined,
          modelo:      data.modelo      || undefined,
          descripcion: data.descripcion || undefined,
          manual_url: manualTab === 'url' ? (data.manual_url || undefined) : undefined,
        },
        files
      );
      for (const f of certFiles) {
        try {
          await addCertificacion(articulo.id, f, f.name.replace(/\.pdf$/i, ''));
        } catch {
          toast.error(`No se pudo subir certificación: ${f.name}`);
        }
      }
      return articulo;
    },
    onSuccess: (articulo) => {
      toast.success(`${TIPO_LABELS[tipo]} creado correctamente`);
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      reset();
      clearError();
      setFotoFile(null); setFotoError(null); setFacturaFile(null); setManualFile(null); setCertFiles([]);
      setHasVenc(false);
      onClose();
      onSuccess?.(articulo);
    },
    onError: (err: unknown) => {
      handleError(err);
    },
  });

  const onSubmit = (data: FormOutput) => {
    if (!fotoFile) {
      setFotoError('La foto del artículo es obligatoria.');
      return;
    }
    if (!hasVenc) data.fecha_vencimiento = undefined;
    const files: ArticleFiles = {};
    files.foto = fotoFile;
    if (facturaFile) files.factura = facturaFile;
    if (manualFile && manualTab === 'file') files.manual = manualFile;
    mutation.mutate({ data, files });
  };

  const applyPlantillaSnapshot = async (plantillaId: string) => {
    if (!plantillaId) {
      setSelectedPlantilla(null);
      return;
    }
    try {
      const p = await getPlantilla(plantillaId);
      setSelectedPlantilla(p);
      setValue('nombre',      p.nombre);
      setValue('marca',       p.marca ?? '');
      setValue('modelo',      p.modelo ?? '');
      setValue('descripcion', p.descripcion ?? '');
      setValue('manual_url',  p.manual_url ?? '');
      if (Array.isArray(p.especialidades)) {
        setValue('especialidades', p.especialidades as any);
      }
    } catch {
      toast.error('No se pudo cargar la plantilla');
    }
  };

  const toggleEsp = (esp: typeof ESPECIALIDADES[number]) => {
    const current = watch('especialidades') ?? [];
    setValue(
      'especialidades',
      current.includes(esp) ? current.filter(e => e !== esp) : [...current, esp],
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Nuevo ${TIPO_LABELS[tipo]}`} mobileFullscreen>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* PLANTILLA — bloque card, sin section header */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Desde plantilla{' '}
            <span className="normal-case font-normal text-xs text-content-muted">(opcional)</span>
          </div>
          <div className="flex gap-2">
            <select
              className={`${inputCls} flex-1`}
              onChange={(e) => applyPlantillaSnapshot(e.target.value)}
              defaultValue=""
            >
              <option value="">Sin plantilla…</option>
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}{p.marca ? ` — ${p.marca}` : ''}{p.modelo ? ` ${p.modelo}` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowPlantillaCreate(true)}
              className="px-3 py-2 text-xs border border-edge rounded-md text-content-secondary hover:bg-surface-muted whitespace-nowrap"
            >
              + Nueva
            </button>
            {selectedPlantilla && (
              <button
                type="button"
                onClick={() => setShowPlantillaEdit(true)}
                className="px-3 py-2 text-xs border border-amber-300 rounded-md text-amber-700 hover:bg-amber-50 whitespace-nowrap"
                title="Editar esta plantilla"
              >
                ✏
              </button>
            )}
          </div>
          {selectedPlantilla && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              Campos heredados de la plantilla — podés editarlos para esta unidad
            </div>
          )}
        </div>

        {/* SECCIÓN: FOTO */}
        <section className="space-y-3">
          <h4 className={sectionTitleCls}>Foto</h4>
          <FotoEvidenciaUpload
            value={fotoFile}
            onChange={(f) => { setFotoFile(f); if (f) setFotoError(null); }}
            error={fotoError}
            required
          />
        </section>

        {/* SECCIÓN: IDENTIFICACIÓN */}
        <section className="space-y-3">
          <h4 className={sectionTitleCls}>Identificación</h4>

          <div>
            <label className={labelCls}>Nombre *</label>
            <input {...register('nombre')} className={inputCls} placeholder="Ej: Casco de seguridad V-Gard" />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Marca</label>
              <input {...register('marca')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Modelo</label>
              <input {...register('modelo')} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              N° de Serie{' '}
              <span className="text-xs text-content-muted font-normal">(opcional)</span>
            </label>
            <input {...register('nro_serie')} className={inputCls} placeholder="Ej: MSA-VGARD-001" />
            {errors.nro_serie && <p className="text-red-500 text-xs mt-1">{errors.nro_serie.message}</p>}
          </div>

          <div>
            <label htmlFor="create-descripcion" className={labelCls}>Descripción</label>
            <textarea
              id="create-descripcion"
              {...register('descripcion')}
              rows={2}
              className={inputCls}
            />
          </div>
        </section>

        {/* SECCIÓN: UBICACIÓN INICIAL */}
        <section className="space-y-3">
          <h4 className={sectionTitleCls}>Ubicación inicial</h4>

          <div>
            <label className={labelCls}>Bodega *</label>
            <select {...register('bodega_id')} className={inputCls}>
              <option value="">Seleccione bodega...</option>
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
            {errors.bodega_id && <p className="text-red-500 text-xs mt-1">{errors.bodega_id.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Código interno</label>
            <div className="text-xs text-content-secondary bg-surface-muted rounded px-3 py-2 border border-edge leading-snug">
              Se asignará automáticamente al guardar.{' '}
              <span className="font-mono">{CODIGO_PREFIX[tipo]}-00001</span>,{' '}
              <span className="font-mono">{CODIGO_PREFIX[tipo]}-00002</span>…
            </div>
          </div>
        </section>

        {/* SECCIÓN: COMPRA */}
        <section className="space-y-3">
          <h4 className={sectionTitleCls}>Compra</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha de compra</label>
              <input {...register('fecha_compra')} type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Valor (CLP) *</label>
              <input {...register('valor')} type="number" min={0} className={inputCls} placeholder="0" />
              {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Proveedor</label>
            <div className="flex gap-2">
              <select {...register('proveedor_id')} className={`${inputCls} flex-1`}>
                <option value="">Sin proveedor</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowProveedorModal(true)}
                className="px-3 py-2 text-xs border border-edge rounded-md text-content-secondary hover:bg-surface-muted whitespace-nowrap"
              >
                + Nuevo
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Factura{' '}
              <span className="text-xs text-content-muted font-normal">(PDF, opcional)</span>
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFacturaFile(e.target.files?.[0] ?? null)}
              className={fileCls}
            />
          </div>
        </section>

        {/* SECCIÓN: DOCUMENTOS */}
        <section className="space-y-3">
          <h4 className={sectionTitleCls}>Documentos</h4>

          <div>
            <label className={labelCls}>Manual / Ficha de especificaciones</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setManualTab('file')}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  manualTab === 'file'
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : 'bg-surface border-edge text-content-secondary hover:border-primary-blue'
                }`}
              >
                Subir PDF
              </button>
              <button
                type="button"
                onClick={() => setManualTab('url')}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  manualTab === 'url'
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : 'bg-surface border-edge text-content-secondary hover:border-primary-blue'
                }`}
              >
                Pegar link
              </button>
            </div>
            {manualTab === 'file' ? (
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setManualFile(e.target.files?.[0] ?? null)}
                className={fileCls}
              />
            ) : (
              <>
                <input {...register('manual_url')} type="url" className={inputCls} placeholder="https://..." />
                {errors.manual_url && <p className="text-red-500 text-xs mt-1">{errors.manual_url.message}</p>}
              </>
            )}
          </div>

          <div>
            <label className={labelCls}>
              Certificaciones{' '}
              <span className="text-xs text-content-muted font-normal">
                (PDF, máx 5 — {certFiles.length}/5)
              </span>
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              disabled={certFiles.length >= 5}
              onChange={(e) => {
                const incoming = Array.from(e.target.files ?? []);
                setCertFiles(prev => [...prev, ...incoming].slice(0, 5));
                e.target.value = '';
              }}
              className={`${fileCls} disabled:opacity-50`}
            />
            {certFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {certFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-surface-muted px-2 py-1 rounded">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setCertFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="ml-2 text-danger hover:text-danger-text"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-content-muted mt-1">Las certificaciones se suben una vez creado el artículo.</p>
          </div>
        </section>

        {/* SECCIÓN: VIGENCIA */}
        <section className="space-y-3">
          <h4 className={sectionTitleCls}>Vigencia</h4>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasVenc}
                onChange={() => {
                  setHasVenc(v => {
                    if (v) setValue('fecha_vencimiento', undefined);
                    return !v;
                  });
                }}
                className="rounded border-edge text-primary-blue focus:ring-primary-blue"
              />
              <span className="text-sm font-medium text-content-secondary">¿Tiene fecha de vencimiento?</span>
            </label>
            {hasVenc && (
              <input
                {...register('fecha_vencimiento')}
                type="date"
                className={inputCls}
                aria-label="Fecha de vencimiento"
              />
            )}
          </div>

          <div>
            <label className={labelCls}>Especialidades</label>
            <div className="flex flex-wrap gap-2">
              {ESPECIALIDADES.map(esp => {
                const checked = (watch('especialidades') ?? []).includes(esp);
                return (
                  <button
                    key={esp}
                    type="button"
                    onClick={() => toggleEsp(esp)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      checked
                        ? 'bg-primary-blue text-white border-primary-blue'
                        : 'bg-surface text-content-secondary border-edge hover:border-primary-blue'
                    }`}
                  >
                    {ESP_LABELS[esp]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <ErrorAlert message={error} className="mb-3" />

        <div className="flex justify-end gap-3 pt-4 border-t border-edge">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-content-secondary bg-surface-overlay rounded-md hover:bg-edge"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm text-white bg-primary-blue rounded-md hover:bg-dark-blue disabled:opacity-50"
          >
            {mutation.isPending ? 'Creando...' : `Crear ${TIPO_LABELS[tipo]}`}
          </button>
        </div>
      </form>

      {showProveedorModal && (
        <ProveedorCreateModal
          isOpen
          onClose={() => setShowProveedorModal(false)}
          onCreated={(prov) => {
            setValue('proveedor_id', prov.id);
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            setShowProveedorModal(false);
          }}
        />
      )}

      {showPlantillaCreate && (
        <PlantillaCreateModal
          isOpen={showPlantillaCreate}
          defaultTipo={tipo}
          onClose={() => setShowPlantillaCreate(false)}
          onCreated={(p) => {
            queryClient.invalidateQueries({ queryKey: ['plantillas'] });
            setShowPlantillaCreate(false);
            applyPlantillaSnapshot(p.id);
          }}
        />
      )}

      {showPlantillaEdit && selectedPlantilla && (
        <PlantillaEditModal
          isOpen={showPlantillaEdit}
          plantilla={selectedPlantilla}
          onClose={() => setShowPlantillaEdit(false)}
          onUpdated={(updated) => {
            setSelectedPlantilla(updated);
            setShowPlantillaEdit(false);
          }}
        />
      )}
    </Modal>
  );
}
