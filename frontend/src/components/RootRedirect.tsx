import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

const RootRedirect = () => {
  const { user, loading } = useAuth();

  // Mostrar spinner mientras se valida el token
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  // Si no hay usuario después de cargar, ir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirigir según el rol del usuario
  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === 'supervisor') {
    return <Navigate to="/supervisor/dashboard" replace />;
  }

  // Cliente por defecto
  return <Navigate to="/client/dashboard" replace />;
};

export default RootRedirect;
