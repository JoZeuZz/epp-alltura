import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import ActivoProfileModal from '../forms/ActivoProfileModal';
import CambiarEstadoActivoModal from '../forms/CambiarEstadoActivoModal';
import ReubicarActivoModal from '../forms/ReubicarActivoModal';
import EditarActivoModal from '../forms/EditarActivoModal';
import EntregaCreateModal from '../forms/EntregaCreateModal';
import { useGet } from '../../hooks';
import {
  createEntrega,
  type EntregaCreatePayload,
  type EntregaTemplate,
  type InventoryActivoDetailRow,
} from '../../services/apiService';
import {
  getToolActionFlags,
  getToolRawStatus,
  getToolStatusBadgeClasses,
  getToolStatusLabel,
  getToolVisibleCode,
  getToolVisibleLocation,
  getToolVisibleMonetaryValue,
  getToolVisibleName,
  getToolVisibleResponsible,
  getToolVisibleSerial,
  type ToolPresentationSource,
} from '../../utils/toolPresentation';

export interface ToolDetailsModalProps {
  isOpen: boolean;
  tool: ToolPresentationSource | null;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenEntregaFlow?: (tool: ToolPresentationSource) => void;
  onOpenDevolucionFlow?: (tool: ToolPresentationSource) => void;
}

interface ActionState {
  disabled: boolean;
  reason?: string;
}

const resolveRelevantDate = (tool: ToolPresentationSource): { label: string; value: string } | null => {
  const candidate =
    tool.fecha_devolucion_esperada ||
    tool.fecha_vencimiento ||
    tool.custodia_desde_en ||
    tool.ultimo_movimiento_fecha;

  if (!candidate) return null;

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return null;

  const label = tool.fecha_devolucion_esperada
    ? 'Devolución esperada'
    : tool.fecha_vencimiento
      ? 'Fecha de vencimiento'
      : tool.custodia_desde_en
        ? 'En custodia desde'
        : 'Último movimiento';

  return {
    label,
    value: parsed.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  };
};

const toActivoRow = (tool: ToolPresentationSource): InventoryActivoDetailRow => ({
  id: String(tool.id || ''),
  codigo: tool.codigo ?? tool.codigo_activo ?? undefined,
  nro_serie: tool.nro_serie ?? tool.serie ?? tool.serial ?? null,
  articulo_id: tool.articulo_id,
  articulo_nombre: tool.articulo_nombre ?? tool.nombre ?? tool.articulo?.nombre ?? undefined,
  ubicacion_id: tool.ubicacion_id ?? null,
  ubicacion_nombre: tool.ubicacion_nombre ?? null,
  estado: tool.estado ?? tool.status ?? undefined,
  valor:
    typeof tool.valor === 'number'
      ? tool.valor
      : typeof tool.valor_monetario === 'number'
        ? tool.valor_monetario
        : null,
  fecha_vencimiento: tool.fecha_vencimiento ?? null,
  custodia_id: tool.custodia_id ?? null,
  custodia_estado: tool.custodia_estado ?? null,
  custodio_trabajador_id: tool.custodio_trabajador_id ?? null,
  custodio_nombres: tool.custodio_nombres ?? null,
  custodio_apellidos: tool.custodio_apellidos ?? null,
  custodia_ubicacion_id: tool.custodia_ubicacion_id ?? null,
  custodia_ubicacion_nombre: tool.custodia_ubicacion_nombre ?? null,
  fecha_devolucion_esperada: tool.fecha_devolucion_esperada ?? null,
  semaforo_devolucion: tool.semaforo_devolucion ?? null,
});

