import React, { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import MetricCard from '../../components/dashboard/MetricCard';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import EntregaCreateModal from '../../components/forms/EntregaCreateModal';
import EntregaFirmaModal from '../../components/forms/EntregaFirmaModal';
import DevolucionActivoModal from '../../components/forms/DevolucionActivoModal';
import DevolucionFirmaModal from '../../components/forms/DevolucionFirmaModal';
import DevolucionRapidaModal from '../../components/forms/DevolucionRapidaModal';
import { useGet } from '../../hooks';
import {
  createEntrega,
  getMisAsignacionesUsuario,
  type EntregaCreatePayload,
  type EntregaRow,
  type DevolucionRow,
  type ReturnEligibleAssetRow,
} from '../../services/apiService';
import type { AlertasData, AlertaCustodia } from '../../router';
import MisArticulosAsignadosPanel from '../../components/dashboard/MisArticulosAsignadosPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrabajadorOption {
  id: string;
  persona_id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  cargo?: string | null;
}

// DevolucionRapidaModal exposes a narrower trabajador shape (no persona_id) in
// its onConfirm callback; this matches that contract for the handler param.
type DevTrabajador = Omit<TrabajadorOption, 'persona_id'> & { persona_id?: string };

interface UbicacionOption {
  id: string;
  nombre: string;
  tipo?: 'bodega' | 'planta' | 'proyecto' | 'taller_mantencion';
}

interface DashboardData {
  summary?: any;
  stock?: any[];
  movimientosActivo?: any[];
  alertas?: AlertasData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
};

const TIPO_BADGE: Record<string, string> = {
  entrada:     'badge badge-success',
  entrega:     'badge badge-warning',
  devolucion:  'badge badge-default',
  reubicacion: 'badge badge-info',
  mantencion:  'badge badge-info',
  ajuste:      'badge badge-danger',
  baja:        'badge badge-danger',
};

const renderTipo = (v: string) => (
  <span className={TIPO_BADGE[String(v || '').toLowerCase()] ?? 'badge badge-default'}>
    {v || '—'}
  </span>
);

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconCube = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const IconUserCheck = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a7 7 0 00-7 7h11" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11l2 2 4-4" />
  </svg>
);
const IconClipboard = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const IconPen = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; id: string }> = ({ title, id }) => (
  <div className="flex items-center gap-3">
    <h2 id={id} className="heading-4 text-content-primary shrink-0">{title}</h2>
    <div className="flex-1 h-px bg-surface-overlay border-t border-edge" aria-hidden="true" />
  </div>
);

