import React from 'react';
import AdminUbicacionesPage from './AdminUbicacionesPage';

const AdminProyectosPage: React.FC = () => (
  <AdminUbicacionesPage
    scope="proyectos"
    title="Proyectos"
    description="Administra proyectos y frentes de trabajo asociados a la operación."
  />
);

export default AdminProyectosPage;
