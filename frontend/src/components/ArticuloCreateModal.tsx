import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@jozeuZz/alltura-ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createArticulo } from '../services/apiService';
import type { Articulo, ArticuloTipo } from '../services/apiService';

const ESPECIALIDADES = ['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'] as const;

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  descripcion: z.string().optional(),
  nro_serie: z.string().min(3, 'Mínimo 3 caracteres').max(120),
  valor: z.string().transform((v, ctx) => {
    const n = Number(v);
    if (v === '' || isNaN(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Valor mínimo 0' });
      return z.NEVER;
    }
    if (!Number.isInteger(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Valor mínimo 0' });
      return z.NEVER;
    }
    return n;
  }),
  bodega_id: z.string().uuid('Seleccione una bodega'),
  especialidades: z.array(z.enum(ESPECIALIDADES)).optional(),
  fecha_vencimiento: z.string().optional(),
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

export function ArticuloCreateModal({ tipo, bodegas, isOpen, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { especialidades: [], valor: '0' },
  });

  const nroSerie = watch('nro_serie') ?? '';
  const codigoPreview = nroSerie.replace(/\s/g, '').slice(-3).toUpperCase() || '---';

  const mutation = useMutation({
    mutationFn: (data: FormOutput) =>
      createArticulo({ ...data, tipo }),
    onSuccess: (articulo) => {
      toast.success(`${TIPO_LABELS[tipo]} creado correctamente`);
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      reset();
      onClose();
      onSuccess?.(articulo);
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Error al crear');
    },
  });

  const onSubmit = (data: FormOutput) => mutation.mutate(data);

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

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Creando...' : `Crear ${TIPO_LABELS[tipo]}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
