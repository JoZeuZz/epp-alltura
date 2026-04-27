import React from 'react';
import AdminInventoryArticlesPage from './AdminInventoryArticlesPage';

const AdminInventoryEppPage: React.FC = () => (
  <div className="space-y-4" data-tour="admin-inventory-epp">
    <section className="space-y-1">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Gestor de EPP</h1>
      <p className="text-neutral-gray">Gestión de artículos EPP con filtros y acciones operativas.</p>
    </section>
    <AdminInventoryArticlesPage scope="epp" />
  </div>
);

export default AdminInventoryEppPage;
