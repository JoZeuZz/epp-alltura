import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

const ErrorPage: React.FC = () => {
  const error = useRouteError();
  
  let errorMessage: string;
  let errorStatus: number | undefined;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText || error.data?.message || 'Ha ocurrido un error';
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = 'Ha ocurrido un error desconocido';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          {errorStatus === 404 ? (
            <h1 className="text-9xl font-bold text-primary-blue">404</h1>
          ) : (
            <div className="text-6xl mb-4">⚠️</div>
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-dark-blue mb-4">
          {errorStatus === 404 ? 'Página no encontrada' : 'Algo salió mal'}
        </h2>
        
        <p className="text-gray-600 mb-8">
          {errorMessage}
        </p>
        
        <div className="space-y-3">
          <Link
            to="/"
            className="block w-full bg-primary-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Volver al inicio
          </Link>
          
          <button
            onClick={() => window.location.reload()}
            className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Recargar página
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <h3 className="text-sm font-semibold text-red-800 mb-2">Error Stack (Dev):</h3>
            <pre className="text-xs text-red-600 overflow-auto max-h-40">
              {error.stack}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorPage;
