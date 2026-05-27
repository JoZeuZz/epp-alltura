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
  type Articulo,
  type ArticuloTipo,
  type Proveedor,
  type ArticleFiles,
} from '../services/apiService';
import ProveedorCreateModal from './forms/ProveedorCreateModal';

const ESPECIALIDADES = ['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'] as const;

const schema = z.object({
  nombre:            z.string().min(2, 'Mínimo 2 caracteres').max(150),
  marca:             z.string().optional(),
  modelo:            z.string().optional(),
  descripcion:       z.string().optional(),
  nro_serie:         z.string().min(3, 'Mínimo 3 caracteres').max(120),
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

const ESP_LABELS: Record<string, string> = {
  oocc: 'OOCC',
  ooee: 'OOEE',
  equipos: 'Equipos',
  trabajos_verticales_lineas_de_vida: 'Trabajos Verticales / Líneas de Vida',
};

const fileCls = 'w-full text-sm text-content-secondary file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-surface-overlay file:text-sm file:cursor-pointer';

export function ArticuloCreateModal({ tipo, bodegas, isOpen, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { especialidades: [], valor: '0' },
  });

  const [fotoFile,    setFotoFile]    = useState<File | null>(null);
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [manualFile,  setManualFile]  = useState<File | null>(null);
  const [certFiles,   setCertFiles]   = useState<File[]>([]);
  const [manualTab,   setManualTab]   = useState<'file' | 'url'>('file');
  const [showProveedorModal, setShowProveedorModal] = useState(false);

  const { data: proveedores = [] } = useQuery<Proveedor[]>({
    queryKey: ['proveedores'],
    queryFn: getProveedores,
  });

  const nroSerie = watch('nro_serie') ?? '';
  const codigoPreview = nroSerie.replace(/\s/g, '').slice(-3).toUpperCase() || '---';

  const mutation = useMutation({
    mutationFn: async ({ data, files }: { data: FormOutput; files: ArticleFiles }) => {
      const articulo = await createArticulo(
        {
          ...data,
          tipo,
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
      setFotoFile(null); setFacturaFile(null); setManualFile(null); setCertFiles([]);
      onClose();
      onSuccess?.(articulo);
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Error al crear');
    },
  });

  const onSubmit = (data: FormOutput) => {
    const files: ArticleFiles = {};
    if (fotoFile)    files.foto    = fotoFile;
    if (facturaFile) files.factura = facturaFile;
    if (manualFile && manualTab === 'file') files.manual = manualFile;
    mutation.mutate({ data, files });
  };

  const toggleEsp = (esp: typeof ESPECIALIDADES[number]) => {
    const current = watch('especialidades') ?? [];
    setValue(
      'especialidades',
      current.includes(esp) ? current.filter(e => e !== esp) : [...current, esp],
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Nuevo ${TIPO_LABELS[tipo]}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <div>
          <label className="label-sm block mb-1">Nombre *</label>
          <input {...register('nombre')} className="input w-full" placeholder="Ej: Casco de seguridad V-Gard" />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-sm block mb-1">Marca</label>
            <input {...register('marca')} className="input w-full" />
          </div>
          <div>
            <label className="label-sm block mb-1">Modelo</label>
            <input {...register('modelo')} className="input w-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-sm block mb-1">N° de Serie *</label>
            <input {...register('nro_serie')} className="input w-full" placeholder="Ej: MSA-VGARD-001" />
            {errors.nro_serie && <p className="text-red-500 text-xs mt-1">{errors.nro_serie.message}</p>}
          </div>
          <div>
            <label className="label-sm block mb-1">Código (auto)</label>
            <div className="input w-full bg-gray-50 text-gray-500 select-none">{codigoPreview}</div>
          </div>
        </div>

        <div>
          <label className="label-sm block mb-1">Valor (CLP) *</label>
          <input {...register('valor')} type="number" min={0} className="input w-full" placeholder="0" />
          {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
        </div>

        <div>
          <label className="label-sm block mb-1">Bodega inicial *</label>
          <select {...register('bodega_id')} className="input w-full">
            <option value="">Seleccione bodega...</option>
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
          {errors.bodega_id && <p className="text-red-500 text-xs mt-1">{errors.bodega_id.message}</p>}
        </div>

        <div>
          <label className="label-sm block mb-2">Especialidades</label>
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
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary-blue'
                  }`}
                >
                  {ESP_LABELS[esp]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label-sm block mb-1">Fecha de vencimiento</label>
          <input {...register('fecha_vencimiento')} type="date" className="input w-full" />
        </div>

        {/* New provenance fields */}

        <div>
          <label className="label-sm block mb-1">Fecha de compra</label>
          <input {...register('fecha_compra')} type="date" className="input w-full" />
        </div>

        <div>
          <label className="label-sm block mb-1">Proveedor</label>
          <div className="flex gap-2">
            <select {...register('proveedor_id')} className="input flex-1">
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
          <label className="label-sm block mb-1">Foto</label>
          <input
            type="file" accept="image/*"
            onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
            className={fileCls}
          />
        </div>

        <div>
          <label className="label-sm block mb-1">Factura (PDF, opcional)</label>
          <input
            type="file" accept=".pdf,application/pdf"
            onChange={(e) => setFacturaFile(e.target.files?.[0] ?? null)}
            className={fileCls}
          />
        </div>

        <div>
          <label className="label-sm block mb-1">Manual / Ficha de especificaciones</label>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setManualTab('file')}
              className={`px-3 py-1 text-xs rounded border transition-colors ${manualTab === 'file' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white border-gray-300 text-gray-600'}`}>
              Subir PDF
            </button>
            <button type="button" onClick={() => setManualTab('url')}
              className={`px-3 py-1 text-xs rounded border transition-colors ${manualTab === 'url' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white border-gray-300 text-gray-600'}`}>
              Pegar link
            </button>
          </div>
          {manualTab === 'file' ? (
            <input
              type="file" accept=".pdf,application/pdf"
              onChange={(e) => setManualFile(e.target.files?.[0] ?? null)}
              className={fileCls}
            />
          ) : (
            <>
              <input {...register('manual_url')} type="url" className="input w-full" placeholder="https://..." />
              {errors.manual_url && <p className="text-red-500 text-xs mt-1">{errors.manual_url.message}</p>}
            </>
          )}
        </div>

        <div>
          <label className="label-sm block mb-1">
            Certificaciones (PDF, máx 5)
            <span className="ml-2 text-xs text-content-muted">{certFiles.length}/5</span>
          </label>
          <input
            type="file" accept=".pdf,application/pdf" multiple
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
                  <button type="button" onClick={() => setCertFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="ml-2 text-danger hover:text-danger-text">✕</button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-content-muted mt-1">Las certificaciones se suben una vez creado el artículo.</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
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
    </Modal>
  );
}
