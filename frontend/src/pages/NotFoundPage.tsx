import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-8 text-center space-y-4">
        <h1 className="text-5xl font-bold text-dark-blue">404</h1>
        <p className="text-lg font-semibold text-gray-800">Pagina no encontrada</p>
        <p className="text-neutral-gray">La ruta solicitada no existe en este modulo.</p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-primary-blue text-white hover:bg-blue-700"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
