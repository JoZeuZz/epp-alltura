import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-primary-blue text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`;

const AdminInventoryLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="space-y-6" data-tour="admin-inventory-layout">
      <section className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Control de Inventario</h1>
        <p className="text-neutral-gray">
          Administra stock, movimientos e ingresos de herramientas y EPP desde módulos separados.
        </p>
      </section>

      <section className="bg-white rounded-lg shadow-md p-3 sm:p-4" data-tour="admin-inventory-tabs">
        <nav className="flex flex-wrap gap-2" aria-label="Submódulos de inventario">
          <NavLink to="/admin/inventario/articulos" className={tabClass}>
            Artículos
          </NavLink>
          <NavLink to="/admin/inventario/stock" className={tabClass}>
            Stock
          </NavLink>
          <NavLink to="/admin/inventario/movimientos" className={tabClass}>
            Movimientos
          </NavLink>
          <NavLink to="/admin/inventario/ingresos" className={tabClass}>
            Ingresos
          </NavLink>
          <NavLink to="/admin/inventario/egresos" className={tabClass}>
            Egresos
          </NavLink>
          <NavLink to="/admin/inventario/activos" className={tabClass}>
            Activos
          </NavLink>
        </nav>
      </section>

      <Outlet key={location.pathname} />
    </div>
  );
};

export default AdminInventoryLayout;
