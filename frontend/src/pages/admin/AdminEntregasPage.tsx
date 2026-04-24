import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ConfirmationModal from '../../components/ConfirmationModal';
import Modal from '../../components/Modal';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../hooks/useAuth';
import { useGet } from '../../hooks';
import { useDeliverySignatureEvents } from '../../hooks/useDeliverySignatureEvents';
import {
  getEntregaById,
  createEntrega,
  confirmEntrega,
  anularEntrega,
  deshacerEntrega,
  permanentDeleteEntrega,
  firmarEntregaDispositivo,
  generateEntregaSignatureToken,
  type EntregaRow,
  type EntregaEstado,
  type EntregaCreatePayload,
  type EntregaTemplate,
  type EntregaEstadoDevolucion,
} from '../../services/apiService';
import EntregaCreateModal from '../../components/forms/EntregaCreateModal';
import EntregaFirmaModal from '../../components/forms/EntregaFirmaModal';
import EntregaDetalleModal from '../../components/forms/EntregaDetalleModal';

// ─── Constantes ───────────────────────────────────────────────────────────────

const QUERY_KEY = 'admin-entregas';

const ESTADO_LABELS: Record<EntregaEstado, string> = {
  borrador: 'Borrador',
  pendiente_firma: 'Pendiente confirmación',
  confirmada: 'Confirmada',
  anulada: 'Anulada',
  revertida_admin: 'Revertida',
};

const ESTADO_CLASSES: Record<EntregaEstado, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  pendiente_firma: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-green-100 text-green-800',
  anulada: 'bg-red-100 text-red-700',
  revertida_admin: 'bg-slate-200 text-slate-700',
};

const DEVOLUCION_LABELS: Record<string, string> = {
  devuelta_completa: 'Devuelta',
  parcialmente_devuelta: 'Parcial',
  pendiente_devolucion: 'Pendiente dev.',
};

const DEVOLUCION_CLASSES: Record<string, string> = {
  devuelta_completa: 'bg-emerald-100 text-emerald-700',
  parcialmente_devuelta: 'bg-amber-100 text-amber-700',
  pendiente_devolucion: 'bg-orange-100 text-orange-700',
};

const FILTER_TABS: { label: string; value: EntregaEstado | 'todas' }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Borrador', value: 'borrador' },
  { label: 'Pendiente confirmación', value: 'pendiente_firma' },
  { label: 'Confirmadas', value: 'confirmada' },
  { label: 'Anuladas', value: 'anulada' },
  { label: 'Revertidas', value: 'revertida_admin' },
];

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  const payload = error as { response?: { data?: { message?: string } } };
  return payload?.response?.data?.message ?? 'No se pudo completar la operación.';
};

type TokenShareState = {
  entregaId: string;
  token: string;
  expiraEn: string;
  reused?: boolean;
} | null;

const isTokenStillValid = (expiraEn?: string): boolean => {
  if (!expiraEn) return false;
  const timestamp = new Date(expiraEn).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
};

// ─── Componente ───────────────────────────────────────────────────────────────

const AdminEntregasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useDeliverySignatureEvents({
    onSigned: (event) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

      if (event.metodo === 'qr_link') {
        toast.success('Firma remota recibida. La entrega fue actualizada.');
      }
    },
  });

  // Filtro de estado
  const [filterEstado, setFilterEstado] = useState<EntregaEstado | 'todas'>('todas');

  // Modales
  const [showCreate, setShowCreate] = useState(false);
  const [entregaDetalle, setEntregaDetalle] = useState<EntregaRow | null>(null);
  const [entregaFirma, setEntregaFirma] = useState<EntregaRow | null>(null);
  const [entregaConfirmar, setEntregaConfirmar] = useState<EntregaRow | null>(null);
  const [entregaAnular, setEntregaAnular] = useState<EntregaRow | null>(null);
  const [entregaDeshacer, setEntregaDeshacer] = useState<EntregaRow | null>(null);
  const [entregaEliminar, setEntregaEliminar] = useState<EntregaRow | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [motivoDeshacer, setMotivoDeshacer] = useState('');
  const [tokenShare, setTokenShare] = useState<TokenShareState>(null);
  const [tokenCache, setTokenCache] = useState<Record<string, TokenShareState>>({});

  // Datos
  const filterParams = filterEstado !== 'todas' ? { estado: filterEstado } : undefined;
  const {
    data: entregas = [],
    isLoading,
    error,
  } = useGet<EntregaRow[]>([QUERY_KEY, filterEstado], '/entregas', filterParams);

  const { data: trabajadores = [] } = useGet<unknown[]>([QUERY_KEY, 'trabajadores'], '/trabajadores');
  const { data: ubicaciones = [] } = useGet<unknown[]>([QUERY_KEY, 'ubicaciones'], '/ubicaciones');
  const { data: articulos = [] } = useGet<unknown[]>([QUERY_KEY, 'articulos'], '/articulos');
  const { data: entregaTemplates = [] } = useGet<EntregaTemplate[]>(
    [QUERY_KEY, 'templates'],
    '/entregas/templates',
    { estado: 'activo' }
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload: EntregaCreatePayload) => createEntrega(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Entrega creada correctamente.');
      setShowCreate(false);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmEntrega(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Entrega confirmada correctamente.');
      setEntregaConfirmar(null);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const anularMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => anularEntrega(id, { motivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Entrega anulada correctamente.');
      setEntregaAnular(null);
      setMotivoAnulacion('');
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const deshacerMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => deshacerEntrega(id, { motivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Entrega deshecha correctamente.');
      setEntregaDeshacer(null);
      setMotivoDeshacer('');
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => permanentDeleteEntrega(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Entrega eliminada.');
      setEntregaEliminar(null);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const firmaMutation = useMutation({
    mutationFn: ({
      entregaId,
      firmaBase64,
      textoAceptacion,
    }: {
      entregaId: string;
      firmaBase64: string;
      textoAceptacion: string;
    }) => firmarEntregaDispositivo(entregaId, firmaBase64, textoAceptacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Firma registrada correctamente.');
      setEntregaFirma(null);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const tokenMutation = useMutation({
    mutationFn: (entregaId: string) => generateEntregaSignatureToken(entregaId, 30),
    onSuccess: (result, entregaId) => {
      const nextShare = {
        entregaId,
        token: result.token,
        expiraEn: result.expira_en,
        reused: Boolean(result.reused),
      };

      setTokenShare(nextShare);
      setTokenCache((prev) => ({
        ...prev,
        [entregaId]: nextShare,
      }));
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      if (result.reused) {
        toast.success('QR vigente reutilizado.');
      } else {
        toast.success('QR generado (expira en 30 minutos).');
      }
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const openQrForEntrega = (entregaId: string) => {
    const cached = tokenCache[entregaId];
    if (cached && isTokenStillValid(cached.expiraEn)) {
      setTokenShare({ ...cached, reused: true });
      toast.success('QR vigente reutilizado.');
      return;
    }

    tokenMutation.mutate(entregaId);
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async (payload: EntregaCreatePayload) => {
    await createMutation.mutateAsync(payload);
  };

  const handleFirmar = async (entregaId: string, firmaBase64: string, textoAceptacion: string) => {
    await firmaMutation.mutateAsync({ entregaId, firmaBase64, textoAceptacion });
  };

  // ─── Columnas ─────────────────────────────────────────────────────────────

  const columns = useMemo((): TableColumn<EntregaRow>[] => [
    {
      key: 'creado_en',
      header: 'Fecha',
      render: (_v, row) => {
        if (!row.creado_en) return '—';
        return new Date(row.creado_en).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      },
    },
    {
      key: 'trabajador_id',
      header: 'Trabajador',
      render: (_v, row) =>
        row.nombres && row.apellidos ? `${row.nombres} ${row.apellidos}` : '—',
    },
    {
      key: 'detalles',
      header: 'Ítems',
      render: (_v, row) => row.cantidad_items ?? row.detalles?.length ?? 0,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_v, row) => {
        const estado = row.estado as EntregaEstado;
        const estadoDev = row.estado_devolucion as EntregaEstadoDevolucion | null | undefined;
        return (
          <div className="flex flex-col gap-1 items-start">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_CLASSES[estado] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {ESTADO_LABELS[estado] ?? estado}
            </span>
            {estadoDev && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${DEVOLUCION_CLASSES[estadoDev] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {DEVOLUCION_LABELS[estadoDev] ?? estadoDev}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (_v, row) => {
        const estado = row.estado as EntregaEstado;
        const trabajadorNombre =
          row.nombres && row.apellidos
            ? `${row.nombres} ${row.apellidos}`
            : 'trabajador seleccionado';
        return (
          <div className="flex gap-1 flex-wrap">
            {/* Ver detalle — siempre visible */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const fullDetail = await getEntregaById(row.id);
                  setEntregaDetalle(fullDetail ?? row);
                } catch {
                  setEntregaDetalle(row);
                  toast.error('No se pudo cargar el detalle completo de la entrega.');
                }
              }}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              aria-label={`Ver detalle de entrega para ${trabajadorNombre}`}
            >
              Ver
            </button>

            {/* Firma — solo en borrador */}
            {estado === 'borrador' && (
              <button
                type="button"
                onClick={() => setEntregaFirma(row)}
                className="px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:underline"
                aria-label={`Firmar entrega para ${trabajadorNombre}`}
              >
                Firmar
              </button>
            )}

            {/* QR — flujo principal de firma remota */}
            {(estado === 'borrador' || estado === 'pendiente_firma') && (
              <button
                type="button"
                onClick={() => openQrForEntrega(row.id)}
                className="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                aria-label={`Generar QR de firma para ${trabajadorNombre}`}
              >
                QR
              </button>
            )}

            {/* Confirmar — solo en pendiente_firma */}
            {estado === 'pendiente_firma' && (
              <button
                type="button"
                onClick={() => setEntregaConfirmar(row)}
                className="px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:underline"
                aria-label={`Confirmar entrega de ${trabajadorNombre}`}
              >
                Confirmar
              </button>
            )}

            {/* Anular — en borrador o pendiente_firma */}
            {(estado === 'borrador' || estado === 'pendiente_firma') && (
              <button
                type="button"
                onClick={() => {
                  setEntregaAnular(row);
                  setMotivoAnulacion('');
                }}
                className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:underline"
                aria-label={`Anular entrega de ${trabajadorNombre}`}
              >
                Anular
              </button>
            )}

            {estado === 'confirmada' && (
              <button
                type="button"
                onClick={() => {
                  setEntregaDeshacer(row);
                  setMotivoDeshacer('');
                }}
                className="px-2 py-1 text-xs text-orange-600 hover:text-orange-800 hover:underline"
                aria-label={`Deshacer entrega de ${trabajadorNombre}`}
              >
                Deshacer
              </button>
            )}

            {isAdmin && (estado === 'anulada' || estado === 'revertida_admin') && (
              <button
                type="button"
                onClick={() => setEntregaEliminar(row)}
                className="px-2 py-1 text-xs text-red-700 hover:text-red-900 hover:underline"
                aria-label={`Eliminar entrega de ${trabajadorNombre}`}
              >
                Eliminar
              </button>
            )}
          </div>
        );
      },
    },
  ], [isAdmin]);

  const motivoAnulacionInvalido =
    motivoAnulacion.trim().length > 0 && motivoAnulacion.trim().length < 5;
  const motivoDeshacerInvalido =
    motivoDeshacer.trim().length > 0 && motivoDeshacer.trim().length < 5;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entregas y Confirmaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Crea, firma y confirma recepciones de equipos y herramientas.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva entrega
        </button>
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-1 flex-wrap mb-5" role="tablist" aria-label="Filtrar entregas por estado">
        {FILTER_TABS.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => setFilterEstado(tab.value)}
            role="tab"
            aria-selected={filterEstado === tab.value}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filterEstado === tab.value
                ? 'bg-primary-blue text-white font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {error ? (
        <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
          Error al cargar las entregas. Intente recargar la página.
        </div>
      ) : (
        <ResponsiveTable<EntregaRow>
          columns={columns}
          data={entregas}
          loading={isLoading}
          emptyMessage="No hay entregas registradas."
          getRowKey={(row) => row.id}
        />
      )}

      {/* Modal crear */}
      <EntregaCreateModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
        trabajadores={trabajadores as any}
        ubicaciones={ubicaciones as any}
        articulos={articulos as any}
        templates={entregaTemplates}
      />

      {/* Modal firma */}
      <EntregaFirmaModal
        isOpen={!!entregaFirma}
        onClose={() => setEntregaFirma(null)}
        entrega={entregaFirma}
        onFirmar={handleFirmar}
        isSubmitting={firmaMutation.isPending}
      />

      {/* Modal detalle */}
      <EntregaDetalleModal
        isOpen={!!entregaDetalle}
        onClose={() => setEntregaDetalle(null)}
        entrega={entregaDetalle}
      />

      {/* Confirmar entrega */}
      <ConfirmationModal
        isOpen={!!entregaConfirmar}
        onClose={() => setEntregaConfirmar(null)}
        onConfirm={() => entregaConfirmar && confirmMutation.mutate(entregaConfirmar.id)}
        title="Confirmar entrega"
        message={
          entregaConfirmar
            ? `¿Confirmar la entrega de ${entregaConfirmar.nombres ?? ''} ${entregaConfirmar.apellidos ?? ''}? Esta acción moverá el stock correspondiente.`
            : ''
        }
        confirmText="Confirmar"
        variant="info"
      />

      {/* Modal compartir firma remota */}
      <Modal
        isOpen={!!tokenShare}
        onClose={() => setTokenShare(null)}
        title="Compartir confirmación por QR"
      >
        {tokenShare && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dark-blue">Confirmación remota por QR</h3>
            <p className="text-sm text-gray-600">
              Comparte este QR o enlace con el trabajador para confirmar desde su teléfono.
            </p>

            <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <QRCodeSVG
                value={`${window.location.origin}/firma/${tokenShare.token}`}
                size={180}
                bgColor="#ffffff"
                fgColor="#1E2A4A"
                level="M"
              />
              <p className="text-xs text-gray-500">
                Entrega: <span className="font-medium">{tokenShare.entregaId.slice(0, 8)}</span>
              </p>
              <p className="text-xs text-gray-500">
                Expira: {new Date(tokenShare.expiraEn).toLocaleString('es-CL')}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 text-xs break-all bg-white text-gray-700">
              {`${window.location.origin}/firma/${tokenShare.token}`}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-2 text-xs rounded-md bg-primary-blue text-white hover:bg-blue-700"
                onClick={() => {
                  const link = `${window.location.origin}/firma/${tokenShare.token}`;
                  navigator.clipboard.writeText(link);
                  toast.success('Enlace copiado al portapapeles.');
                }}
              >
                Copiar enlace
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Confirma esta entrega en: ${window.location.origin}/firma/${tokenShare.token}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 text-xs rounded-md bg-green-700 text-white hover:bg-green-800"
              >
                Compartir WhatsApp
              </a>
              <button
                type="button"
                className="px-3 py-2 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setTokenShare(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Anular entrega */}
      <ConfirmationModal
        isOpen={!!entregaAnular}
        onClose={() => {
          setEntregaAnular(null);
          setMotivoAnulacion('');
        }}
        onConfirm={() =>
          entregaAnular &&
          anularMutation.mutate({
            id: entregaAnular.id,
            motivo: motivoAnulacion.trim(),
          })
        }
        title="Anular entrega"
        message={
          entregaAnular
            ? `¿Anular la entrega de ${entregaAnular.nombres ?? ''} ${entregaAnular.apellidos ?? ''}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Anular"
        variant="danger"
        confirmDisabled={motivoAnulacion.trim().length < 5 || anularMutation.isPending}
        confirmDisabledReason={
          motivoAnulacion.trim().length < 5
            ? 'Ingresa un motivo de al menos 5 caracteres para habilitar la anulación.'
            : undefined
        }
      >
        <div className="mt-4">
          <label htmlFor="motivo-anulacion" className="block text-xs font-medium text-gray-600 mb-1">
            Motivo de anulación <span className="text-red-500">*</span>
          </label>
          <textarea
            id="motivo-anulacion"
            rows={3}
            value={motivoAnulacion}
            onChange={(e) => setMotivoAnulacion(e.target.value)}
            placeholder="Indica el motivo (mínimo 5 caracteres)..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            aria-describedby="motivo-anulacion-help"
            aria-invalid={motivoAnulacionInvalido}
          />
          <p id="motivo-anulacion-help" className="mt-1 text-xs text-gray-500">
            Debe quedar evidencia del motivo para auditoría.
          </p>
        </div>
      </ConfirmationModal>

      {/* Deshacer entrega (solo admin) */}
      <ConfirmationModal
        isOpen={!!entregaDeshacer}
        onClose={() => {
          setEntregaDeshacer(null);
          setMotivoDeshacer('');
        }}
        onConfirm={() =>
          entregaDeshacer &&
          deshacerMutation.mutate({
            id: entregaDeshacer.id,
            motivo: motivoDeshacer.trim(),
          })
        }
        title="Deshacer entrega"
        message={
          entregaDeshacer
            ? `¿Deshacer la entrega de ${entregaDeshacer.nombres ?? ''} ${entregaDeshacer.apellidos ?? ''}? Esta acción revertirá inventario y custodias cuando corresponda.`
            : ''
        }
        confirmText="Deshacer"
        variant="warning"
        confirmDisabled={motivoDeshacer.trim().length < 5 || deshacerMutation.isPending}
        confirmDisabledReason={
          motivoDeshacer.trim().length < 5
            ? 'Ingresa un motivo de al menos 5 caracteres para habilitar la reversa.'
            : undefined
        }
      >
        <div className="mt-4">
          <label htmlFor="motivo-deshacer" className="block text-xs font-medium text-gray-600 mb-1">
            Motivo de reversa <span className="text-red-500">*</span>
          </label>
          <textarea
            id="motivo-deshacer"
            rows={3}
            value={motivoDeshacer}
            onChange={(e) => setMotivoDeshacer(e.target.value)}
            placeholder="Indica el motivo (mínimo 5 caracteres)..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            aria-describedby="motivo-deshacer-help"
            aria-invalid={motivoDeshacerInvalido}
          />
          <p id="motivo-deshacer-help" className="mt-1 text-xs text-gray-500">
            Esta acción queda registrada en auditoría.
          </p>
        </div>
      </ConfirmationModal>

      {/* Eliminar entrega definitiva (solo admin y estado cerrado) */}
      <ConfirmationModal
        isOpen={!!entregaEliminar}
        onClose={() => setEntregaEliminar(null)}
        onConfirm={() => entregaEliminar && permanentDeleteMutation.mutate(entregaEliminar.id)}
        title="Eliminar entrega"
        message={
          entregaEliminar
            ? `Vas a eliminar de forma irreversible la entrega de ${entregaEliminar.nombres ?? ''} ${entregaEliminar.apellidos ?? ''}. Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        variant="danger"
        confirmDisabled={permanentDeleteMutation.isPending}
      />
    </div>
  );
};

export default AdminEntregasPage;
