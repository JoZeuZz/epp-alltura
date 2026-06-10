import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import {
  createPlantilla,
  type Plantilla,
  type ArticuloTipo,
  type ArticuloEspecialidad,
} from '../../services/apiService';
import { useFormErrors } from '../../hooks/useFormErrors';
import ErrorAlert from '../ui/ErrorAlert';

const TIPOS: ArticuloTipo[] = ['epp', 'herramienta', 'equipo'];
const TIPO_LABELS: Record<ArticuloTipo, string> = {
  epp: 'EPP',
  herramienta: 'Herramienta',
  equipo: 'Equipo',
};

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
  tipo:        z.enum(['epp', 'herramienta', 'equipo'] as const),
  nombre:      z.string().min(2, 'Mínimo 2 caracteres').max(150),
  marca:       z.string().optional(),
  modelo:      z.string().optional(),
  descripcion: z.string().optional(),
  manual_url:  z.string().url('URL inválida').optional().or(z.literal('')),
  especialidades: z.array(z.enum(['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'] as const)).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTipo?: ArticuloTipo;
  onCreated: (plantilla: Plantilla) => void;
}

export function PlantillaCreateModal({ isOpen, onClose, defaultTipo = 'epp', onCreated }: Props) {
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
    defaultValues: { tipo: defaultTipo, especialidades: [] },
  });

  const [fotoFile, setFotoFile]   = useState<File | null>(null);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualTab, setManualTab]  = useState<'url' | 'file'>('url');
  const { error, handleError, clearError } = useFormErrors();

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      createPlantilla(
        {
          ...data,
          especialidades: data.especialidades as ArticuloEspecialidad[] | undefined,
          manual_url: manualTab === 'url' ? (data.manual_url || undefined) : undefined,
        },
        { foto: fotoFile || undefined, manual: manualFile || undefined },
      ),
    onSuccess: (plantilla) => {
      toast.success('Plantilla creada correctamente');
      clearError();
      queryClient.invalidateQueries({ queryKey: ['plantillas'] });
      reset();
      setFotoFile(null);
      setManualFile(null);
      onCreated(plantilla);
      onClose();
    },
    onError: (err: unknown) => {
      handleError(err);
    },
  });

  const toggleEsp = (esp: ArticuloEspecialidad) => {
    const current = (watch('especialidades') ?? []) as ArticuloEspecialidad[];
    setValue(
      'especialidades',
      current.includes(esp) ? current.filter((e) => e !== esp) : [...current, esp],
    );
  };

  const inputCls = 'w-full rounded-md border border-edge px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none';
  const fileCls  = 'w-full text-sm text-content-secondary file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-surface-overlay file:text-sm file:cursor-pointer';
  const sectionTitleCls = 'text-xs font-semibold text-content-muted uppercase tracking-wide border-b border-edge pb-2';
  const labelCls = 'block text-sm font-medium text-content-secondary mb-1';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Plantilla de Artículo">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">

        {/* Tipo — selector de contexto, sin section header */}
        <div>
          <label className={labelCls}>Tipo *</label>
          <div className="flex gap-2">
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue('tipo', t)}
                className={`px-4 py-1.5 rounded-full text-xs border transition-colors ${
                  watch('tipo') === t
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : 'bg-surface text-content-secondary border-edge hover:border-primary-blue'
                }`}
              >
                {TIPO_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* SECCIÓN: CONTENIDO */}
        <section className="space-y-3">
          <h4 className={sectionTitleCls}>Contenido</h4>

          <div>
            <label className={labelCls}>Nombre <span className="text-danger">*</span></label>
            <input
              {...register('nombre')}
              className={inputCls}
              placeholder="Ej: Casco de Seguridad V-Gard"
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Marca</label>
              <input {...register('marca')} className={inputCls} placeholder="MSA" />
            </div>
            <div>
              <label className={labelCls}>Modelo</label>
              <input {...register('modelo')} className={inputCls} placeholder="V-Gard 500" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Descripción / Ficha técnica</label>
            <textarea {...register('descripcion')} className={inputCls} rows={3} />
          </div>
        </section>

        {/* SECCIÓN: ESPECIALIDADES */}
        <section className="space-y-3">
          <h4 className={sectionTitleCls}>Especialidades</h4>
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
                      ? 'bg-primary-blue text-white border-primary-blue'
                      : 'bg-surface text-content-secondary border-edge hover:border-primary-blue'
                  }`}
                >
                  {ESP_LABELS[esp]}
                </button>
              );
            })}
          </div>
        </section>

        {/* SECCIÓN: DOCUMENTOS */}
        <section className="space-y-3">
          <h4 className={sectionTitleCls}>Documentos</h4>

          <div>
            <label className={labelCls}>Foto de referencia del modelo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
              className={fileCls}
            />
          </div>

          <div>
            <label className={labelCls}>Manual / Ficha de especificaciones</label>
            <div className="flex gap-2 mb-2">
              {(['url', 'file'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setManualTab(tab);
                    if (tab === 'url') setManualFile(null);
                    else setValue('manual_url', '');
                  }}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    manualTab === tab
                      ? 'bg-primary-blue text-white border-primary-blue'
                      : 'bg-surface border-edge text-content-secondary hover:border-primary-blue'
                  }`}
                >
                  {tab === 'url' ? 'Pegar link' : 'Subir PDF'}
                </button>
              ))}
            </div>
            {manualTab === 'url' ? (
              <input {...register('manual_url')} type="url" className={inputCls} placeholder="https://..." />
            ) : (
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setManualFile(e.target.files?.[0] ?? null)}
                className={fileCls}
              />
            )}
            {errors.manual_url && <p className="text-red-500 text-xs mt-1">{errors.manual_url.message}</p>}
          </div>
        </section>

        <ErrorAlert message={error} className="mb-3" />

        <div className="flex justify-end gap-2 pt-4 border-t border-edge">
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
            {mutation.isPending ? 'Creando...' : 'Guardar plantilla'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
