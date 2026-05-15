import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArticuloCreateModal } from '../../../components/ArticuloCreateModal';
import {
  getArticulos,
  type Articulo,
} from '../../../services/apiService';
import { useGet } from '../../../hooks';
import AdminInventoryScopedAssetCards from './AdminInventoryScopedAssetCards';
import {
  INVENTORY_ASSET_SCOPE_COPY,
  type AssetScopeKey,
} from './inventoryAssetScope.constants';

interface BodegaOption {
  id: string;
  nombre: string;
}

interface AdminInventoryScopedAssetPageProps {
  scope: AssetScopeKey;
}

const AdminInventoryScopedAssetPage: React.FC<AdminInventoryScopedAssetPageProps> = ({ scope }) => {
  const copy = INVENTORY_ASSET_SCOPE_COPY[scope];
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: bodegas = [] } = useGet<BodegaOption[]>(['bodegas'], '/bodegas');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['articulos', scope],
    queryFn: () => getArticulos({ tipo: copy.tipo, limit: 500 }),
  });

  const items: Articulo[] = data?.items ?? [];

  const handleCreateSuccess = () => {
    setShowCreate(false);
    void queryClient.invalidateQueries({ queryKey: ['articulos', scope] });
  };

  return (
    <div className="space-y-4" data-tour={`admin-inventory-${scope}`}>
      <section className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">
          {copy.icon} {copy.pageTitle}
        </h1>
        <p className="text-neutral-gray">{copy.pageSubtitle}</p>
      </section>

      <div className="flex gap-2 justify-end" data-tour="admin-inventory-toolbar">
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary-blue text-sm text-white bg-primary-blue hover:bg-blue-700 transition-colors"
          aria-label={`Nuevo ${copy.tipo}`}
        >
          + Nuevo {copy.tipo === 'epp' ? 'EPP' : copy.tipo}
        </button>
      </div>

      <AdminInventoryScopedAssetCards
        scope={scope}
        items={items}
        isLoading={isLoading}
        isError={isError}
        onRefetch={() => { void refetch(); }}
        copy={copy}
      />

      {showCreate && (
        <ArticuloCreateModal
          tipo={copy.tipo}
          bodegas={bodegas}
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default AdminInventoryScopedAssetPage;
