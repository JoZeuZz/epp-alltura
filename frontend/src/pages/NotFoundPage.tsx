import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Página 404 - Ruta no encontrada
 * 
 * Características:
 * - Diseño amigable y profesional
 * - Muestra la ruta que no se encontró
 * - Botones de navegación para volver atrás o ir al inicio
 * - Responsive design
 * - Logging de rutas 404 para analytics
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(10);

  // Log de ruta no encontrada para analytics
  useEffect(() => {
    console.warn('404 - Ruta no encontrada:', {
      path: location.pathname,
      search: location.search,
      timestamp: new Date().toISOString()
    });

    // Opcional: Enviar a servicio de analytics
    // trackEvent('404_error', { path: location.pathname });
  }, [location]);

  // Countdown opcional para redirección automática
  useEffect(() => {
    if (countdown <= 0) {
      navigate('/');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center">
        {/* Ilustración 404 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-blue-100 rounded-full mb-6">
            <Search className="w-16 h-16 text-blue-600" />
          </div>
          
          <h1 className="text-6xl sm:text-8xl font-bold text-gray-900 mb-4">
            404
          </h1>
          
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4">
            Página no encontrada
          </h2>
          
          <p className="text-gray-600 text-lg mb-2">
            Lo sentimos, la página que estás buscando no existe.
          </p>
          
          {/* Mostrar ruta intentada */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6 inline-block max-w-full">
            <p className="text-sm text-gray-500 mb-1">Ruta solicitada:</p>
            <code className="text-sm font-mono text-gray-800 break-all">
              {location.pathname}{location.search}
            </code>
          </div>
        </div>

        {/* Botones de navegación */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm hover:shadow-md w-full sm:w-auto"
            aria-label="Volver atrás"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver atrás
          </button>
          
          <button
            onClick={handleGoHome}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg w-full sm:w-auto"
            aria-label="Ir al inicio"
          >
            <Home className="w-5 h-5" />
            Ir al inicio
          </button>
        </div>

        {/* Countdown opcional */}
        <p className="text-sm text-gray-500">
          Serás redirigido al inicio en <span className="font-semibold text-gray-700">{countdown}</span> segundos
        </p>

        {/* Enlaces útiles opcionales */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            ¿Necesitas ayuda? Intenta con estos enlaces:
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
            >
              Inicio
            </button>
            <button
              onClick={() => navigate('/admin/projects')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
            >
              Proyectos
            </button>
            <button
              onClick={() => navigate('/admin/clients')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
            >
              Clientes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
