import React from 'react';

const WorkerDashboard: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Dashboard Trabajador</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-neutral-gray">
          Cascaron base listo. Aqui ira la vista de activos asignados, recepcion y devolucion.
        </p>
      </div>
    </div>
  );
};

export default WorkerDashboard;
