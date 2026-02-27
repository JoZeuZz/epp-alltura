import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ConfirmationModal from '../../components/ConfirmationModal';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import { useGet } from '../../hooks';
import {
  createEntrega,
  confirmEntrega,
  recibirTraslado,
  anularEntrega,
  firmarEntregaDispositivo,
  type EntregaRow,
  type EntregaEstado,
  type EntregaTipo,
  type EntregaCreatePayload,
} from '../../services/apiService';
import EntregaCreateModal from '../../components/forms/EntregaCreateModal';
import EntregaFirmaModal from '../../components/forms/EntregaFirmaModal';
import EntregaDetalleModal from '../../components/forms/EntregaDetalleModal';

// ─── Constantes ───────────────────────────────────────────────────────────────

const QUERY_KEY = 'admin-entregas';

const ESTADO_LABELS: Record<EntregaEstado, string> = {
  borrador: 'Borrador',
  pendiente_firma: 'Pendiente firma',
  en_transito: 'En tránsito',
  recibido: 'Recibido',
  confirmada: 'Confirmada',
  anulada: 'Anulada',
};

const ESTADO_CLASSES: Record<EntregaEstado, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  pendiente_firma: 'bg-yellow-100 text-yellow-800',
  en_transito: 'bg-indigo-100 text-indigo-800',
  recibido: 'bg-teal-100 text-teal-800',
  confirmada: 'bg-green-100 text-green-800',
  anulada: 'bg-red-100 text-red-700',
};

const TIPO_LABELS: Record<EntregaTipo, string> = {
  entrega: 'Entrega',
  prestamo: 'Préstamo',
  traslado: 'Traslado',
};

const TIPO_CLASSES: Record<EntregaTipo, string> = {
  entrega: 'bg-blue-100 text-blue-700',
  prestamo: 'bg-purple-100 text-purple-700',
  traslado: 'bg-orange-100 text-orange-700',
};

const FILTER_TABS: { label: string; value: EntregaEstado | 'todas' }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Borrador', value: 'borrador' },
  { label: 'Pendiente firma', value: 'pendiente_firma' },
  { label: 'En tránsito', value: 'en_transito' },
  { label: 'Recibidas', value: 'recibido' },
  { label: 'Confirmadas', value: 'confirmada' },
  { label: 'Anuladas', value: 'anulada' },
];

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  const payload = error as { response?: { data?: { message?: string } } };
  return payload?.response?.data?.message ?? 'No se pudo completar la operación.';
};

// ─── Componente ───────────────────────────────────────────────────────────────

const AdminEntregasPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Filtro de estado
  const [filterEstado, setFilterEstado] = useState<EntregaEstado | 'todas'>('todas');

  // Modales
  const [showCreate, setShowCreate] = useState(false);
  const [entregaDetalle, setEntregaDetalle] = useState<EntregaRow | null>(null);
  const [entregaFirma, setEntregaFirma] = useState<EntregaRow | null>(null);
  const [entregaConfirmar, setEntregaConfirmar] = useState<EntregaRow | null>(null);
  const [entregaRecibir, setEntregaRecibir] = useState<EntregaRow | null>(null);
  const [entregaAnular, setEntregaAnular] = useState<EntregaRow | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

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
  const { data: lotes = [] } = useGet<unknown[]>([QUERY_KEY, 'lotes'], '/inventario/lotes');

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

  const recibirMutation = useMutation({
    mutationFn: (id: string) => recibirTraslado(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Traslado recibido correctamente.');
      setEntregaRecibir(null);
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
      key: 'tipo',
      header: 'Tipo',
      render: (_v, row) => {
        const tipo = row.tipo as EntregaTipo;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TIPO_CLASSES[tipo] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {TIPO_LABELS[tipo] ?? tipo}
          </span>
        );
      },
    },
    {
      key: 'detalles',
      header: 'Ítems',
      render: (_v, row) => row.detalles?.length ?? 0,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_v, row) => {
        const estado = row.estado as EntregaEstado;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_CLASSES[estado] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {ESTADO_LABELS[estado] ?? estado}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (_v, row) => {
        const estado = row.estado as EntregaEstado;
        return (
          <div className="flex gap-1 flex-wrap">
            {/* Ver detalle — siempre visible */}
            <button
              onClick={() => setEntregaDetalle(row)}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Ver
            </button>

            {/* Firma — solo en borrador */}
            {estado === 'borrador' && (
              <button
                onClick={() => setEntregaFirma(row)}
                className="px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:underline"
              >
                Firmar
              </button>
            )}

            {/* Confirmar — solo en pendiente_firma */}
            {estado === 'pendiente_firma' && (
              <button
                onClick={() => setEntregaConfirmar(row)}
                className="px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:underline"
              >
                Confirmar
              </button>
            )}

            {/* Recibir traslado — solo en en_transito */}
            {estado === 'en_transito' && row.tipo === 'traslado' && (
              <button
                onClick={() => setEntregaRecibir(row)}
                className="px-2 py-1 text-xs text-teal-600 hover:text-teal-800 hover:underline"
              >
                Recibir
              </button>
            )}

            {/* Anular — en borrador o pendiente_firma */}
            {(estado === 'borrador' || estado === 'pendiente_firma') && (
              <button
                onClick={() => {
                  setEntregaAnular(row);
                  setMotivoAnulacion('');
                }}
                className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:underline"
              >
                Anular
              </button>
            )}
          </div>
        );
      },
    },
  ], []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entregas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de entregas, préstamos y traslados de artículos a trabajadores.
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
      <div className="flex gap-1 flex-wrap mb-5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterEstado(tab.value)}
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
        lotes={lotes as any}
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

      {/* Recibir traslado */}
      <ConfirmationModal
        isOpen={!!entregaRecibir}
        onClose={() => setEntregaRecibir(null)}
        onConfirm={() => entregaRecibir && recibirMutation.mutate(entregaRecibir.id)}
        title="Recibir traslado"
        message={
          entregaRecibir
            ? `¿Confirmar recepción del traslado para ${entregaRecibir.nombres ?? ''} ${entregaRecibir.apellidos ?? ''}?`
            : ''
        }
        confirmText="Recibir"
        variant="info"
        confirmDisabled={recibirMutation.isPending}
      />

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
      >
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Motivo de anulación <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={motivoAnulacion}
            onChange={(e) => setMotivoAnulacion(e.target.value)}
            placeholder="Indica el motivo (mínimo 5 caracteres)..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Debe quedar evidencia del motivo para auditoría.
          </p>
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default AdminEntregasPage;
