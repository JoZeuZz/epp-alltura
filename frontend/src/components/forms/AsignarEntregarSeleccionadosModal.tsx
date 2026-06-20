import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@jozeuzz/alltura-ui';
import toast from 'react-hot-toast';
import {
  assignArticulosToUsuario,
  deliverAssignedArticulosToTrabajador,
  createEntrega,
  type AssignArticulosPayload,
  type DeliverAssignedPayload,
  type EntregaCreatePayload,
  type EntregaRow,
} from '../../services/apiService';
import { useGet } from '../../hooks';
import EntregaFirmaModal from './EntregaFirmaModal';

interface TrabajadorOption { id: string; nombres: string; apellidos: string; rut: string; }
interface UbicacionOption { id: string; nombre: string; }
interface UsuarioOption { id: string; email_login: string; nombre?: string; }
interface BodegaOption { id: string; nombre: string; }

type DestType = 'trabajador' | 'usuario';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  articuloIds: string[];
  articuloLabels?: string[];
  sourceIsUsuario?: boolean;
  initialDestType?: DestType;
}

const AsignarEntregarSeleccionadosModal: React.FC<Props> = ({
  isOpen, onClose, articuloIds, articuloLabels = [], sourceIsUsuario = false, initialDestType,
}) => {
  const queryClient = useQueryClient();
  const [destType, setDestType] = useState<DestType>(initialDestType ?? (sourceIsUsuario ? 'trabajador' : 'usuario'));
  const [trabajadorId, setTrabajadorId] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [bodegaOrigenId, setBodegaOrigenId] = useState('');
  const [fechaDevolucion, setFechaDevolucion] = useState('');
  const [notas, setNotas] = useState('');
  // For the bodega→trabajador path (sourceIsUsuario=false), we need bodega origen for POST /entregas
  const [bodegaOrigenEntregaId, setBodegaOrigenEntregaId] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [resumeEntrega, setResumeEntrega] = useState<EntregaRow | null>(null);

  const { data: trabajadores = [] } = useGet<TrabajadorOption[]>(['trabajadores'], '/trabajadores');
  const { data: proyectos = [] } = useGet<UbicacionOption[]>(['proyectos-activos'], '/proyectos?estado=activo');
  const { data: usuarios = [] } = useGet<UsuarioOption[]>(['usuarios'], '/users');
  const { data: bodegas = [] } = useGet<BodegaOption[]>(['bodegas'], '/bodegas');

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setFotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFotoPreview(null);
    }
  };

  // From user custody → worker (POST /asignaciones-usuario/entregar-a-trabajador)
  const extractDuplicateDraft = (err: unknown): EntregaRow | null => {
    const e = err as {
      response?: {
        data?: {
          code?: string;
          data?: { existing_entrega?: EntregaRow };
        };
      };
    };
    if (e?.response?.data?.code === 'DELIVERY_DRAFT_EXISTS') {
      return e?.response?.data?.data?.existing_entrega ?? null;
    }
    return null;
  };

  // From user custody → worker (POST /asignaciones-usuario/entregar-a-trabajador)
  const deliverFromUsuarioMutation = useMutation({
    mutationFn: ({ fotoFile: file, ...p }: DeliverAssignedPayload & { fotoFile: File }) =>
      deliverAssignedArticulosToTrabajador(p, file),
    onSuccess: (data) => {
      const created = data as EntregaRow;
      setResumeEntrega(created);
      void queryClient.invalidateQueries({ queryKey: ['mis-asignaciones'] });
      void queryClient.invalidateQueries({ queryKey: ['articulos'] });
    },
    onError: (err: unknown) => {
      const dup = extractDuplicateDraft(err);
      if (dup) {
        toast('Ya existe una entrega pendiente con estos artículos.', { icon: 'ℹ️' });
        setResumeEntrega(dup);
        return;
      }
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error al crear entrega');
    },
  });

  // From bodega → worker via regular entrega (POST /entregas)
  const deliverFromBodegaMutation = useMutation({
    mutationFn: ({ payload, fotoFile: file }: { payload: EntregaCreatePayload; fotoFile: File }) =>
      createEntrega(payload, file),
    onSuccess: (data) => {
      const created = data as EntregaRow;
      setResumeEntrega(created);
      void queryClient.invalidateQueries({ queryKey: ['articulos'] });
    },
    onError: (err: unknown) => {
      const dup = extractDuplicateDraft(err);
      if (dup) {
        toast('Ya existe una entrega pendiente con estos artículos.', { icon: 'ℹ️' });
        setResumeEntrega(dup);
        return;
      }
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error al crear entrega');
    },
  });

  const assignMutation = useMutation({
    mutationFn: (p: AssignArticulosPayload) => assignArticulosToUsuario(p),
    onSuccess: () => {
      toast.success(`${articuloIds.length} artículo${articuloIds.length !== 1 ? 's' : ''} asignado${articuloIds.length !== 1 ? 's' : ''}`);
      void queryClient.invalidateQueries({ queryKey: ['articulos'] });
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error al asignar');
    },
  });

  const isSubmitting = deliverFromUsuarioMutation.isPending || deliverFromBodegaMutation.isPending || assignMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destType === 'trabajador') {
      if (!fotoFile) { toast.error('Se requiere foto de evidencia'); return; }
      if (!trabajadorId) { toast.error('Selecciona un trabajador'); return; }
      if (!proyectoId) { toast.error('Selecciona un proyecto destino'); return; }
      if (sourceIsUsuario) {
        // Items are in user custody → POST /asignaciones-usuario/entregar-a-trabajador
        deliverFromUsuarioMutation.mutate({
          fotoFile,
          trabajador_id: trabajadorId,
          proyecto_destino_id: proyectoId,
          articulo_ids: articuloIds,
          nota_destino: notas || undefined,
          fecha_devolucion_esperada: fechaDevolucion || undefined,
        });
      } else {
        // Items are in bodega → POST /entregas (regular delivery)
        if (!bodegaOrigenEntregaId) { toast.error('Selecciona la bodega origen'); return; }
        // TODO(bulk-mixed-bodega): articuloIds may contain articles from different bodegas.
        // The modal has no access to each article's bodega_actual_id, so it cannot validate
        // that all selected articles belong to bodegaOrigenEntregaId before submitting.
        // The backend will reject individual articles that don't match, but the UX is poor for
        // bulk selections spanning multiple bodegas. Future fix: receive article metadata via
        // props or a separate query and pre-filter / warn the user before submission.
        deliverFromBodegaMutation.mutate({
          fotoFile,
          payload: {
            trabajador_id: trabajadorId,
            ubicacion_origen_id: bodegaOrigenEntregaId,
            ubicacion_destino_id: proyectoId,
            nota_destino: notas || null,
            fecha_devolucion_esperada: fechaDevolucion || null,
            detalles: articuloIds.map((id) => ({ articulo_id: id, condicion_salida: 'ok' as const })),
          },
        });
      }
    } else {
      if (!usuarioId) { toast.error('Selecciona un usuario'); return; }
      if (!bodegaOrigenId) { toast.error('Selecciona bodega origen'); return; }
      assignMutation.mutate({
        usuario_id: usuarioId,
        articulo_ids: articuloIds,
        origen_tipo: 'bodega',
        bodega_origen_id: bodegaOrigenId,
        notas: notas || undefined,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Entregar / asignar ${articuloIds.length} artículo${articuloIds.length !== 1 ? 's' : ''}`}
      mobileFullscreen
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {articuloLabels.length > 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 max-h-20 overflow-y-auto">
              {articuloLabels.slice(0, 5).join(', ')}{articuloLabels.length > 5 ? ` y ${articuloLabels.length - 5} más` : ''}
            </div>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-2">Tipo de destino</legend>
            <div className="flex gap-3">
              {(['trabajador', 'usuario'] as DestType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dest-type"
                    value={t}
                    checked={destType === t}
                    onChange={() => setDestType(t)}
                    className="text-primary-blue focus:ring-primary-blue"
                  />
                  <span className="text-sm">
                    {t === 'trabajador' ? 'Trabajador (con firma)' : 'Usuario de sistema'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {destType === 'trabajador' && (
            <>
              <div>
                <label htmlFor="sel-trabajador" className="block text-sm font-medium text-gray-700 mb-1">
                  Trabajador <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <select
                  id="sel-trabajador"
                  value={trabajadorId}
                  onChange={(e) => setTrabajadorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                  required
                >
                  <option value="">Seleccionar trabajador…</option>
                  {trabajadores.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombres} {t.apellidos} ({t.rut})
                    </option>
                  ))}
                </select>
              </div>
              {!sourceIsUsuario && (
                <div>
                  <label htmlFor="sel-bodega-entrega" className="block text-sm font-medium text-gray-700 mb-1">
                    Bodega origen <span aria-hidden="true" className="text-red-500">*</span>
                  </label>
                  <select
                    id="sel-bodega-entrega"
                    value={bodegaOrigenEntregaId}
                    onChange={(e) => setBodegaOrigenEntregaId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                    required
                  >
                    <option value="">Seleccionar bodega…</option>
                    {bodegas.map((b) => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="sel-proyecto" className="block text-sm font-medium text-gray-700 mb-1">
                  Proyecto destino <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <select
                  id="sel-proyecto"
                  value={proyectoId}
                  onChange={(e) => setProyectoId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                  required
                >
                  <option value="">Seleccionar proyecto…</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="foto-evidencia" className="block text-sm font-medium text-gray-700 mb-1">
                  Foto de evidencia <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id="foto-evidencia"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFotoChange}
                  required
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary-blue file:text-white hover:file:bg-blue-700"
                />
                {fotoPreview && (
                  <img
                    src={fotoPreview}
                    alt="Vista previa de evidencia"
                    className="mt-2 rounded border border-gray-200 max-h-32 object-cover"
                  />
                )}
              </div>
              <div>
                <label htmlFor="fecha-devolucion" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha devolución esperada
                </label>
                <input
                  id="fecha-devolucion"
                  type="date"
                  value={fechaDevolucion}
                  onChange={(e) => setFechaDevolucion(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                />
              </div>
            </>
          )}

          {destType === 'usuario' && (
            <>
              <div>
                <label htmlFor="sel-usuario" className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario de sistema <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <select
                  id="sel-usuario"
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                  required
                >
                  <option value="">Seleccionar usuario…</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre ?? u.email_login}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sel-bodega-origen" className="block text-sm font-medium text-gray-700 mb-1">
                  Bodega origen <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <select
                  id="sel-bodega-origen"
                  value={bodegaOrigenId}
                  onChange={(e) => setBodegaOrigenId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                  required
                >
                  <option value="">Seleccionar bodega…</option>
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="notas-asignar" className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              id="notas-asignar"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
            />
          </div>

          {destType === 'trabajador' && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
              Se creará una entrega en borrador. Deberás completar la firma del trabajador para confirmarla.
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-md bg-primary-blue text-white hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {isSubmitting ? 'Procesando…' : destType === 'trabajador' ? 'Crear entrega' : 'Asignar'}
            </button>
          </div>
      </form>
      {resumeEntrega && (
        <EntregaFirmaModal
          isOpen
          onClose={() => setResumeEntrega(null)}
          entrega={resumeEntrega}
          alreadySigned={Boolean(resumeEntrega.firmado_en || resumeEntrega.firma_imagen_url)}
          onCompleted={() => {
            setResumeEntrega(null);
            toast.success('Entrega completada.');
            void queryClient.invalidateQueries({ queryKey: ['mis-asignaciones'] });
            void queryClient.invalidateQueries({ queryKey: ['articulos'] });
            void queryClient.invalidateQueries({ queryKey: ['entregas-pendientes-firma'] });
            onClose();
          }}
        />
      )}
    </Modal>
  );
};

export default AsignarEntregarSeleccionadosModal;