const AlertasPanel: React.FC<{ alertas: AlertaCustodia[]; total: number; vencidas: number }> = ({
  alertas, total,
}) => (
  <div className="bg-surface rounded-lg border border-edge shadow-card overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
      <h3 className="label-base font-semibold text-content-primary">Alertas de Custodia</h3>
      {total > 0 ? (
        <span className="text-xs font-bold text-danger bg-danger/10 px-2.5 py-0.5 rounded-full">
          {total} activa{total !== 1 ? 's' : ''}
        </span>
      ) : (
        <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-0.5 rounded-full">
          Sin alertas
        </span>
      )}
    </div>
    {total === 0 ? (
      <div className="flex flex-col items-center justify-center py-6 gap-1">
        <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-content-muted">Todas las custodias al día</p>
      </div>
    ) : (
      <ul className="divide-y divide-edge">
        {alertas.slice(0, 8).map((a) => (
          <li key={a.custodia_id} className="flex items-center gap-3 px-4 py-2.5">
            <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${a.semaforo === 'rojo' ? 'bg-danger' : 'bg-warning'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-content-primary truncate">{a.activo_codigo} — {a.articulo_nombre}</p>
              <p className="text-xs text-content-muted truncate">{a.trabajador_nombre}</p>
            </div>
            <span className={`text-xs font-bold flex-shrink-0 ${a.semaforo === 'rojo' ? 'text-danger' : 'text-warning'}`}>
              {a.semaforo === 'rojo' ? 'vencida' : `${a.dias_restantes}d`}
            </span>
          </li>
        ))}
        {total > 8 && (
          <li className="px-4 py-2 text-xs text-content-muted text-center">+{total - 8} más — ver en Trabajadores</li>
        )}
      </ul>
    )}
  </div>
);

const StockResumen: React.FC<{ en_stock: number; asignado: number; mantencion: number }> = ({
  en_stock, asignado, mantencion,
}) => (
  <div className="bg-surface rounded-lg border border-edge shadow-card px-4 py-3">
    <h3 className="label-base font-semibold text-content-primary mb-3">Stock</h3>
    <div className="space-y-2">
      {[
        { label: 'En Stock',      value: en_stock,   colorClass: 'text-success' },
        { label: 'Asignados',     value: asignado,   colorClass: 'text-primary' },
        { label: 'En Mantención', value: mantencion, colorClass: mantencion > 0 ? 'text-info' : 'text-content-muted' },
      ].map(({ label, value, colorClass }) => (
        <div key={label} className="flex justify-between items-center">
          <span className="text-sm text-content-muted">{label}</span>
          <span className={`text-lg font-semibold ${colorClass}`}>{value}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── Column configs ───────────────────────────────────────────────────────────

type ActivoMovRow = { fecha: string; tipo: string; codigo: string; articulo: string; destino: string };
type TopArticuloRow = { articulo: string; tipo: string; entregas: number; devoluciones: number };

const COLS_ACTIVO_MOV: TableColumn<ActivoMovRow>[] = [
  { key: 'fecha',    header: 'Fecha',    hideOnMobile: true },
  { key: 'tipo',     header: 'Tipo',     render: (v) => renderTipo(v) },
  { key: 'codigo',   header: 'Activo',   hideOnTablet: true },
  { key: 'articulo', header: 'Artículo' },
  { key: 'destino',  header: 'Destino',  hideOnMobile: true },
];

const TIPO_ARTICULO_BADGE: Record<string, string> = {
  epp:         'badge badge-info',
  equipo:      'badge badge-default',
  herramienta: 'badge badge-default',
};

const COLS_TOP_ARTICULOS: TableColumn<TopArticuloRow>[] = [
  { key: 'articulo',     header: 'Artículo' },
  { key: 'tipo',         header: 'Tipo',      hideOnMobile: true,
    render: (v) => <span className={TIPO_ARTICULO_BADGE[v] ?? 'badge badge-default'}>{v}</span> },
  { key: 'entregas',     header: 'Entregas',  align: 'right' },
  { key: 'devoluciones', header: 'Dev.',      align: 'right', hideOnMobile: true },
];

// ─── Main component ───────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const data = useLoaderData() as DashboardData;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const summary      = data.summary      || {};
  const activos      = summary.activos   || {};
  const entregas     = summary.entregas  || {};
  const firmas       = summary.firmas    || {};
  const alertasData  = data.alertas || { alertas: [], total: 0, vencidas: 0, por_vencer: 0 };

  const { data: trabajadores = [] } = useGet<TrabajadorOption[]>(['trabajadores'], '/trabajadores');
  const { data: ubicaciones = [] }  = useGet<UbicacionOption[]>(['bodegas'], '/bodegas');

  // Modal state — entrega flow
  const [showEntrega, setShowEntrega]           = useState(false);
  const [draftEntrega, setDraftEntrega]         = useState<EntregaRow | null>(null);
  const [showFirmaEntrega, setShowFirmaEntrega] = useState(false);

  // Modal state — devolución rápida flow
  const [showDevolucionRapida, setShowDevolucionRapida] = useState(false);
  const [devCustodiaQueue, setDevCustodiaQueue]         = useState<ReturnEligibleAssetRow[]>([]);
  const [devCustodiaIndex, setDevCustodiaIndex]         = useState(0);
  const [devTrabajador, setDevTrabajador]               = useState<DevTrabajador | null>(null);
  const [devPhase, setDevPhase]                         = useState<'activo' | 'firma' | null>(null);
  const [devDraftCreated, setDevDraftCreated]           = useState<DevolucionRow | null>(null);

  // Query mis artículos asignados
  const { data: misAsignaciones } = useQuery({
    queryKey: ['mis-asignaciones'],
    queryFn: () => getMisAsignacionesUsuario(),
    staleTime: 30_000,
  });
  const tieneMisArticulos = (misAsignaciones?.total ?? 0) > 0;
  const [dashTab, setDashTab] = useState<'mis-articulos' | 'principal'>('principal');

  React.useEffect(() => {
    if (tieneMisArticulos) setDashTab('mis-articulos');
  }, [tieneMisArticulos]);

  const pendFirma = Number(entregas.pendiente_firma || 0);
  const agotados  = Number(activos.mantencion || 0);

  const entregaMutation = useMutation({
    mutationFn: ({ payload, foto }: { payload: EntregaCreatePayload; foto?: File }) =>
      createEntrega(payload, foto),
    onSuccess: (created) => {
      setDraftEntrega(created);
      setShowEntrega(false);
      setShowFirmaEntrega(true);
      toast.success('Entrega creada. Completa la firma para finalizar.');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'No se pudo crear la entrega.');
    },
  });

  const handleDevolucionRapidaConfirm = (
    trabajador: DevTrabajador,
    custodias: ReturnEligibleAssetRow[]
  ) => {
    setDevTrabajador(trabajador);
    setDevCustodiaQueue(custodias);
    setDevCustodiaIndex(0);
    setDevPhase('activo');
  };

  const currentCustodia = devCustodiaQueue[devCustodiaIndex] ?? null;

  const advanceOrCleanup = (index: number, queue: ReturnEligibleAssetRow[]) => {
    const isLast = index >= queue.length - 1;
    if (isLast) {
      setDevCustodiaQueue([]);
      setDevCustodiaIndex(0);
      setDevTrabajador(null);
      setDevPhase(null);
      setDevDraftCreated(null);
      void queryClient.invalidateQueries({ queryKey: ['return-eligible'] });
    } else {
      setDevCustodiaIndex((i) => i + 1);
      setDevDraftCreated(null);
      setDevPhase('activo');
    }
  };

  const handleDraftCreated = (devolucion: DevolucionRow) => {
    setDevDraftCreated(devolucion);
    setDevPhase('firma');
  };

  const handleFirmaDevolucionCompleted = () => {
    toast.success('Devolución firmada.');
    advanceOrCleanup(devCustodiaIndex, devCustodiaQueue);
  };

  const handleFirmaDevolucionClose = () => {
    // Borrador exists but unsigned — advance anyway
    advanceOrCleanup(devCustodiaIndex, devCustodiaQueue);
  };

  const handleCloseDevolucionSequence = () => {
    if (devCustodiaIndex > 0) {
      toast(`${devCustodiaIndex} devolución${devCustodiaIndex > 1 ? 'es' : ''} creada${devCustodiaIndex > 1 ? 's' : ''} como borrador.`);
    }
    setDevCustodiaQueue([]);
    setDevCustodiaIndex(0);
    setDevTrabajador(null);
    setDevPhase(null);
    setDevDraftCreated(null);
  };

  const activoMovData: ActivoMovRow[] = (data.movimientosActivo || []).slice(0, 12).map((i: any) => ({
    fecha:    fmtDate(i.fecha_movimiento),
    tipo:     i.tipo,
    codigo:   i.activo_codigo || '—',
    articulo: i.articulo_nombre || '—',
    destino:  i.ubicacion_destino_nombre || '—',
  }));

  const topArticulosData: TopArticuloRow[] = (summary.articulos_top_movimiento_30d || [])
    .slice(0, 8)
    .map((i: any) => ({
      articulo:     i.nombre || '—',
      tipo:         i.tipo   || '—',
      entregas:     Number(i.entregas_30d    || 0),
      devoluciones: Number(i.devoluciones_30d || 0),
    }));

  return (
    <div className="space-y-6" data-tour="admin-dashboard-root">
      <div className="space-y-1">
        <h1 className="heading-2 text-content-primary">Panel de Equipos y Herramientas</h1>
        <p className="body-small text-content-muted">Vista operativa de inventario, entregas, devoluciones y firmas.</p>
      </div>

      {/* Tabs condicionales — solo si hay artículos asignados al usuario actual */}
      {tieneMisArticulos && (
        <div className="flex gap-1 border-b border-edge" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={dashTab === 'mis-articulos'}
            onClick={() => setDashTab('mis-articulos')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              dashTab === 'mis-articulos'
                ? 'bg-primary-blue text-white'
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-overlay'
            }`}
          >
            Mis artículos ({misAsignaciones?.total ?? 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dashTab === 'principal'}
            onClick={() => setDashTab('principal')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              dashTab === 'principal'
                ? 'bg-primary-blue text-white'
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-overlay'
            }`}
          >
            Panel principal
          </button>
        </div>
      )}

      {tieneMisArticulos && dashTab === 'mis-articulos' ? (
        <MisArticulosAsignadosPanel
          onDeliverSelected={(ids) => {
            // TODO: open AsignarEntregarSeleccionadosModal (Task 14)
            console.log('Entregar desde mis artículos:', ids);
          }}
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* SIDEBAR — stacks first on mobile via order-first lg:order-last */}
          <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-4 order-first lg:order-last">

            {/* Acciones rápidas */}
            <div className="bg-dark-blue rounded-lg p-4">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-white/50 mb-3">
                Acciones rápidas
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setShowEntrega(true)}
                  className="flex flex-col items-center gap-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg py-3 px-2 text-xs font-semibold transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  Nueva Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setShowDevolucionRapida(true)}
                  disabled={devPhase !== null}
                  className="flex flex-col items-center gap-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg py-3 px-2 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  Devolución
                </button>
                <button type="button" onClick={() => navigate('/inventario/epp')}
                  className="flex flex-col items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white/85 rounded-lg py-3 px-2 text-xs font-semibold transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.97-3.05 8.88-7 10-3.95-1.12-7-5.03-7-10V6l7-3z" />
                  </svg>
                  EPP
                </button>
                <button type="button" onClick={() => navigate('/inventario/herramientas')}
                  className="flex flex-col items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white/85 rounded-lg py-3 px-2 text-xs font-semibold transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 010 1.4l-2.3 2.3a3 3 0 01-4.2 4.2l-4.8 4.8 1.4 1.4 4.8-4.8a3 3 0 004.2-4.2l2.3-2.3a1 1 0 011.4 0l1.4 1.4-1.4 1.4" />
                  </svg>
                  Herramientas
                </button>
              </div>
            </div>

            <AlertasPanel alertas={alertasData.alertas} total={alertasData.total} vencidas={alertasData.vencidas} />
            <StockResumen en_stock={activos.en_stock || 0} asignado={activos.asignado || 0} mantencion={agotados} />
          </aside>

          {/* MAIN COLUMN */}
          <div className="flex-1 min-w-0 space-y-6">
            <div className="grid grid-cols-2 gap-4" data-tour="admin-dashboard-kpis">
              <MetricCard title="Activos Totales"          value={activos.total || 0}    icon={IconCube}      colorClass="text-primary" />
              <MetricCard title="Activos Asignados"        value={activos.asignado || 0} icon={IconUserCheck} colorClass="text-info"
                subtitle={activos.total > 0 ? `de ${activos.total} totales` : undefined} />
              <MetricCard title="Entregas pend. firma"     value={pendFirma}             icon={IconClipboard}
                colorClass={pendFirma > 0 ? 'text-warning' : 'text-content-muted'} />
              <MetricCard title="Firmas (últimos 30 días)" value={firmas.firmadas_30d || 0} icon={IconPen}    colorClass="text-success" />
            </div>

            <section aria-labelledby="hdr-top-articulos" className="space-y-3">
              <SectionHeader title="Artículos más activos (30 días)" id="hdr-top-articulos" />
              <ResponsiveTable<TopArticuloRow>
                columns={COLS_TOP_ARTICULOS}
                data={topArticulosData}
                caption="Artículos con mayor movimiento en los últimos 30 días"
                emptyMessage="Sin datos de movimiento disponibles."
                getRowKey={(_, i) => i}
              />
            </section>

            <section aria-labelledby="hdr-mov-activo" className="space-y-3">
              <SectionHeader title="Movimientos de Activo Recientes" id="hdr-mov-activo" />
              <ResponsiveTable<ActivoMovRow>
                columns={COLS_ACTIVO_MOV}
                data={activoMovData}
                caption="Movimientos de activo recientes"
                emptyMessage="Sin movimientos de activo registrados."
                getRowKey={(_, i) => i}
              />
            </section>
          </div>
        </div>
      )}

      {/* Modals */}
      <EntregaCreateModal
        isOpen={showEntrega}
        onClose={() => setShowEntrega(false)}
        onSubmit={async (payload, foto) => { await entregaMutation.mutateAsync({ payload, foto }); }}
        isSubmitting={entregaMutation.isPending}
        trabajadores={trabajadores}
        ubicaciones={ubicaciones}
      />

      {draftEntrega && (
        <EntregaFirmaModal
          isOpen={showFirmaEntrega}
          onClose={() => { setShowFirmaEntrega(false); setDraftEntrega(null); }}
          entrega={draftEntrega}
          onCompleted={() => { setShowFirmaEntrega(false); setDraftEntrega(null); toast.success('Entrega firmada correctamente.'); }}
        />
      )}

      <DevolucionRapidaModal
        isOpen={showDevolucionRapida}
        onClose={() => setShowDevolucionRapida(false)}
        trabajadores={trabajadores}
        alertas={alertasData.alertas}
        onConfirm={handleDevolucionRapidaConfirm}
      />

      {devPhase === 'activo' && currentCustodia && devTrabajador && (
        <DevolucionActivoModal
          articuloId={currentCustodia.articulo_id}
          custodiaId={currentCustodia.custodia_id}
          trabajadorId={devTrabajador.id}
          trabajadorNombre={`${devTrabajador.nombres} ${devTrabajador.apellidos}`}
          onClose={handleCloseDevolucionSequence}
          onDraftCreated={handleDraftCreated}
        />
      )}

      {devPhase === 'firma' && devDraftCreated && devTrabajador && (
        <DevolucionFirmaModal
          isOpen
          onClose={handleFirmaDevolucionClose}
          devolucion={devDraftCreated}
          onCompleted={handleFirmaDevolucionCompleted}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
