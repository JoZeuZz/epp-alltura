import React from 'react';
import AdminInventoryArticlesPage from './AdminInventoryArticlesPage';

const AdminInventoryHerramientasPage: React.FC = () => (
  <div className="space-y-4" data-tour="admin-inventory-herramientas">
    <section className="space-y-1">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Gestor de Herramientas</h1>
      <p className="text-neutral-gray">Gestión de herramientas con filtros y acciones operativas.</p>
    </section>
    <AdminInventoryArticlesPage scope="herramientas" />
  </div>
);

export default AdminInventoryHerramientasPage;
