import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'supervisor' | 'client')[];
  requireAuth?: boolean;
}

/**
 * Componente para proteger rutas basado en roles
 * Redirige a login si no está autenticado o a unauthorized si no tiene el rol adecuado
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requireAuth = true,
}) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') as 'admin' | 'supervisor' | 'client' | null;

  // Si requiere autenticación y no hay token, redirigir a login
  if (requireAuth && !token) {
    return <Navigate to="/login" replace />;
  }

  // Si hay roles permitidos y el usuario no tiene uno de ellos, redirigir a unauthorized
  if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
