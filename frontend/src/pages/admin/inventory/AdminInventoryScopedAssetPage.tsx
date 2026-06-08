import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArticuloCreateModal } from '../../../components/ArticuloCreateModal';
import { ArticuloBatchModal } from '../../../components/forms';
import {
  getArticulos,
  type Articulo,
} from '../../../services/apiService';
import { useGet, useTourActions } from '../../../hooks';
import { PageTabs } from '@jozeuzz/alltura-ui';
import AdminInventoryScopedAssetCards from './AdminInventoryScopedAssetCards';
import InventoryLocationPieChart from '../../../components/dashboard/InventoryLocationPieChart';

const GESTOR_TABS = [
  { key: 'dashboard' as const, label: 'Dashboard' },
  { key: 'inventario' as const, label: 'Inventario' },
] as const;
import {
  INVENTORY_ASSET_SCOPE_COPY,
  type AssetScopeKey,
} from './inventoryAssetScope.constants';
import { formatCLP } from '../../../utils/currency';

interface BodegaOption {
  id: string;
  nombre: string;
}

interface AdminInventoryScopedAssetPageProps {
  scope: AssetScopeKey;
}

const KpiCard: React.FC<{ label: string; value: string; accent?: string }> = ({
  label,
  value,
  accent = 'text-dark-blue',
}) => (
  <article className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
  </article>
);

const AdminInventoryScopedAssetPage: React.FC<AdminInventoryScopedAssetPageProps> = ({ scope }) => {
  const copy = INVENTORY_ASSET_SCOPE_COPY[scope];
  const [showCreate, setShowCreate] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventario'>('dashboard');
  const [locationFilter, setLocationFilter] = useState<string | null | undefined>(undefined);
  const queryClient = useQueryClient();

  const handleLocationClick = (location: string | null) => {
    setLocationFilter(location);
    setActiveTab('inventario');
  };

  const { data: bodegas = [] } = useGet<BodegaOption[]>(['bodegas'], '/bodegas');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['articulos', scope],
    queryFn: () => getArticulos({ tipo: copy.tipo, limit: 500 }),
  });

  const items: Articulo[] = data?.items ?? [];

  const kpis = useMemo(() => {
    let enStock = 0;
    let asignado = 0;
    let liabilityValue = 0;
    items.forEach((a) => {
      if (a.estado === 'en_stock') enStock += 1;
      if (a.estado === 'asignado') {
        asignado += 1;
        if (a.valor > 0) liabilityValue += a.valor;
      }
    });
    return { total: items.length, enStock, asignado, liabilityValue };
  }, [items]);

  useTourActions({
    'switch-tab:dashboard':  () => setActiveTab('dashboard'),
    'switch-tab:inventario': () => setActiveTab('inventario'),
  });

  const handleCreateSuccess = () => {
    setShowCreate(false);
    void queryClient.invalidateQueries({ queryKey: ['articulos', scope] });
  };

  return (
    <div className="space-y-4" data-tour={`admin-inventory-${scope}`}>
      {/* Header card with title, button, and tab bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-start justify-between px-4 pt-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">
              {copy.icon} {copy.pageTitle}
            </h1>
            <p className="text-neutral-gray">{copy.pageSubtitle}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors min-h-[44px]"
            >
               Crear en lote
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-primary-blue text-sm text-white bg-primary-blue hover:bg-blue-700 transition-colors min-h-[44px]"
              aria-label={`Nuevo ${copy.tipo}`}
            >
              + Nuevo {copy.tipo === 'epp' ? 'EPP' : copy.tipo}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <PageTabs
          tabs={GESTOR_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="px-4 mt-3"
          data-tour="admin-inventory-toolbar"
        />
      </div>

      {/* Dashboard tab: KPI cards + city pie chart */}
      {activeTab === 'dashboard' && (
        <>
          {isError ? (
            <section
              className="bg-white rounded-lg shadow-sm border border-red-100 p-4 space-y-3"
              role="alert"
              aria-label={`KPIs de ${scope}`}
            >
              <p className="text-sm text-red-600">{copy.errorMessage}</p>
              <button
                type="button"
                onClick={() => { void refetch(); }}
                className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
              >
                Reintentar
              </button>
            </section>
          ) : (
            <section
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
              aria-label={`KPIs de ${scope}`}
              data-tour="admin-inventory-kpis"
            >
              <KpiCard
                label={copy.totalLabel}
                value={isLoading ? '—' : String(kpis.total)}
              />
              <KpiCard
                label="En stock"
                value={isLoading ? '—' : String(kpis.enStock)}
                accent="text-green-600"
              />
              <KpiCard
                label="Asignados"
                value={isLoading ? '—' : String(kpis.asignado)}
                accent="text-blue-600"
              />
              <KpiCard
                label="Valor bajo responsabilidad"
                value={
                  isLoading
                    ? '—'
                    : kpis.liabilityValue > 0
                      ? formatCLP(kpis.liabilityValue)
                      : 'Sin valor registrado'
                }
                accent="text-amber-600"
              />
            </section>
          )}
          {!isError && (
            <InventoryLocationPieChart
              items={items}
              isLoading={isLoading}
              onLocationClick={handleLocationClick}
            />
          )}
        </>
      )}

      {/* Inventario tab: filters + article grid */}
      {activeTab === 'inventario' && (
        <AdminInventoryScopedAssetCards
          scope={scope}
          items={items}
          isLoading={isLoading}
          isError={isError}
          onRefetch={() => { void refetch(); }}
          copy={copy}
          locationFilter={locationFilter}
          onClearLocation={() => setLocationFilter(undefined)}
        />
      )}

      {showCreate && (
        <ArticuloCreateModal
          tipo={copy.tipo}
          bodegas={bodegas}
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showBatchModal && (
        <ArticuloBatchModal
          tipo={copy.tipo}
          bodegas={bodegas}
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
        />
      )}
    </div>
  );
};

export default AdminInventoryScopedAssetPage;
