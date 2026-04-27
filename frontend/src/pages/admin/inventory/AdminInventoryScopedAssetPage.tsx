import React from 'react';
import type { InventoryActivoTypeScope } from '../../../services/apiService';
import AdminInventoryScopedAssetCards from './AdminInventoryScopedAssetCards';
import { INVENTORY_ASSET_SCOPE_COPY } from './inventoryAssetScope.constants';

interface AdminInventoryScopedAssetPageProps {
  scope: InventoryActivoTypeScope;
}

const AdminInventoryScopedAssetPage: React.FC<AdminInventoryScopedAssetPageProps> = ({ scope }) => {
  const copy = INVENTORY_ASSET_SCOPE_COPY[scope];

  return (
    <div className="space-y-4" data-tour={`admin-inventory-${scope}`}>
      <section className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">{copy.pageTitle}</h1>
        <p className="text-neutral-gray">{copy.pageSubtitle}</p>
      </section>
      <AdminInventoryScopedAssetCards scope={scope} />
    </div>
  );
};

export default AdminInventoryScopedAssetPage;