const ToolDetailsModal: React.FC<ToolDetailsModalProps> = ({
  isOpen,
  tool,
  onClose,
  onRefresh,
  onOpenEntregaFlow,
  onOpenDevolucionFlow,
}) => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showEstado, setShowEstado] = useState(false);
  const [showReubicar, setShowReubicar] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [showEntrega, setShowEntrega] = useState(false);

  const activo = useMemo(() => (tool ? toActivoRow(tool) : null), [tool]);
  const canLoadRelatedData = Boolean(isOpen && tool?.id);

  useEffect(() => {
    if (!isOpen) {
      setShowProfile(false);
      setShowEstado(false);
      setShowReubicar(false);
      setShowEditar(false);
      setShowEntrega(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setShowProfile(false);
    setShowEstado(false);
    setShowReubicar(false);
    setShowEditar(false);
    setShowEntrega(false);
  }, [tool?.id]);

  const { data: trabajadores = [] } = useGet<{
    id: string;
    persona_id: string;
    nombres: string;
    apellidos: string;
    rut: string;
    cargo?: string | null;
  }[]>(
    ['tool-details', 'trabajadores'],
    '/trabajadores',
    undefined,
    { enabled: canLoadRelatedData }
  );
  const { data: ubicaciones = [] } = useGet<{
    id: string;
    nombre: string;
    tipo?: 'bodega' | 'planta' | 'proyecto' | 'taller_mantencion';
  }[]>(
    ['tool-details', 'ubicaciones'],
    '/ubicaciones',
    undefined,
    { enabled: canLoadRelatedData }
  );
  const { data: articulos = [] } = useGet<{
    id: string;
    nombre: string;
    tracking_mode: 'serial' | 'lote';
  }[]>(
    ['tool-details', 'articulos'],
    '/articulos',
    undefined,
    { enabled: canLoadRelatedData }
  );
  const { data: entregaTemplates = [] } = useGet<EntregaTemplate[]>(
    ['tool-details', 'entrega-templates'],
    '/entregas/templates',
    { estado: 'activo' },
    { enabled: canLoadRelatedData }
  );

  if (!isOpen || !tool || !activo || !activo.id) return null;
  const activeActivo: InventoryActivoDetailRow = activo;

  const code = getToolVisibleCode(tool);
  const name = getToolVisibleName(tool);
  const statusRaw = getToolRawStatus(tool);
  const statusLabel = getToolStatusLabel(statusRaw);
  const statusClass = getToolStatusBadgeClasses(statusRaw);
  const serial = getToolVisibleSerial(tool);
  const location = getToolVisibleLocation(tool);
  const responsible = getToolVisibleResponsible(tool);
  const value = getToolVisibleMonetaryValue(tool);
  const article = tool.articulo_nombre ?? tool.nombre ?? tool.articulo?.nombre ?? 'Sin artículo asociado';
  const dateInfo = resolveRelevantDate(tool);
  const flags = getToolActionFlags(tool);

  const entregaMutation = useMutation({
    mutationFn: (payload: EntregaCreatePayload) => createEntrega(payload),
    onSuccess: () => {
      toast.success('Entrega creada correctamente.');
      setShowEntrega(false);
      onRefresh?.();
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (error as { message?: string })?.message ||
        'No se pudo crear la entrega.';
      toast.error(message);
    },
  });

  const canInlineEntrega = Boolean(activeActivo.articulo_id);

  const entregaAction: ActionState = flags.canAssign
    ? { disabled: false }
    : { disabled: true, reason: 'Solo se puede entregar cuando la herramienta está disponible.' };

  const devolucionAction: ActionState = flags.canReturn
    ? { disabled: false }
    : { disabled: true, reason: 'La devolución aplica cuando existe custodia o asignación activa.' };

  const reubicarAction: ActionState = flags.canRelocate
    ? { disabled: false }
    : { disabled: true, reason: 'La reubicación directa solo aplica para herramientas en stock.' };

  const estadoAction: ActionState = flags.canChangeStatus
    ? { disabled: false }
    : { disabled: true, reason: 'Para herramientas asignadas el estado se resuelve desde devolución.' };

  const editarAction: ActionState = flags.canEdit
    ? { disabled: false }
    : { disabled: true, reason: 'No está permitido editar esta herramienta en el estado actual.' };

  const handleEntrega = () => {
    if (canInlineEntrega) {
      setShowEntrega(true);
      return;
    }

    if (onOpenEntregaFlow) {
      onOpenEntregaFlow(tool);
      return;
    }

    // Falta artículo asociado para preselección de activo en modal de entrega.
    onClose();
    navigate('/admin/entregas');
  };

  const handleDevolucion = () => {
    if (onOpenDevolucionFlow) {
      onOpenDevolucionFlow(tool);
      return;
    }

    const params = new URLSearchParams();
    if (tool.custodio_trabajador_id) params.set('trabajador_id', String(tool.custodio_trabajador_id));
    if (tool.id) params.set('activo_id', String(tool.id));
    if (tool.articulo_id) params.set('articulo_id', String(tool.articulo_id));
    if (tool.custodia_id) params.set('custodia_id', String(tool.custodia_id));
    params.set('tool_code', code);
    params.set('tool_name', name);
    params.set('tool_value', value);

    onClose();
    navigate(`/admin/devoluciones${params.size ? `?${params.toString()}` : ''}`);
  };

  const handleSubmodalSuccess = () => {
    onRefresh?.();
  };

  const showResponsibilityBlock = responsible !== 'Sin responsable';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Herramienta ${code}`}>
        <div className="space-y-5">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-dark-blue">{code}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-gray-600">{name}</p>
            {serial && <p className="text-xs text-gray-500">Serie: {serial}</p>}
          </header>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white rounded-lg border border-gray-100 p-4" aria-label="Resumen operacional">
            <InfoItem label="Estado" value={statusLabel} />
            <InfoItem label="Ubicación" value={location} />
            <InfoItem label="Responsable actual" value={responsible} />
            <InfoItem label="Valor bajo responsabilidad" value={value} />
            <InfoItem label="Artículo/Categoría" value={article} />
            <InfoItem label={dateInfo?.label ?? 'Fecha relevante'} value={dateInfo?.value ?? '—'} />
          </section>

          <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            {showResponsibilityBlock ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-900">Responsabilidad activa</p>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Responsable actual:</span> {responsible}
                </p>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Valor bajo responsabilidad:</span> {value}
                </p>
              </div>
            ) : (
              <p className="text-sm text-blue-900">Esta herramienta no tiene responsable asignado actualmente.</p>
            )}
          </section>

          <section className="space-y-3" aria-label="Acciones de herramienta">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Acciones</h4>
            <ActionGroup title="Operación">
              <ActionButton
                label="Entregar a trabajador"
                onClick={handleEntrega}
                disabled={entregaAction.disabled}
                reason={entregaAction.reason ?? (canInlineEntrega ? undefined : 'Sin artículo asociado para preselección automática.')}
                tone={flags.canAssign ? 'primary' : 'neutral'}
              />
              <ActionButton
                label="Recibir devolución"
                onClick={handleDevolucion}
                disabled={devolucionAction.disabled}
                reason={devolucionAction.reason}
                tone={flags.canReturn ? 'primary' : 'neutral'}
              />
            </ActionGroup>
            <ActionGroup title="Ubicación y estado">
              <ActionButton
                label="Reubicar"
                onClick={() => setShowReubicar(true)}
                disabled={reubicarAction.disabled}
                reason={reubicarAction.reason}
              />
              <ActionButton
                label="Cambiar estado"
                onClick={() => setShowEstado(true)}
                disabled={estadoAction.disabled}
                reason={estadoAction.reason}
              />
            </ActionGroup>
            <ActionGroup title="Administración">
              <ActionButton
                label="Editar herramienta"
                onClick={() => setShowEditar(true)}
                disabled={editarAction.disabled}
                reason={editarAction.reason}
              />
              <ActionButton
                label="Ver perfil/historial"
                onClick={() => setShowProfile(true)}
              />
            </ActionGroup>
            <p className="text-xs text-gray-500">
              Al entregar esta herramienta, el trabajador queda asociado a su devolución.
            </p>
          </section>
        </div>
      </Modal>

      {showEntrega && (
        <EntregaCreateModal
          isOpen={showEntrega}
          onClose={() => setShowEntrega(false)}
          onSubmit={async (payload) => {
            await entregaMutation.mutateAsync(payload);
          }}
          isSubmitting={entregaMutation.isPending}
          trabajadores={trabajadores}
          ubicaciones={ubicaciones}
          articulos={articulos}
          templates={entregaTemplates}
          initialActivoId={activeActivo.id}
          initialArticuloId={activeActivo.articulo_id}
          lockActivoSelection
          initialActivoCode={code}
          initialActivoName={name}
          initialActivoValue={value}
          onSuccess={() => {
            setShowEntrega(false);
          }}
        />
      )}

      {showProfile && (
        <ActivoProfileModal
          activoId={activeActivo.id}
          onClose={() => setShowProfile(false)}
          onCambiarEstado={estadoAction.disabled ? undefined : () => {
            setShowProfile(false);
            setShowEstado(true);
          }}
          onReubicar={reubicarAction.disabled ? undefined : () => {
            setShowProfile(false);
            setShowReubicar(true);
          }}
          onEditar={editarAction.disabled ? undefined : () => {
            setShowProfile(false);
            setShowEditar(true);
          }}
        />
      )}

      {showEstado && (
        <CambiarEstadoActivoModal
          activo={activeActivo}
          onClose={() => setShowEstado(false)}
          onSuccess={() => {
            setShowEstado(false);
            handleSubmodalSuccess();
          }}
        />
      )}

      {showReubicar && (
        <ReubicarActivoModal
          activo={activeActivo}
          onClose={() => setShowReubicar(false)}
          onSuccess={() => {
            setShowReubicar(false);
            handleSubmodalSuccess();
          }}
        />
      )}

      {showEditar && (
        <EditarActivoModal
          activo={activeActivo}
          onClose={() => setShowEditar(false)}
          onSuccess={() => {
            setShowEditar(false);
            handleSubmodalSuccess();
          }}
        />
      )}
    </>
  );
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-sm text-gray-800">{value}</p>
  </div>
);

const ActionButton: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  reason?: string;
  tone?: 'primary' | 'neutral';
}> = ({ label, onClick, disabled = false, reason, tone = 'neutral' }) => (
  <div className="space-y-1">
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-full text-left px-3 py-2 rounded-md border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
        tone === 'primary'
          ? 'border-primary-blue bg-primary-blue text-white hover:bg-blue-700'
          : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
    {disabled && reason && <p className="text-xs text-gray-500">{reason}</p>}
  </div>
);

const ActionGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {children}
    </div>
  </div>
);

export default ToolDetailsModal;
