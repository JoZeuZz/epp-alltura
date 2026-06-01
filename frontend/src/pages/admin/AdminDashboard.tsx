import React from 'react';
import { useLoaderData, useLocation } from 'react-router-dom';
import MetricCard from '../../components/dashboard/MetricCard';
import StatsCard from '../../components/dashboard/StatsCard';
import { ResponsiveTable, type TableColumn } from '../../components/layout';

interface DashboardData {
  summary?: any;
  stock?: any[];
  movimientosActivo?: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d;
  }
};

const TIPO_BADGE: Record<string, string> = {
  // post-refactor movement types
  entrada:      'badge badge-success',
  entrega:      'badge badge-warning',
  devolucion:   'badge badge-default',
  reubicacion:  'badge badge-info',
  mantencion:   'badge badge-info',
  ajuste:       'badge badge-danger',
  baja:         'badge badge-danger',
};

const renderTipo = (v: string) => (
  <span className={TIPO_BADGE[String(v || '').toLowerCase()] ?? 'badge badge-default'}>
    {v || '—'}
  </span>
);

// ─── Icons ────────────────────────────────────────────────────────────────────

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

const IconLayers = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const IconReturn = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; id: string }> = ({ title, id }) => (
  <div className="flex items-center gap-3">
    <h2 id={id} className="heading-4 text-content-primary shrink-0">{title}</h2>
    <div className="flex-1 h-px bg-surface-overlay border-t border-edge" aria-hidden="true" />
  </div>
);

// ─── Column configs ───────────────────────────────────────────────────────────

type ActivoMovRow = { fecha: string; tipo: string; codigo: string; articulo: string; destino: string };
type StockRow = { articulo: string; ubicacion: string; disponible: number; reservada: number };

const COLS_ACTIVO_MOV: TableColumn<ActivoMovRow>[] = [
  { key: 'fecha',    header: 'Fecha',    hideOnMobile: true },
  { key: 'tipo',     header: 'Tipo',     render: (v) => renderTipo(v) },
  { key: 'codigo',   header: 'Activo',   hideOnTablet: true },
  { key: 'articulo', header: 'Artículo' },
  { key: 'destino',  header: 'Destino',  hideOnMobile: true },
];

const COLS_STOCK: TableColumn<StockRow>[] = [
  { key: 'articulo',   header: 'Artículo' },
  { key: 'ubicacion',  header: 'Ubicación', hideOnMobile: true },
  {
    key: 'disponible',
    header: 'Disponible',
    align: 'right',
    render: (v: number) =>
      v === 0
        ? <span className="badge badge-danger">Agotado</span>
        : <span className="font-medium text-content-primary">{v}</span>,
  },
  { key: 'reservada', header: 'Reservada', align: 'right', hideOnMobile: true },
];

// ─── Main component ───────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const data = useLoaderData() as DashboardData;
  const location = useLocation();
  const section = location.pathname.split('/').pop() || 'dashboard';

  const summary       = data.summary      || {};
  const activos       = summary.activos    || {};
  const entregas      = summary.entregas   || {};
  const devoluciones  = summary.devoluciones || {};
  const firmas        = summary.firmas     || {};

  const activoMovData: ActivoMovRow[] = (data.movimientosActivo || []).slice(0, 12).map(i => ({
    fecha:    fmtDate(i.fecha_movimiento),
    tipo:     i.tipo,
    codigo:   i.activo_codigo || '—',
    articulo: i.articulo_nombre || '—',
    destino:  i.ubicacion_destino_nombre || '—',
  }));

  const stockData: StockRow[] = (data.stock || []).slice(0, 12).map(i => ({
    articulo:  i.articulo_nombre  || '—',
    ubicacion: i.ubicacion_nombre || '—',
    disponible: Number(i.cantidad_disponible || 0),
    reservada:  Number(i.cantidad_reservada  || 0),
  }));

  const agotados = Number(activos.mantencion || 0);
  const pendFirma = Number(entregas.pendiente_firma || 0);

  const subtitle =
    section === 'trazabilidad'
      ? 'Movimientos recientes de activos.'
      : 'Vista operativa de inventario, entregas, devoluciones y firmas.';

  const showMovimientos = section === 'dashboard' || section === 'trazabilidad';

  return (
    <div className="space-y-8" data-tour="admin-dashboard-root">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="heading-2 text-content-primary">Panel de Equipos y Herramientas</h1>
        <p className="body-small text-content-muted">{subtitle}</p>
      </div>

      {/* ── Primary KPIs ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="admin-dashboard-kpis">
        <MetricCard
          title="Activos Totales"
          value={activos.total || 0}
          icon={IconCube}
          colorClass="text-primary"
        />
        <MetricCard
          title="Activos Asignados"
          value={activos.asignado || 0}
          icon={IconUserCheck}
          colorClass="text-info"
          subtitle={activos.total > 0 ? `de ${activos.total} totales` : undefined}
        />
        <MetricCard
          title="Entregas pend. firma"
          value={pendFirma}
          icon={IconClipboard}
          colorClass={pendFirma > 0 ? 'text-warning' : 'text-content-muted'}
        />
        <MetricCard
          title="Firmas (últimos 30 días)"
          value={firmas.firmadas_30d || 0}
          icon={IconPen}
          colorClass="text-success"
        />
      </div>

      {/* ── Secondary metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          title="Stock"
          icon={IconLayers}
          items={[
            { label: 'En Stock',      value: activos.en_stock  || 0, color: 'text-success' },
            { label: 'Asignados',     value: activos.asignado  || 0, color: 'text-warning' },
            {
              label: 'En Mantención',
              value: agotados,
              color: agotados > 0 ? 'text-info' : 'text-content-muted',
            },
          ]}
        />
        <StatsCard
          title="Operaciones"
          icon={IconReturn}
          items={[
            { label: 'Entregas pend. firma',   value: entregas.pendiente_firma  || 0 },
            { label: 'Devoluciones borrador',  value: devoluciones.borrador     || 0 },
          ]}
        />
      </div>

      {/* ── Movimientos de Activo ──────────────────────────────────────────── */}
      {showMovimientos && (
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
      )}

      {/* ── Stock Actual ───────────────────────────────────────────────────── */}
      {section === 'dashboard' && (
        <section aria-labelledby="hdr-stock" className="space-y-3">
          <SectionHeader title="Stock Actual (Muestra)" id="hdr-stock" />
          <ResponsiveTable<StockRow>
            columns={COLS_STOCK}
            data={stockData}
            caption="Estado actual del stock por artículo y ubicación"
            emptyMessage="Sin registros de stock disponibles."
            getRowKey={(_, i) => i}
          />
        </section>
      )}

    </div>
  );
};

export default AdminDashboard;
