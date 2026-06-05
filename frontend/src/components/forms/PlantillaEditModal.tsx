import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import {
  updatePlantilla,
  type PlantillaWithCount,
  type ArticuloEspecialidad,
} from '../../services/apiService';

const ESPECIALIDADES: ArticuloEspecialidad[] = [
  'oocc',
  'ooee',
  'equipos',
  'trabajos_verticales_lineas_de_vida',
];
const ESP_LABELS: Record<ArticuloEspecialidad, string> = {
  oocc: 'OOCC',
  ooee: 'OOEE',
  equipos: 'Equipos',
  trabajos_verticales_lineas_de_vida: 'Trabajos Verticales / Líneas de Vida',
};

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  descripcion: z.string().optional(),
  manual_url: z.string().url('URL inválida').optional().or(z.literal('')),
  especialidades: z.array(z.enum(['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'] as const)).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  plantilla: PlantillaWithCount;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (p: PlantillaWithCount) => void;
}

export function PlantillaEditModal({ plantilla, isOpen, onClose, onUpdated }: Props) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Populate form when plantilla changes
  useEffect(() => {
    if (plantilla && isOpen) {
      reset({
        nombre: plantilla.nombre,
        marca: plantilla.marca ?? '',
        modelo: plantilla.modelo ?? '',
        descripcion: plantilla.descripcion ?? '',
        manual_url: plantilla.manual_url ?? '',
        especialidades: (plantilla.especialidades ?? []) as ArticuloEspecialidad[],
      });
    }
  }, [plantilla, isOpen, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => updatePlantilla(plantilla.id, data),
    onSuccess: (updated) => {
      toast.success('Plantilla actualizada');
      queryClient.invalidateQueries({ queryKey: ['plantillas'] });
      onUpdated(updated);
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error al actualizar plantilla');
    },
  });

  const toggleEsp = (esp: ArticuloEspecialidad) => {
    const current = (watch('especialidades') ?? []) as ArticuloEspecialidad[];
    setValue(
      'especialidades',
      current.includes(esp) ? current.filter((e) => e !== esp) : [...current, esp]
    );
  };

  const inputCls =
    'w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Plantilla">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">

        {/* Warning banner when instances exist */}
        {plantilla.instance_count > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Esta plantilla tiene {plantilla.instance_count} artículo{plantilla.instance_count !== 1 ? 's' : ''} creado{plantilla.instance_count !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Los cambios que hagas aquí <strong>no afectarán</strong> los artículos existentes. Solo aplicarán a nuevas creaciones.
              </p>
            </div>
          </div>
        )}

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            {...register('nombre')}
            className={inputCls}
            placeholder="Ej: Casco de Seguridad V-Gard"
          />
          {errors.nombre && (
            <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>
          )}
        </div>

        {/* Marca + Modelo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Marca</label>
            <input {...register('marca')} className={inputCls} placeholder="MSA" />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Modelo</label>
            <input {...register('modelo')} className={inputCls} placeholder="V-Gard 500" />
          </div>
        </div>

        {/* Descripcion */}
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            Descripción / Ficha técnica
          </label>
          <textarea {...register('descripcion')} className={inputCls} rows={3} />
        </div>

        {/* Manual URL */}
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            Manual / Ficha de especificaciones (URL)
          </label>
          <input
            {...register('manual_url')}
            type="url"
            className={inputCls}
            placeholder="https://..."
          />
          {errors.manual_url && (
            <p className="text-red-500 text-xs mt-1">{errors.manual_url.message}</p>
          )}
        </div>

        {/* Especialidades */}
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-2">
            Especialidades
          </label>
          <div className="flex flex-wrap gap-2">
            {ESPECIALIDADES.map((esp) => {
              const checked = ((watch('especialidades') ?? []) as ArticuloEspecialidad[]).includes(esp);
              return (
                <button
                  key={esp}
                  type="button"
                  onClick={() => toggleEsp(esp)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    checked
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
                  }`}
                >
                  {ESP_LABELS[esp]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
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
            className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
