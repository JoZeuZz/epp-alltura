import React from 'react';
import AdminUbicacionesPage from './AdminUbicacionesPage';

const AdminBodegasPage: React.FC = () => (
  <AdminUbicacionesPage
    scope="bodegas"
    title="Bodegas"
    description="Administra las bodegas operativas donde se controla el inventario."
  />
);

export default AdminBodegasPage;
