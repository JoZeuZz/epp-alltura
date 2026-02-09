import React from 'react';

const WarehouseDashboard: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Dashboard Bodega</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-neutral-gray">
          Cascaron base listo. Aqui ira el flujo de entregas, devoluciones e inventario de herramientas y EPP.
        </p>
      </div>
    </div>
  );
};

export default WarehouseDashboard;
