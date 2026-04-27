import React from 'react';
import AdminInventoryArticlesPage from './AdminInventoryArticlesPage';

const AdminInventoryEquiposPage: React.FC = () => (
  <div className="space-y-4" data-tour="admin-inventory-equipos">
    <section className="space-y-1">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Gestor de Equipos</h1>
      <p className="text-neutral-gray">Gestión de equipos con filtros y acciones operativas.</p>
    </section>
    <AdminInventoryArticlesPage scope="equipos" />
  </div>
);

export default AdminInventoryEquiposPage;
