import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import SignaturePad from '../../components/forms/SignaturePad';
import ReturnAssetSelector, { type ReturnAssetSelection } from '../../components/forms/ReturnAssetSelector';
import { formatQuantityInteger, parseQuantityInteger } from '../../utils/quantity';
import { useAuth, useGet } from '../../hooks';
import {
  filterEligibleCustodias,
  findDuplicateReturnAssetId,
  resolveCustodiaActivoId,
} from './adminDevolucionesGuided.utils';
import {
  createDevolucion,
  getDevolucionById,
  confirmDevolucion,
  firmarDevolucionDispositivo,
  type ReturnEligibleAssetRow,
  type DevolucionRow,
  type DevolucionEstado,
  type DevolucionCreatePayload,
  type DevolucionDisposicion,
  type DevolucionCondicionEntrada,
} from '../../services/apiService';

const QUERY_KEY = 'operacion-devoluciones';
const ACCEPTANCE_TEXT_DEVOLUCION =
  'Confirmo que recibí estos equipos y herramientas y que la condición registrada corresponde a lo recibido.';

const ESTADO_LABELS: Record<DevolucionEstado, string> = {
  borrador: 'Borrador',
  pendiente_firma: 'Pendiente confirmación',
  confirmada: 'Confirmada',
  anulada: 'Anulada',
};

const ESTADO_CLASSES: Record<DevolucionEstado, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  pendiente_firma: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-green-100 text-green-800',
  anulada: 'bg-red-100 text-red-700',
};

const FILTER_TABS: { label: string; value: DevolucionEstado | 'todas' }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Borrador', value: 'borrador' },
  { label: 'Pendiente confirmación', value: 'pendiente_firma' },
  { label: 'Confirmadas', value: 'confirmada' },
  { label: 'Anuladas', value: 'anulada' },
];

interface ReturnDetailDraft {
  articulo_id: string;
  activo_ids: string[];
  custodia_activo_id: string;
  cantidad: number;
  condicion_entrada: DevolucionCondicionEntrada;
  disposicion: DevolucionDisposicion;
  notas: string;
}

const emptyReturnDetail = (): ReturnDetailDraft => ({
  articulo_id: '',
  activo_ids: [],
  custodia_activo_id: '',
  cantidad: 1,
  condicion_entrada: 'ok',
  disposicion: 'devuelto',
  notas: '',
});

const isEmptyReturnDetail = (detail: ReturnDetailDraft): boolean =>
  !detail.articulo_id &&
  detail.activo_ids.length === 0 &&
  !detail.custodia_activo_id &&
  Number(detail.cantidad) === 1 &&
  !String(detail.notas || '').trim();

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  const payload = error as { response?: { data?: { message?: string } } };
  return payload?.response?.data?.message ?? 'No se pudo completar la operación.';
};

const AdminDevolucionesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [filterEstado, setFilterEstado] = useState<DevolucionEstado | 'todas'>('todas');
  const [showCreate, setShowCreate] = useState(false);
  const [devolucionDetalle, setDevolucionDetalle] = useState<DevolucionRow | null>(null);
  const [devolucionFirma, setDevolucionFirma] = useState<DevolucionRow | null>(null);
  const [devolucionConfirmar, setDevolucionConfirmar] = useState<DevolucionRow | null>(null);
  const [guidedSearch, setGuidedSearch] = useState('');
  const [prefillApplied, setPrefillApplied] = useState(false);

  const prefillTrabajadorId = searchParams.get('trabajador_id') || '';
  const prefillActivoId = searchParams.get('activo_id') || '';
  const prefillCustodiaId = searchParams.get('custodia_id') || '';
  const prefillToolCode = searchParams.get('tool_code') || '';
  const prefillToolName = searchParams.get('tool_name') || '';
  const prefillToolValue = searchParams.get('tool_value') || '';

  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePadKey, setSignaturePadKey] = useState(0);

  const [form, setForm] = useState({
    trabajador_id: '',
    ubicacion_recepcion_id: '',
    notas: '',
    detalles: [emptyReturnDetail()],
  });

  const filterParams = filterEstado !== 'todas' ? { estado: filterEstado } : undefined;
  const { data: devoluciones = [], isLoading, error } = useGet<DevolucionRow[]>(
    [QUERY_KEY, filterEstado],
    '/devoluciones',
    filterParams
  );
  const { data: trabajadores = [] } = useGet<any[]>([QUERY_KEY, 'trabajadores'], '/trabajadores');
  const { data: ubicaciones = [] } = useGet<any[]>([QUERY_KEY, 'ubicaciones'], '/ubicaciones');
  const { data: articulos = [] } = useGet<any[]>([QUERY_KEY, 'articulos'], '/articulos');
  const {
    data: eligibleAssets = [],
    isLoading: eligibleAssetsLoading,
    error: eligibleAssetsError,
  } = useGet<ReturnEligibleAssetRow[]>(
    [QUERY_KEY, 'activos-elegibles', form.trabajador_id],
    '/devoluciones/activos-elegibles',
    form.trabajador_id
      ? {
        trabajador_id: form.trabajador_id,
        limit: 100,
      }
      : undefined,
    {
      enabled: showCreate && Boolean(form.trabajador_id),
    }
  );

  const isSerialArticle = (item: { subclasificacion?: string | null }) =>
    String(item?.subclasificacion || '').toLowerCase() !== 'epp';

  const returnableArticles = useMemo(
    () => articulos.filter((item) => isSerialArticle(item)),
    [articulos]
  );

  const ubicacionesById = useMemo(() => {
    const map = new Map<string, string>();
    ubicaciones.forEach((item) => {
      map.set(item.id, item.nombre);
    });
    return map;
  }, [ubicaciones]);

  const statusCounters = useMemo(() => {
    return devoluciones.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.estado === 'borrador') acc.borrador += 1;
        if (item.estado === 'pendiente_firma') acc.pendiente += 1;
        if (item.estado === 'confirmada') acc.confirmada += 1;
        if (item.estado === 'anulada') acc.anulada += 1;
        return acc;
      },
      { total: 0, borrador: 0, pendiente: 0, confirmada: 0, anulada: 0 }
    );
  }, [devoluciones]);

  const eligibleAssetByActivoId = useMemo(
    () => new Map(eligibleAssets.map((asset) => [asset.activo_id, asset])),
    [eligibleAssets]
  );

  const selectedAssetIds = useMemo(
    () => new Set(form.detalles.flatMap((detail) => detail.activo_ids.filter(Boolean))),
    [form.detalles]
  );

  const guidedTotalEligibleCount = useMemo(
    () => eligibleAssets.filter((asset) => !selectedAssetIds.has(asset.activo_id)).length,
    [eligibleAssets, selectedAssetIds]
  );

  const guidedEligibleAssets = useMemo(
    () => filterEligibleCustodias(eligibleAssets, selectedAssetIds, guidedSearch),
    [eligibleAssets, selectedAssetIds, guidedSearch]
  );

  const createMutation = useMutation({
    mutationFn: (payload: DevolucionCreatePayload) => createDevolucion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Devolución creada en borrador.');
      setShowCreate(false);
      setGuidedSearch('');
      setForm({
        trabajador_id: '',
        ubicacion_recepcion_id: '',
        notas: '',
        detalles: [emptyReturnDetail()],
      });
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const signMutation = useMutation({
    mutationFn: ({ devolucionId, firmaBase64, textoAceptacion }: {
      devolucionId: string;
      firmaBase64: string;
      textoAceptacion: string;
    }) => firmarDevolucionDispositivo(devolucionId, firmaBase64, textoAceptacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Firma de devolución registrada.');
      setDevolucionFirma(null);
      setSignatureFile(null);
      setSignaturePadKey((prev) => prev + 1);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmDevolucion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Devolución confirmada.');
      setDevolucionConfirmar(null);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const setReturnDetail = (index: number, key: keyof ReturnDetailDraft, value: string | number | string[]) => {
    setForm((prev) => {
      const next = [...prev.detalles];
      next[index] = { ...next[index], [key]: value } as ReturnDetailDraft;

      if (key === 'articulo_id') {
        next[index].activo_ids = [];
        next[index].custodia_activo_id = '';
        next[index].cantidad = 1;
      }

      if (key === 'activo_ids') {
        const serialIds = Array.isArray(value) ? value.filter(Boolean) : [];
        const selectedAssetId = serialIds[0];
        next[index].custodia_activo_id = selectedAssetId
          ? eligibleAssetByActivoId.get(selectedAssetId)?.custodia_activo_id || ''
          : '';
      }

      return { ...prev, detalles: next };
    });
  };

  const setReturnSelection = (index: number, nextSelection: ReturnAssetSelection[]) => {
    setForm((prev) => {
      const next = [...prev.detalles];
      const selectedAsset = nextSelection[0];
      next[index] = {
        ...next[index],
        custodia_activo_id: selectedAsset?.custodia_activo_id || '',
      };
      return { ...prev, detalles: next };
    });
  };

  const appendGuidedAssetDetail = (asset: ReturnEligibleAssetRow) => {
    setForm((prev) => {
      const alreadySelected = prev.detalles.some((detail) => detail.activo_ids.includes(asset.activo_id));
      if (alreadySelected) {
        return prev;
      }

      const nextDetail: ReturnDetailDraft = {
        articulo_id: asset.articulo_id,
        activo_ids: [asset.activo_id],
        custodia_activo_id: asset.custodia_activo_id,
        cantidad: 1,
        condicion_entrada: 'ok',
        disposicion: 'devuelto',
        notas: '',
      };

      const emptyIndex = prev.detalles.findIndex(isEmptyReturnDetail);
      if (emptyIndex >= 0) {
        const nextDetalles = [...prev.detalles];
        nextDetalles[emptyIndex] = nextDetail;
        return {
          ...prev,
          detalles: nextDetalles,
        };
      }

      return {
        ...prev,
        detalles: [...prev.detalles, nextDetail],
      };
    });
  };

  React.useEffect(() => {
    if (prefillApplied) return;
    if (!prefillTrabajadorId && !prefillActivoId && !prefillCustodiaId) {
      setPrefillApplied(true);
      return;
    }

    setShowCreate(true);
    if (prefillTrabajadorId) {
      setForm((prev) => ({ ...prev, trabajador_id: prefillTrabajadorId }));
    }
  }, [prefillActivoId, prefillApplied, prefillCustodiaId, prefillTrabajadorId]);

  React.useEffect(() => {
    if (prefillApplied) return;
    if (!showCreate) return;
    if (!prefillActivoId && !prefillCustodiaId) {
      setPrefillApplied(true);
      return;
    }
    if (eligibleAssets.length === 0) return;

    const preselected = eligibleAssets.find((asset) => {
      if (prefillCustodiaId && asset.custodia_activo_id === prefillCustodiaId) return true;
      if (prefillActivoId && asset.activo_id === prefillActivoId) return true;
      return false;
    });

    if (preselected) {
      appendGuidedAssetDetail(preselected);
    }
    setPrefillApplied(true);
  }, [eligibleAssets, prefillActivoId, prefillApplied, prefillCustodiaId, showCreate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.trabajador_id || !form.ubicacion_recepcion_id) {
      toast.error('Selecciona trabajador y ubicación de recepción.');
      return;
    }

    const duplicatedAssetId = findDuplicateReturnAssetId(form.detalles);
    if (duplicatedAssetId) {
      const duplicatedCode = eligibleAssetByActivoId.get(duplicatedAssetId)?.codigo || duplicatedAssetId;
      toast.error(`Este activo ya está incluido en otro ítem (${duplicatedCode}).`);
      return;
    }

    for (const detail of form.detalles) {
      const article = returnableArticles.find((item) => item.id === detail.articulo_id);
      if (!article) {
        toast.error('Hay un artículo inválido en el detalle de devolución.');
        return;
      }

      const serialIds = Array.isArray(detail.activo_ids) ? detail.activo_ids.filter(Boolean) : [];
      if (isSerialArticle(article)) {
        if (serialIds.length === 0) {
          toast.error(`Selecciona un equipo o herramienta asignado para ${article.nombre}.`);
          return;
        }

        const custodiaId = resolveCustodiaActivoId(detail, eligibleAssetByActivoId);
        if (!custodiaId) {
          toast.error(`No se encontró un registro activo para ${article.nombre}. Vuelve a seleccionar el activo.`);
          return;
        }
      } else if (Number(detail.cantidad) <= 0) {
        toast.error(`El artículo ${article.nombre} requiere cantidad mayor que cero.`);
        return;
      }
    }

    const payload: DevolucionCreatePayload = {
      trabajador_id: form.trabajador_id,
      ubicacion_recepcion_id: form.ubicacion_recepcion_id,
      notas: form.notas || null,
      detalles: form.detalles.map((detail) => ({
        custodia_activo_id: resolveCustodiaActivoId(detail, eligibleAssetByActivoId),
        articulo_id: detail.articulo_id || null,
        activo_ids: detail.activo_ids.length ? detail.activo_ids : undefined,
        cantidad: detail.activo_ids.length ? 1 : Number(detail.cantidad),
        condicion_entrada: detail.condicion_entrada,
        disposicion: detail.disposicion,
        notas: detail.notas || null,
      })),
    };

    await createMutation.mutateAsync(payload);
  };

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!devolucionFirma?.id) {
      toast.error('No hay devolución seleccionada para firmar.');
      return;
    }

    if (!signatureFile) {
      toast.error('Debes capturar una firma manuscrita.');
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la firma.'));
      reader.readAsDataURL(signatureFile);
    });

    await signMutation.mutateAsync({
      devolucionId: devolucionFirma.id,
      firmaBase64: base64,
      textoAceptacion: ACCEPTANCE_TEXT_DEVOLUCION,
    });
  };

  const columns = useMemo((): TableColumn<DevolucionRow>[] => [
    {
      key: 'creado_en',
      header: 'Fecha',
      render: (_v, row) => row.creado_en
        ? new Date(row.creado_en).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        : '—',
    },
    {
      key: 'trabajador_id',
      header: 'Trabajador',
      render: (_v, row) => row.nombres && row.apellidos ? `${row.nombres} ${row.apellidos}` : '—',
    },
    {
      key: 'ubicacion_recepcion_id',
      header: 'Recepción',
      render: (_v, row) => ubicacionesById.get(row.ubicacion_recepcion_id) || '—',
    },
    {
      key: 'entrega_origen_id',
      header: 'Entrega origen',
      render: (_v, row) => {
        if (!row.entrega_origen_id) return '—';
        const fecha = row.entrega_origen_fecha
          ? new Date(row.entrega_origen_fecha).toLocaleDateString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          })
          : '';
        return (
          <span className="text-xs text-blue-600" title={`Entrega ${row.entrega_origen_id}`}>
            {fecha || 'Ver entrega'}
          </span>
        );
      },
    },
    {
      key: 'cantidad_detalles',
      header: 'Ítems',
      render: (_v, row) => row.cantidad_detalles ?? row.detalles?.length ?? 0,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_v, row) => {
        const estado = row.estado as DevolucionEstado;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_CLASSES[estado] ?? 'bg-gray-100 text-gray-700'}`}>
            {ESTADO_LABELS[estado] ?? estado}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (_v, row) => {
        const estado = row.estado as DevolucionEstado;
        const trabajadorNombre =
          row.nombres && row.apellidos
            ? `${row.nombres} ${row.apellidos}`
            : 'trabajador seleccionado';
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={async () => {
                try {
                  const full = await getDevolucionById(row.id);
                  setDevolucionDetalle(full ?? row);
                } catch {
                  setDevolucionDetalle(row);
                  toast.error('No se pudo cargar el detalle completo de la devolución.');
                }
              }}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              aria-label={`Ver detalle de devolución para ${trabajadorNombre}`}
            >
              Ver
            </button>

            {estado === 'borrador' && (
              <button
                type="button"
                onClick={() => {
                  setDevolucionFirma(row);
                }}
                className="px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:underline"
                aria-label={`Registrar firma de devolución para ${trabajadorNombre}`}
              >
                Registrar firma
              </button>
            )}

            {estado === 'pendiente_firma' && (
              <button
                type="button"
                onClick={() => setDevolucionConfirmar(row)}
                className="px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:underline"
                aria-label={`Confirmar devolución de ${trabajadorNombre}`}
              >
                Confirmar
              </button>
            )}
          </div>
        );
      },
    },
  ], [ubicacionesById]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devoluciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de devoluciones de equipos y herramientas asignados.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nueva devolución
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-semibold text-gray-900">{statusCounters.total}</p>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs text-gray-500">Borrador</p>
          <p className="text-lg font-semibold text-gray-900">{statusCounters.borrador}</p>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs text-gray-500">Pendiente confirmación</p>
          <p className="text-lg font-semibold text-yellow-700">{statusCounters.pendiente}</p>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs text-gray-500">Confirmada</p>
          <p className="text-lg font-semibold text-green-700">{statusCounters.confirmada}</p>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs text-gray-500">Anulada</p>
          <p className="text-lg font-semibold text-red-700">{statusCounters.anulada}</p>
        </div>
      </div>

      <div className="flex gap-1 flex-wrap mb-5" role="tablist" aria-label="Filtrar devoluciones por estado">
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

      {error ? (
        <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
          Error al cargar devoluciones. Intenta recargar la página.
        </div>
      ) : (
        <ResponsiveTable<DevolucionRow>
          columns={columns}
          data={devoluciones}
          loading={isLoading}
          emptyMessage="No hay devoluciones registradas."
          getRowKey={(row) => row.id}
        />
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva devolución">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-dark-blue">Nueva devolución</h3>
          <p className="text-sm text-gray-600">
            Operador actual: <span className="font-medium">{user?.first_name || ''} {user?.last_name || ''}</span>. Este mismo usuario debe registrar firma y confirmación.
          </p>
          {(prefillToolCode || prefillActivoId) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Resumen de herramienta</p>
              <p className="text-sm text-amber-900">
                <span className="font-medium">Código:</span> {prefillToolCode || prefillActivoId}
              </p>
              {prefillToolName && (
                <p className="text-sm text-amber-900">
                  <span className="font-medium">Herramienta:</span> {prefillToolName}
                </p>
              )}
              <p className="text-sm text-amber-900">
                <span className="font-medium">Valor bajo responsabilidad:</span> {prefillToolValue || 'Sin valor registrado'}
              </p>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="devolucion-trabajador" className="block text-xs font-medium text-gray-600">
                  Trabajador <span className="text-red-500">*</span>
                </label>
              <select
                id="devolucion-trabajador"
                className="border rounded-md p-2"
                value={form.trabajador_id}
                onChange={(e) => {
                  const nextWorkerId = e.target.value;
                  setGuidedSearch('');
                  setForm((prev) => ({
                    ...prev,
                    trabajador_id: nextWorkerId,
                    detalles:
                      prev.trabajador_id && prev.trabajador_id !== nextWorkerId
                        ? [emptyReturnDetail()]
                        : prev.detalles,
                  }));
                }}
                required
              >
                <option value="">Selecciona trabajador</option>
                {trabajadores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombres} {item.apellidos}
                  </option>
                ))}
              </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="devolucion-ubicacion" className="block text-xs font-medium text-gray-600">
                  Ubicación recepción <span className="text-red-500">*</span>
                </label>
              <select
                id="devolucion-ubicacion"
                className="border rounded-md p-2"
                value={form.ubicacion_recepcion_id}
                onChange={(e) => setForm((prev) => ({ ...prev, ubicacion_recepcion_id: e.target.value }))}
                required
              >
                <option value="">Ubicación recepción</option>
                {ubicaciones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
              </div>
            </div>

            <label htmlFor="devolucion-notas" className="block text-xs font-medium text-gray-600">
              Notas generales
            </label>
            <textarea
              id="devolucion-notas"
              className="border rounded-md p-2 w-full"
              placeholder="Notas generales"
              value={form.notas}
              onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
            />

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-blue-900">Equipos y herramientas disponibles para devolver</p>
                  <p className="text-xs text-blue-700">
                    Agrega activos asignados con un clic y completa el detalle automáticamente.
                  </p>
                </div>
                <span className="text-xs text-blue-700">
                  {form.trabajador_id
                    ? `${guidedEligibleAssets.length} visibles / ${guidedTotalEligibleCount} disponibles`
                    : 'Selecciona trabajador'}
                </span>
              </div>

              <input
                id="devolucion-guided-search"
                type="text"
                value={guidedSearch}
                onChange={(e) => setGuidedSearch(e.target.value)}
                disabled={!form.trabajador_id}
                placeholder="Buscar por código o serie"
                className="w-full border border-blue-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                aria-label="Buscar equipos o herramientas por código o serie"
              />

              {!form.trabajador_id ? (
                <p className="text-xs text-blue-700">Selecciona trabajador para cargar equipos y herramientas asignados.</p>
              ) : null}

              {form.trabajador_id && eligibleAssetsLoading ? (
                <p className="text-xs text-blue-700">Cargando equipos y herramientas disponibles...</p>
              ) : null}

              {form.trabajador_id && eligibleAssetsError ? (
                <p className="text-xs text-red-600">{toErrorMessage(eligibleAssetsError)}</p>
              ) : null}

              {form.trabajador_id && !eligibleAssetsLoading && !eligibleAssetsError && guidedTotalEligibleCount === 0 ? (
                <p className="text-xs text-blue-700">No hay equipos o herramientas disponibles para este trabajador.</p>
              ) : null}

              {form.trabajador_id && !eligibleAssetsLoading && !eligibleAssetsError && guidedTotalEligibleCount > 0 && guidedEligibleAssets.length === 0 ? (
                <p className="text-xs text-blue-700">No hay coincidencias para la búsqueda actual.</p>
              ) : null}

              {form.trabajador_id && !eligibleAssetsLoading && !eligibleAssetsError && guidedEligibleAssets.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-md border border-blue-100 divide-y divide-blue-100 bg-white">
                  {guidedEligibleAssets.map((asset) => (
                    <div key={asset.activo_id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {asset.codigo} · {asset.articulo_nombre || 'Sin artículo'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {asset.nro_serie ? `Serie: ${asset.nro_serie}` : 'Sin serie'}
                          {asset.ubicacion_actual_nombre ? ` · ${asset.ubicacion_actual_nombre}` : ''}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">Registro: {asset.custodia_activo_id.slice(0, 8)}</p>
                      </div>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded bg-white border border-blue-200 text-blue-700 hover:bg-blue-100"
                        onClick={() => appendGuidedAssetDetail(asset)}
                        aria-label={`Agregar activo ${asset.codigo} al borrador de devolución`}
                      >
                        Agregar
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="text-xs text-blue-700">Activos ya agregados al borrador: {selectedAssetIds.size}.</p>
            </div>

            {form.detalles.map((detail, index) => {
              const article = returnableArticles.find((item) => item.id === detail.articulo_id);
              const isSerial = article ? isSerialArticle(article) : false;

              return (
                <div key={`return-detail-${index}`} className="border rounded-md p-3 bg-gray-50 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <select
                      className="border rounded-md p-2"
                      value={detail.articulo_id}
                      onChange={(e) => setReturnDetail(index, 'articulo_id', e.target.value)}
                      aria-label={`Equipo o herramienta del ítem ${index + 1}`}
                      required
                    >
                      <option value="">Equipo o herramienta</option>
                      {returnableArticles.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>

                    <ReturnAssetSelector
                      value={detail.activo_ids}
                      onChange={(next) => setReturnDetail(index, 'activo_ids', next)}
                      onChangeSelection={(nextSelection) => setReturnSelection(index, nextSelection)}
                      trabajadorId={form.trabajador_id || undefined}
                      articuloId={detail.articulo_id || undefined}
                      excludedIds={form.detalles.flatMap((row, rowIndex) =>
                        rowIndex === index ? [] : (row.activo_ids || []).filter(Boolean)
                      )}
                      disabled={!isSerial}
                      label="Activo a devolver"
                      required={Boolean(isSerial)}
                    />
                  </div>

                  {isSerial ? (
                    <p className="text-xs text-gray-500">
                      {detail.custodia_activo_id
                        ? `Registro activo vinculado: ${detail.custodia_activo_id.slice(0, 8)}`
                        : 'Selecciona un activo para vincular su registro activo.'}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="border rounded-md p-2"
                      placeholder="Cantidad"
                      value={detail.cantidad}
                      disabled={isSerial}
                      onChange={(e) => setReturnDetail(index, 'cantidad', parseQuantityInteger(e.target.value, 1))}
                      aria-label={`Cantidad del ítem ${index + 1}`}
                    />
                    <select
                      className="border rounded-md p-2"
                      value={detail.condicion_entrada}
                      onChange={(e) => setReturnDetail(index, 'condicion_entrada', e.target.value)}
                      aria-label={`Condición de entrada del ítem ${index + 1}`}
                    >
                      <option value="ok">Condición: Ok</option>
                      <option value="usado">Condición: Usado</option>
                      <option value="danado">Condición: Dañado</option>
                      <option value="perdido">Condición: Perdido</option>
                    </select>
                    <select
                      className="border rounded-md p-2"
                      value={detail.disposicion}
                      onChange={(e) => setReturnDetail(index, 'disposicion', e.target.value)}
                      aria-label={`Disposición del ítem ${index + 1}`}
                    >
                      <option value="devuelto">Disposición: Devuelto</option>
                      <option value="mantencion">Disposición: Mantención</option>
                      <option value="perdido">Disposición: Perdido</option>
                      <option value="baja">Disposición: Baja</option>
                    </select>
                    <input
                      className="border rounded-md p-2"
                      placeholder="Notas detalle"
                      value={detail.notas}
                      onChange={(e) => setReturnDetail(index, 'notas', e.target.value)}
                      aria-label={`Notas del ítem ${index + 1}`}
                    />
                  </div>

                  {isSerial && (
                    <p className="text-xs text-gray-500">Para artículos serializados, la cantidad se define por el activo seleccionado.</p>
                  )}

                  <div className="flex justify-between">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded bg-gray-200 text-gray-700"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          detalles: [...prev.detalles, emptyReturnDetail()],
                        }))
                      }
                      aria-label="Agregar nuevo ítem de devolución"
                    >
                      + Agregar ítem
                    </button>

                    {form.detalles.length > 1 && (
                      <button
                        type="button"
                        className="px-3 py-1 text-xs rounded bg-red-100 text-red-700"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            detalles: prev.detalles.filter((_, rowIndex) => rowIndex !== index),
                          }))
                        }
                        aria-label={`Quitar ítem ${index + 1} de devolución`}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-md bg-primary-blue text-white"
              >
                {createMutation.isPending ? 'Guardando...' : 'Crear devolución'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={!!devolucionFirma} onClose={() => setDevolucionFirma(null)} title="Firmar devolución">
        {devolucionFirma && (
          <form onSubmit={handleSign} className="space-y-4">
            <h3 className="text-lg font-semibold text-dark-blue">Registrar firma de devolución</h3>
            <p className="text-sm text-gray-600">
              Esta firma del operador deja la devolución lista para confirmación final.
            </p>
            <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-amber-700 text-xs font-semibold mb-1">Al firmar confirmas lo siguiente:</p>
              <p className="text-amber-900 text-sm leading-relaxed">{ACCEPTANCE_TEXT_DEVOLUCION}</p>
            </div>
            <SignaturePad
              key={`return-sign-${signaturePadKey}`}
              required
              showPreview={false}
              label="Firma del operador"
              onChange={(_dataUrl, file) => setSignatureFile(file)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDevolucionFirma(null)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={signMutation.isPending || !signatureFile}
                className="px-4 py-2 rounded-md bg-primary-blue text-white disabled:opacity-50"
              >
                {signMutation.isPending ? 'Registrando...' : 'Registrar firma'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!devolucionDetalle} onClose={() => setDevolucionDetalle(null)} title="Detalle devolución">
        {devolucionDetalle && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-dark-blue">Detalle de devolución</h3>
            <p className="text-sm text-gray-600">
              Trabajador: <span className="font-medium">{devolucionDetalle.nombres} {devolucionDetalle.apellidos}</span>
            </p>
            <p className="text-sm text-gray-600">
              Recepción: <span className="font-medium">{ubicacionesById.get(devolucionDetalle.ubicacion_recepcion_id) || devolucionDetalle.ubicacion_recepcion_id}</span>
            </p>
            <p className="text-sm text-gray-600">
              Creada: <span className="font-medium">{devolucionDetalle.creado_en ? new Date(devolucionDetalle.creado_en).toLocaleString('es-CL') : '—'}</span>
            </p>
            <p className="text-sm text-gray-600">
              Estado: <span className="font-medium">{ESTADO_LABELS[devolucionDetalle.estado]}</span>
            </p>

            {devolucionDetalle.firma_imagen_url && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-2">Firma registrada</p>
                <img
                  src={devolucionDetalle.firma_imagen_url}
                  alt="Firma de devolución"
                  className="w-full max-h-40 object-contain bg-white rounded border"
                />
                {devolucionDetalle.firmado_en && (
                  <p className="text-xs text-gray-500 mt-2">
                    Firmado en: {new Date(devolucionDetalle.firmado_en).toLocaleString('es-CL')}
                  </p>
                )}
              </div>
            )}

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Equipo/Herramienta</th>
                    <th className="text-left px-3 py-2">Cantidad</th>
                    <th className="text-left px-3 py-2">Condición</th>
                    <th className="text-left px-3 py-2">Disposición</th>
                  </tr>
                </thead>
                <tbody>
                  {(devolucionDetalle.detalles || []).map((detail) => (
                    <tr key={detail.id} className="border-t">
                      <td className="px-3 py-2">{detail.articulo_nombre || detail.activo_codigo || detail.articulo_id}</td>
                      <td className="px-3 py-2">{formatQuantityInteger(detail.cantidad)}</td>
                      <td className="px-3 py-2">{detail.condicion_entrada}</td>
                      <td className="px-3 py-2">{detail.disposicion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={!!devolucionConfirmar}
        onClose={() => setDevolucionConfirmar(null)}
        onConfirm={() => devolucionConfirmar && confirmMutation.mutate(devolucionConfirmar.id)}
        title="Confirmar devolución"
        message={
          devolucionConfirmar
            ? `¿Confirmar la devolución de ${devolucionConfirmar.nombres ?? ''} ${devolucionConfirmar.apellidos ?? ''}?`
            : ''
        }
        confirmText="Confirmar"
        variant="info"
        confirmDisabled={confirmMutation.isPending}
      />
    </div>
  );
};

export default AdminDevolucionesPage;
