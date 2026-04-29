import React, { useMemo, useState } from 'react';
import { useLoaderData, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { post } from '../../services/apiService';
import { getEntregaById } from '../../services/apiService';
import SignaturePad from '../../components/forms/SignaturePad';
import AssetUnitSelector from '../../components/forms/AssetUnitSelector';
import ReturnAssetSelector from '../../components/forms/ReturnAssetSelector';
import { parseQuantityInteger } from '../../utils/quantity';
import { useDeliverySignatureEvents } from '../../hooks/useDeliverySignatureEvents';

interface SupervisorOperationsLoaderData {
  trabajadores?: any[];
  ubicaciones?: any[];
  articulos?: any[];
  entregas?: any[];
  devoluciones?: any[];
  stock?: any[];
  proveedores?: any[];
}

interface UbicacionOption {
  id: string;
  nombre: string;
  tipo?: 'bodega' | 'planta' | 'proyecto' | 'taller_mantencion';
}

interface ArticuloOption {
  id: string;
  nombre: string;
  tracking_mode?: 'serial' | 'lote';
}

const trackingModeLabel = (mode?: ArticuloOption['tracking_mode']) => {
  if (mode === 'lote') return 'Por Lote';
  return 'Por Unidad';
};

const emptyDeliveryDetail = () => ({
  articulo_id: '',
  activo_ids: [] as string[],
  lote_id: '',
  cantidad: 1,
  condicion_salida: 'ok',
  notas: '',
});

const emptyReturnDetail = () => ({
  articulo_id: '',
  activo_ids: [] as string[],
  lote_id: '',
  cantidad: 1,
  condicion_entrada: 'ok',
  disposicion: 'devuelto',
  notas: '',
});

const todayIso = () => new Date().toISOString().slice(0, 10);

const ACCEPTANCE_TEXT_DEFAULT =
  'Confirmo que recibo los equipos y herramientas indicados en buen estado y me comprometo a su uso y cuidado responsable.';

const ACCEPTANCE_TEXT_DEVOLUCION =
  'Confirmo que recibo la devolución y que la condición de entrada quedó registrada correctamente.';

interface DeliveryTokenMeta {
  token: string;
  expira_en?: string;
}

const isTokenStillValid = (expiraEn?: string): boolean => {
  if (!expiraEn) return false;
  const timestamp = new Date(expiraEn).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
};

const SupervisorOperationsPage: React.FC = () => {
  const loader = useLoaderData() as SupervisorOperationsLoaderData;
  const location = useLocation();

  const [trabajadores] = useState<any[]>(loader.trabajadores || []);
  const [ubicaciones] = useState<UbicacionOption[]>(loader.ubicaciones || []);
  const [articulos] = useState<ArticuloOption[]>(loader.articulos || []);
  const [stock] = useState<any[]>(loader.stock || []);
  const [entregas, setEntregas] = useState<any[]>(loader.entregas || []);
  const [devoluciones, setDevoluciones] = useState<any[]>(loader.devoluciones || []);

  const [tokenMap, setTokenMap] = useState<Record<string, DeliveryTokenMeta>>({});

  useDeliverySignatureEvents({
    onSigned: async (event) => {
      if (event.metodo !== 'qr_link') {
        return;
      }

      try {
        const updatedEntrega = await getEntregaById(event.entrega_id);
        setEntregas((prev) => {
          const index = prev.findIndex((item) => item.id === event.entrega_id);
          if (index === -1) {
            return prev;
          }

          const next = [...prev];
          next[index] = { ...next[index], ...updatedEntrega };
          return next;
        });
      } catch {
        setEntregas((prev) =>
          prev.map((item) =>
            item.id === event.entrega_id ? { ...item, firmado_en: event.firmado_en } : item
          )
        );
      }

      setTokenMap((prev) => {
        if (!prev[event.entrega_id]) {
          return prev;
        }

        const next = { ...prev };
        delete next[event.entrega_id];
        return next;
      });

      toast.success('Firma remota recibida. Ya puedes confirmar la entrega.');
    },
  });

  const [deliveryForm, setDeliveryForm] = useState({
    trabajador_id: '',
    ubicacion_origen_id: '',
    ubicacion_destino_id: '',
    nota_destino: '',
    detalles: [emptyDeliveryDetail()],
  });

  const [signatureForm, setSignatureForm] = useState({
    entregaId: '',
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePadKey, setSignaturePadKey] = useState(0);

  const [returnForm, setReturnForm] = useState({
    trabajador_id: '',
    ubicacion_recepcion_id: '',
    notas: '',
    detalles: [emptyReturnDetail()],
  });

  const [returnSignatureForm, setReturnSignatureForm] = useState({
    devolucionId: '',
  });
  const [returnSignatureFile, setReturnSignatureFile] = useState<File | null>(null);
  const [returnSignaturePadKey, setReturnSignaturePadKey] = useState(0);

  const [purchaseForm, setPurchaseForm] = useState({
    proveedor_id: '',
    tipo: 'factura',
    numero: '',
    fecha: todayIso(),
    notas: '',
    articulo_id: '',
    ubicacion_id: '',
    cantidad: 1,
    costo_unitario: 0,
    codigo_lote: '',
    activos: [{ codigo: '' }] as Array<{ codigo: string }>,
  });

  const [proveedores, setProveedores] = useState<any[]>(loader.proveedores || []);
  const [newProveedorNombre, setNewProveedorNombre] = useState('');

  const section = location.pathname.split('/').pop() || 'dashboard';

  const pendingDeliveries = useMemo(
    () => entregas.filter((item) => item.estado === 'borrador' || item.estado === 'pendiente_firma'),
    [entregas]
  );

  const pendingReturns = useMemo(
    () => devoluciones.filter((item) => item.estado === 'borrador' || item.estado === 'pendiente_firma'),
    [devoluciones]
  );

  const selectedPurchaseArticle = useMemo(
    () => articulos.find((item) => item.id === purchaseForm.articulo_id),
    [articulos, purchaseForm.articulo_id]
  );

  const setDeliveryDetail = (index: number, key: string, value: string | number | string[]) => {
    setDeliveryForm((prev) => {
      const detalles = [...prev.detalles];
      detalles[index] = { ...detalles[index], [key]: value };
      return { ...prev, detalles };
    });
  };

  const availableOriginLocations = useMemo(
    () => ubicaciones.filter((item) => !item.tipo || item.tipo === 'bodega'),
    [ubicaciones]
  );

  const availableDestinationLocations = useMemo(
    () => ubicaciones.filter((item) => !item.tipo || item.tipo === 'planta'),
    [ubicaciones]
  );

  const returnableArticles = useMemo(
    () => articulos.filter((item) => item.tracking_mode === 'serial'),
    [articulos]
  );

  const getArticuloById = (articuloId: string) => articulos.find((item) => item.id === articuloId);

  const setReturnDetail = (index: number, key: string, value: string | number | string[]) => {
    setReturnForm((prev) => {
      const detalles = [...prev.detalles];
      detalles[index] = { ...detalles[index], [key]: value };

      if (key === 'articulo_id') {
        detalles[index].activo_ids = [];
        detalles[index].lote_id = '';
        detalles[index].cantidad = 1;
      }

      return { ...prev, detalles };
    });
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!deliveryForm.trabajador_id) {
        toast.error('Selecciona trabajador.');
        return;
      }

      if (!deliveryForm.ubicacion_origen_id || !deliveryForm.ubicacion_destino_id) {
        toast.error('Selecciona ubicación de origen y destino.');
        return;
      }

      if (deliveryForm.ubicacion_origen_id === deliveryForm.ubicacion_destino_id) {
        toast.error('La ubicación de origen y destino no puede ser la misma.');
        return;
      }

      const selectedDeliveryAssetIds = new Set<string>();

      for (const detail of deliveryForm.detalles) {
        const art = getArticuloById(detail.articulo_id);
        if (!art) {
          toast.error('Hay un artículo inválido en el detalle de entrega.');
          return;
        }

        if (art.tracking_mode === 'serial') {
          const serialIds = Array.isArray(detail.activo_ids) ? detail.activo_ids.filter(Boolean) : [];
          if (serialIds.length === 0) {
            toast.error(`El artículo ${art.nombre} requiere al menos un activo serializado.`);
            return;
          }

          if (new Set(serialIds).size !== serialIds.length) {
            toast.error(`El artículo ${art.nombre} tiene activos serializados duplicados.`);
            return;
          }

          for (const serialId of serialIds) {
            if (selectedDeliveryAssetIds.has(serialId)) {
              toast.error(`No puedes repetir el mismo activo (${serialId}) en más de un ítem.`);
              return;
            }
            selectedDeliveryAssetIds.add(serialId);
          }
        }

        if (art.tracking_mode && art.tracking_mode !== 'serial') {
          toast.error(`El artículo ${art.nombre} no cumple política V2: solo serializados.`);
          return;
        }
      }

      const payload = {
        ...deliveryForm,
        trabajador_id: deliveryForm.trabajador_id,
        detalles: deliveryForm.detalles.map((detail) => ({
          ...detail,
          activo_ids: detail.activo_ids?.length ? detail.activo_ids : undefined,
          lote_id: detail.lote_id || null,
          cantidad: detail.activo_ids?.length ? undefined : Number(detail.cantidad),
          notas: detail.notas || null,
        })),
      };

      const created = await post<any>('/entregas', payload);
      setEntregas((prev) => [created, ...prev]);
      setDeliveryForm((prev) => ({
        ...prev,
        trabajador_id: '',
        nota_destino: '',
        detalles: [emptyDeliveryDetail()],
      }));
      toast.success('Entrega creada en borrador.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo crear la entrega');
    }
  };

  const handleGenerateToken = async (entregaId: string) => {
    const cached = tokenMap[entregaId];
    if (cached && isTokenStillValid(cached.expira_en)) {
      toast.success('QR vigente reutilizado.');
      return;
    }

    try {
      const response = await post<any>(`/firmas/entregas/${entregaId}/token`, { expira_minutos: 30 });
      setTokenMap((prev) => ({
        ...prev,
        [entregaId]: {
          token: response.token,
          expira_en: response.expira_en,
        },
      }));
      if (response.reused) {
        toast.success('QR vigente reutilizado.');
      } else {
        toast.success('QR de firma generado (expira en 30 minutos).');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo generar token');
    }
  };

  const handleSignInDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signatureForm.entregaId) {
      toast.error('Selecciona una entrega para registrar firma.');
      return;
    }

    if (!signatureFile) {
      toast.error('Debes capturar una firma manuscrita antes de continuar.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('firma_archivo', signatureFile, signatureFile.name);
      formData.append('texto_aceptacion', ACCEPTANCE_TEXT_DEFAULT);

      await post(`/firmas/entregas/${signatureForm.entregaId}/firmar-dispositivo`, formData);

      setEntregas((prev) =>
        prev.map((item) =>
          item.id === signatureForm.entregaId ? { ...item, estado: 'pendiente_firma' } : item
        )
      );
      setSignatureFile(null);
      setSignaturePadKey((prev) => prev + 1);
      toast.success('Firma registrada en dispositivo compartido.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo registrar la firma');
    }
  };

  const handleConfirmDelivery = async (entregaId: string) => {
    try {
      const confirmed = await post<any>(`/entregas/${entregaId}/confirm`);
      setEntregas((prev) => prev.map((item) => (item.id === entregaId ? confirmed : item)));
      toast.success('Entrega confirmada.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo confirmar la entrega');
    }
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!returnForm.trabajador_id) {
        toast.error('Selecciona trabajador.');
        return;
      }

      if (!returnForm.ubicacion_recepcion_id) {
        toast.error('Selecciona ubicación de recepción.');
        return;
      }

      const selectedReturnAssetIds = new Set<string>();

      for (const detail of returnForm.detalles) {
        const art = getArticuloById(detail.articulo_id);

        if (!art) {
          toast.error('Hay un artículo inválido en el detalle de devolución.');
          return;
        }

        const serialIds = Array.isArray(detail.activo_ids) ? detail.activo_ids.filter(Boolean) : [];

        if (art.tracking_mode === 'serial') {
          if (serialIds.length === 0) {
            toast.error(`El artículo ${art.nombre} requiere seleccionar un activo.`);
            return;
          }

          if (new Set(serialIds).size !== serialIds.length) {
            toast.error(`El artículo ${art.nombre} tiene activos duplicados.`);
            return;
          }

          for (const serialId of serialIds) {
            if (selectedReturnAssetIds.has(serialId)) {
              toast.error(`No puedes repetir el mismo activo (${serialId}) en más de un ítem.`);
              return;
            }
            selectedReturnAssetIds.add(serialId);
          }
        } else if (Number(detail.cantidad) <= 0) {
          toast.error(`El artículo ${art.nombre} requiere cantidad mayor que cero.`);
          return;
        }
      }

      const payload = {
        ...returnForm,
        detalles: returnForm.detalles.map((detail) => ({
          ...detail,
          articulo_id: detail.articulo_id || null,
          activo_ids: detail.activo_ids?.length ? detail.activo_ids : undefined,
          lote_id: detail.lote_id || null,
          cantidad: detail.activo_ids?.length ? 1 : Number(detail.cantidad),
          notas: detail.notas || null,
        })),
      };

      const created = await post<any>('/devoluciones', payload);
      setDevoluciones((prev) => [created, ...prev]);
      setReturnForm((prev) => ({ ...prev, notas: '', detalles: [emptyReturnDetail()] }));
      toast.success('Devolución creada en borrador.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo crear la devolución');
    }
  };

  const handleConfirmReturn = async (devolucionId: string) => {
    try {
      const confirmed = await post<any>(`/devoluciones/${devolucionId}/confirm`);
      setDevoluciones((prev) => prev.map((item) => (item.id === devolucionId ? confirmed : item)));
      toast.success('Devolución confirmada.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo confirmar la devolución');
    }
  };

  const handleSignReturnInDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!returnSignatureForm.devolucionId) {
      toast.error('Selecciona una devolución para registrar firma.');
      return;
    }

    if (!returnSignatureFile) {
      toast.error('Debes capturar una firma manuscrita antes de continuar.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('firma_archivo', returnSignatureFile, returnSignatureFile.name);
      formData.append('texto_aceptacion', ACCEPTANCE_TEXT_DEVOLUCION);

      await post(`/devoluciones/${returnSignatureForm.devolucionId}/firmar-dispositivo`, formData);

      setDevoluciones((prev) =>
        prev.map((item) =>
          item.id === returnSignatureForm.devolucionId
            ? { ...item, estado: 'pendiente_firma' }
            : item
        )
      );
      setReturnSignatureFile(null);
      setReturnSignaturePadKey((prev) => prev + 1);
      toast.success('Firma de devolución registrada.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo registrar la firma de devolución');
    }
  };

  const handleCreateProveedor = async () => {
    if (!newProveedorNombre.trim()) {
      toast.error('Debes ingresar un nombre para el proveedor.');
      return;
    }

    try {
      const created = await post<any>('/proveedores', { nombre: newProveedorNombre.trim() });
      setProveedores((prev) => [...prev, created]);
      setNewProveedorNombre('');
      toast.success('Proveedor creado.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo crear proveedor');
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validActivos = purchaseForm.activos.filter((a) => a.codigo.trim());

      const trackingMode = selectedPurchaseArticle?.tracking_mode;
      const detail: any = {
        articulo_id: purchaseForm.articulo_id,
        ubicacion_id: purchaseForm.ubicacion_id,
        cantidad: Number(purchaseForm.cantidad),
        costo_unitario: Number(purchaseForm.costo_unitario),
      };

      if (trackingMode === 'serial') {
        detail.activos = validActivos.map((a) => ({ codigo: a.codigo.trim() }));
        detail.cantidad = validActivos.length;
      }

      if (trackingMode === 'lote' || purchaseForm.codigo_lote) {
        detail.lote = {
          codigo_lote: purchaseForm.codigo_lote || null,
        };
      }

      await post('/compras', {
        documento_compra: {
          proveedor_id: purchaseForm.proveedor_id,
          tipo: purchaseForm.tipo,
          numero: purchaseForm.numero,
          fecha: purchaseForm.fecha,
        },
        notas: purchaseForm.notas || null,
        detalles: [detail],
      });

      toast.success('Ingreso de inventario registrado.');
      setPurchaseForm((prev) => ({
        ...prev,
        numero: '',
        notas: '',
        activos: [{ codigo: '' }],
        codigo_lote: '',
      }));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo registrar la compra');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Operación Supervisora</h1>
        <p className="text-neutral-gray mt-1">
          {section === 'dashboard' && 'Gestiona ingresos de inventario y consulta stock disponible.'}
          {section === 'operaciones' && 'Registra entregas y devoluciones, y confirma recepciones pendientes.'}
        </p>
      </div>

      <section className="bg-white rounded-lg shadow-md p-5">
        <h2 className="text-lg font-semibold text-dark-blue mb-4">Registrar entrega</h2>
        <form className="space-y-3" onSubmit={handleCreateDelivery}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              data-testid="delivery-worker-select"
              className="border rounded-md p-2"
              value={deliveryForm.trabajador_id}
              onChange={(e) =>
                setDeliveryForm((prev) => ({ ...prev, trabajador_id: e.target.value }))
              }
              required
            >
              <option value="">Selecciona trabajador</option>
              {trabajadores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombres} {item.apellidos}
                </option>
              ))}
            </select>
            <select
              data-testid="delivery-origin-select"
              className="border rounded-md p-2"
              value={deliveryForm.ubicacion_origen_id}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, ubicacion_origen_id: e.target.value }))}
              required
            >
              <option value="">Ubicación origen</option>
              {availableOriginLocations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
            <select
              data-testid="delivery-destination-select"
              className="border rounded-md p-2"
              value={deliveryForm.ubicacion_destino_id}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, ubicacion_destino_id: e.target.value }))}
              required
            >
              <option value="">Ubicación destino</option>
              {availableDestinationLocations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="border rounded-md p-2 w-full"
            placeholder="Observación (opcional)"
            value={deliveryForm.nota_destino}
            onChange={(e) => setDeliveryForm((prev) => ({ ...prev, nota_destino: e.target.value }))}
          />

          <p className="text-xs text-gray-500">Solo se permiten activos serializados en este flujo.</p>

          {deliveryForm.detalles.map((detail, index) => (
            <div key={`detail-${index}`} className="border rounded-md p-3 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  data-testid={`delivery-article-select-${index}`}
                  className="border rounded-md p-2"
                  value={detail.articulo_id}
                  onChange={(e) => {
                    const articuloId = e.target.value;
                    setDeliveryDetail(index, 'articulo_id', articuloId);
                    const art = getArticuloById(articuloId);
                    if (art?.tracking_mode !== 'serial') {
                      setDeliveryDetail(index, 'activo_ids', []);
                    }
                    if (art?.tracking_mode !== 'lote') {
                      setDeliveryDetail(index, 'lote_id', '');
                    }
                    if (art?.tracking_mode === 'serial') {
                      setDeliveryDetail(index, 'cantidad', 1);
                    }
                  }}
                  required
                >
                  <option value="">Artículo</option>
                  {articulos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
                <div className="md:col-span-2">
                  <AssetUnitSelector
                    value={detail.activo_ids || []}
                    onChange={(next) => setDeliveryDetail(index, 'activo_ids', next)}
                    articuloId={detail.articulo_id || undefined}
                    ubicacionId={deliveryForm.ubicacion_origen_id || undefined}
                    excludedIds={deliveryForm.detalles.flatMap((row, rowIndex) =>
                      rowIndex === index ? [] : (row.activo_ids || []).filter(Boolean)
                    )}
                    label="Seleccionar activo"
                    disabled={getArticuloById(detail.articulo_id)?.tracking_mode !== 'serial'}
                  />
                </div>
                <input
                  data-testid={`delivery-quantity-input-${index}`}
                  className="border rounded-md p-2"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Cantidad"
                  value={detail.cantidad}
                  onChange={(e) => setDeliveryDetail(index, 'cantidad', parseQuantityInteger(e.target.value, 1))}
                  disabled={getArticuloById(detail.articulo_id)?.tracking_mode === 'serial'}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <select
                  className="border rounded-md p-2"
                  value={detail.condicion_salida}
                  onChange={(e) => setDeliveryDetail(index, 'condicion_salida', e.target.value)}
                >
                  <option value="ok">OK</option>
                  <option value="usado">Usado</option>
                  <option value="danado">Dañado</option>
                </select>
                <input
                  className="border rounded-md p-2 md:col-span-2"
                  placeholder="Notas del detalle"
                  value={detail.notas}
                  onChange={(e) => setDeliveryDetail(index, 'notas', e.target.value)}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-md border"
              onClick={() =>
                setDeliveryForm((prev) => ({ ...prev, detalles: [...prev.detalles, emptyDeliveryDetail()] }))
              }
            >
              Agregar Ítem
            </button>
            <button
              data-testid="delivery-create-submit"
              type="submit"
              className="px-3 py-2 rounded-md bg-primary-blue text-white"
            >
              Crear borrador
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-md p-5">
        <h2 className="text-lg font-semibold text-dark-blue mb-4">Confirmar entregas</h2>

        <form className="space-y-3 mb-4" onSubmit={handleSignInDevice}>
          <select
            className="border rounded-md p-2"
            value={signatureForm.entregaId}
            onChange={(e) => {
              const entregaId = e.target.value;
              setSignatureForm({ entregaId });
            }}
          >
            <option value="">Selecciona entrega</option>
            {pendingDeliveries.map((item) => (
              <option key={item.id} value={item.id}>
                Entrega {item.id.slice(0, 8)} · {item.estado}
              </option>
            ))}
          </select>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            {ACCEPTANCE_TEXT_DEFAULT}
          </div>
          <SignaturePad
            key={`warehouse-signature-${signaturePadKey}`}
            required
            label="Firma del trabajador"
            onChange={(_dataUrl, file) => setSignatureFile(file)}
          />
          <button className="px-3 py-2 rounded-md bg-dark-blue text-white" type="submit">
            Registrar firma local
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2">Entrega</th>
                <th className="text-left py-2 px-2">Estado</th>
                <th className="text-left py-2 px-2">QR de confirmación</th>
                <th className="text-left py-2 px-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingDeliveries.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0 border-gray-100">
                  <td className="py-2 px-2">{item.id.slice(0, 8)}</td>
                  <td className="py-2 px-2">{item.estado}</td>
                  <td className="py-3 px-2">
                    {tokenMap[item.id] ? (
                      <div className="flex flex-col items-start gap-2">
                        <QRCodeSVG
                          value={`${window.location.origin}/firma/${tokenMap[item.id].token}`}
                          size={120}
                          bgColor="#ffffff"
                          fgColor="#1E2A4A"
                          level="M"
                        />
                        {tokenMap[item.id].expira_en && (
                          <span className="text-xs text-gray-500">
                            Expira: {new Date(tokenMap[item.id].expira_en as string).toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const link = `${window.location.origin}/firma/${tokenMap[item.id].token}`;
                            navigator.clipboard.writeText(
                              link
                            );
                            toast.success('Enlace copiado al portapapeles.');
                          }}
                          className="text-xs text-primary-blue underline hover:text-blue-800 transition-colors"
                        >
                          Copiar enlace
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Firma esta entrega en: ${window.location.origin}/firma/${tokenMap[item.id].token}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-green-700 underline hover:text-green-900 transition-colors"
                        >
                          Compartir por WhatsApp
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Sin QR</span>
                    )}
                  </td>
                  <td className="py-2 px-2 flex gap-2 flex-wrap">
                    <button
                      className="px-2 py-1 text-xs rounded bg-gray-700 text-white"
                      onClick={() => handleGenerateToken(item.id)}
                    >
                      QR
                    </button>
                    <button
                      className="px-2 py-1 text-xs rounded bg-primary-blue text-white"
                      onClick={() => handleConfirmDelivery(item.id)}
                    >
                      Confirmar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-5">
        <h2 className="text-lg font-semibold text-dark-blue mb-4">Registrar devolución</h2>
        <form className="space-y-3" onSubmit={handleCreateReturn}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              className="border rounded-md p-2"
              value={returnForm.trabajador_id}
              onChange={(e) => setReturnForm((prev) => ({ ...prev, trabajador_id: e.target.value }))}
              required
            >
              <option value="">Trabajador</option>
              {trabajadores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombres} {item.apellidos}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md p-2"
              value={returnForm.ubicacion_recepcion_id}
              onChange={(e) =>
                setReturnForm((prev) => ({ ...prev, ubicacion_recepcion_id: e.target.value }))
              }
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
          <textarea
            className="border rounded-md p-2 w-full"
            placeholder="Observación (opcional)"
            value={returnForm.notas}
            onChange={(e) => setReturnForm((prev) => ({ ...prev, notas: e.target.value }))}
          />

          {returnForm.detalles.map((detail, index) => {
            const selectedArticle = getArticuloById(detail.articulo_id);
            const isSerial = selectedArticle?.tracking_mode === 'serial';

            return (
            <div key={`return-detail-${index}`} className="border rounded-md p-3 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  className="border rounded-md p-2"
                  value={detail.articulo_id}
                  onChange={(e) => setReturnDetail(index, 'articulo_id', e.target.value)}
                >
                  <option value="">Artículo</option>
                  {returnableArticles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
                <div className="md:col-span-2">
                  <ReturnAssetSelector
                    value={detail.activo_ids || []}
                    onChange={(next) => setReturnDetail(index, 'activo_ids', next)}
                    trabajadorId={returnForm.trabajador_id || undefined}
                    articuloId={detail.articulo_id || undefined}
                    excludedIds={returnForm.detalles.flatMap((row, rowIndex) =>
                      rowIndex === index ? [] : (row.activo_ids || []).filter(Boolean)
                    )}
                    label="Seleccionar activo"
                    disabled={!isSerial}
                  />
                </div>
                <input
                  className="border rounded-md p-2"
                  placeholder="Lote ID"
                  value={detail.lote_id}
                  onChange={(e) => setReturnDetail(index, 'lote_id', e.target.value)}
                  disabled={isSerial}
                />
                <input
                  className="border rounded-md p-2"
                  type="number"
                  min={1}
                  step={1}
                  value={detail.cantidad}
                  onChange={(e) => setReturnDetail(index, 'cantidad', parseQuantityInteger(e.target.value, 1))}
                  disabled={isSerial}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <select
                  className="border rounded-md p-2"
                  value={detail.condicion_entrada}
                  onChange={(e) => setReturnDetail(index, 'condicion_entrada', e.target.value)}
                >
                  <option value="ok">OK</option>
                  <option value="usado">Usado</option>
                  <option value="danado">Dañado</option>
                  <option value="perdido">Perdido</option>
                </select>
                <select
                  className="border rounded-md p-2"
                  value={detail.disposicion}
                  onChange={(e) => setReturnDetail(index, 'disposicion', e.target.value)}
                >
                  <option value="devuelto">Devuelto</option>
                  <option value="perdido">Perdido</option>
                  <option value="baja">Baja</option>
                  <option value="mantencion">Mantención</option>
                </select>
                <input
                  className="border rounded-md p-2"
                  placeholder="Notas"
                  value={detail.notas}
                  onChange={(e) => setReturnDetail(index, 'notas', e.target.value)}
                />
              </div>
            </div>
            );
          })}

          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-md border"
              onClick={() => setReturnForm((prev) => ({ ...prev, detalles: [...prev.detalles, emptyReturnDetail()] }))}
            >
              Agregar Ítem Devolución
            </button>
            <button type="submit" className="px-3 py-2 rounded-md bg-primary-blue text-white">
              Crear borrador
            </button>
          </div>
        </form>

        <div className="mt-4">
          <h3 className="font-semibold text-dark-blue mb-2">Confirmar devoluciones</h3>
          <form className="space-y-2 mb-3" onSubmit={handleSignReturnInDevice}>
            <select
              className="border rounded-md p-2 w-full"
              value={returnSignatureForm.devolucionId}
              onChange={(e) =>
                setReturnSignatureForm({ devolucionId: e.target.value })
              }
            >
              <option value="">Selecciona devolución</option>
              {pendingReturns.map((item) => (
                <option key={item.id} value={item.id}>
                  Devolución {item.id.slice(0, 8)} · {item.estado}
                </option>
              ))}
            </select>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              {ACCEPTANCE_TEXT_DEVOLUCION}
            </div>
            <SignaturePad
              key={`warehouse-return-signature-${returnSignaturePadKey}`}
              required
              label="Firma de recepción de devolución"
              onChange={(_dataUrl, file) => setReturnSignatureFile(file)}
            />
            <button className="px-3 py-2 rounded-md bg-dark-blue text-white" type="submit">
              Registrar firma
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {pendingReturns.map((item) => (
              <button
                key={item.id}
                className="px-3 py-2 rounded-md bg-gray-700 text-white text-sm disabled:opacity-50"
                onClick={() => handleConfirmReturn(item.id)}
                disabled={item.estado !== 'pendiente_firma'}
              >
                {item.estado === 'pendiente_firma'
                  ? `Confirmar ${item.id.slice(0, 8)}`
                  : `Firma requerida ${item.id.slice(0, 8)}`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {section === 'dashboard' && (
        <>
          <section className="bg-white rounded-lg shadow-md p-5">
            <h2 className="text-lg font-semibold text-dark-blue mb-4">Ingreso de inventario</h2>
            <div className="flex gap-2 mb-3">
              <input
                className="border rounded-md p-2 flex-1"
                placeholder="Crear proveedor rápido"
                value={newProveedorNombre}
                onChange={(e) => setNewProveedorNombre(e.target.value)}
              />
              <button className="px-3 py-2 rounded-md border" type="button" onClick={handleCreateProveedor}>
                Crear proveedor
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleCreatePurchase}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  className="border rounded-md p-2"
                  value={purchaseForm.proveedor_id}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, proveedor_id: e.target.value }))}
                  required
                >
                  <option value="">Proveedor</option>
                  {proveedores.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
                <select
                  className="border rounded-md p-2"
                  value={purchaseForm.tipo}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, tipo: e.target.value }))}
                >
                  <option value="factura">Factura</option>
                  <option value="boleta">Boleta</option>
                  <option value="guia">Guía</option>
                </select>
                <input
                  className="border rounded-md p-2"
                  placeholder="Número documento"
                  value={purchaseForm.numero}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, numero: e.target.value }))}
                  required
                />
                <input
                  className="border rounded-md p-2"
                  type="date"
                  value={purchaseForm.fecha}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, fecha: e.target.value }))}
                  required
                />
                <select
                  className="border rounded-md p-2"
                  value={purchaseForm.articulo_id}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, articulo_id: e.target.value }))}
                  required
                >
                  <option value="">Artículo</option>
                  {articulos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} ({trackingModeLabel(item.tracking_mode)})
                    </option>
                  ))}
                </select>
                <select
                  className="border rounded-md p-2"
                  value={purchaseForm.ubicacion_id}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, ubicacion_id: e.target.value }))}
                  required
                >
                  <option value="">Ubicación ingreso</option>
                  {ubicaciones.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
                <input
                  className="border rounded-md p-2"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Cantidad"
                  value={purchaseForm.cantidad}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, cantidad: parseQuantityInteger(e.target.value, 1) }))}
                />
                <input
                  className="border rounded-md p-2"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Costo unitario CLP"
                  value={purchaseForm.costo_unitario}
                  onChange={(e) =>
                    setPurchaseForm((prev) => ({ ...prev, costo_unitario: Number(e.target.value) }))
                  }
                />
                <input
                  className="border rounded-md p-2"
                  placeholder="Código lote (si aplica)"
                  value={purchaseForm.codigo_lote}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, codigo_lote: e.target.value }))}
                />
              </div>

              {selectedPurchaseArticle?.tracking_mode === 'serial' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Código unitario *</label>
                  {purchaseForm.activos.map((activo, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-5 text-right">{index + 1}.</span>
                      <input
                        className="flex-1 border rounded-md p-2 text-sm"
                        placeholder={`Ej: TAL-00${index + 1}`}
                        value={activo.codigo}
                        onChange={(e) => {
                          const updated = [...purchaseForm.activos];
                          updated[index] = { codigo: e.target.value };
                          setPurchaseForm((prev) => ({ ...prev, activos: updated }));
                        }}
                      />
                      {purchaseForm.activos.length > 1 && (
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-600 text-lg px-1"
                          onClick={() => {
                            const updated = purchaseForm.activos.filter((_, i) => i !== index);
                            setPurchaseForm((prev) => ({ ...prev, activos: updated }));
                          }}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    onClick={() => setPurchaseForm((prev) => ({ ...prev, activos: [...prev.activos, { codigo: '' }] }))}
                  >
                    + Agregar unidad
                  </button>
                </div>
              )}

              <textarea
                className="border rounded-md p-2 w-full"
                placeholder="Notas compra"
                value={purchaseForm.notas}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, notas: e.target.value }))}
              />

              <button type="submit" className="px-3 py-2 rounded-md bg-primary-blue text-white">
                Registrar compra
              </button>
            </form>
          </section>

          <section className="bg-white rounded-lg shadow-md p-5">
            <h2 className="text-lg font-semibold text-dark-blue mb-3">Stock actual (muestra)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2">Artículo</th>
                    <th className="text-left py-2 px-2">Ubicación</th>
                    <th className="text-left py-2 px-2">Disponible</th>
                    <th className="text-left py-2 px-2">Reservada</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.slice(0, 15).map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0 border-gray-100">
                      <td className="py-2 px-2">{item.articulo_nombre}</td>
                      <td className="py-2 px-2">{item.ubicacion_nombre}</td>
                      <td className="py-2 px-2">{Number(item.cantidad_disponible)}</td>
                      <td className="py-2 px-2">{Number(item.cantidad_reservada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default SupervisorOperationsPage;
