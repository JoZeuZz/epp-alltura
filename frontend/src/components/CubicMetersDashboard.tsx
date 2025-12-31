import React, { useEffect, useState } from 'react';

interface CubicMetersStats {
  assembled_cubic_meters: number;
  disassembled_cubic_meters: number;
  total_cubic_meters: number;
  assembled_count: number;
  disassembled_count: number;
  total_count: number;
  green_cards_count: number;
  red_cards_count: number;
}

/**
 * Componente de Dashboard para mostrar estadísticas de metros cúbicos
 * Muestra andamios armados vs desarmados y estados de tarjetas
 */
export const CubicMetersDashboard: React.FC = () => {
  const [stats, setStats] = useState<CubicMetersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/cubic-meters', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Error al cargar estadísticas'}</p>
      </div>
    );
  }

  const assembledPercentage = stats.total_cubic_meters > 0
    ? (stats.assembled_cubic_meters / stats.total_cubic_meters) * 100
    : 0;

  const greenCardsPercentage = stats.total_count > 0
    ? (stats.green_cards_count / stats.total_count) * 100
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard de Andamios</h2>

      {/* Tarjetas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metros Cúbicos Armados */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-green-800">Armados</h3>
            <span className="text-3xl">🏗️</span>
          </div>
          <div className="text-4xl font-bold text-green-700 mb-1">
            {stats.assembled_cubic_meters.toFixed(2)} m³
          </div>
          <p className="text-sm text-green-600">
            {stats.assembled_count} andamios armados
          </p>
          <div className="mt-2 text-xs text-green-700">
            {assembledPercentage.toFixed(1)}% del total
          </div>
        </div>

        {/* Metros Cúbicos Desarmados */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-400 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Desarmados</h3>
            <span className="text-3xl">📦</span>
          </div>
          <div className="text-4xl font-bold text-gray-700 mb-1">
            {stats.disassembled_cubic_meters.toFixed(2)} m³
          </div>
          <p className="text-sm text-gray-600">
            {stats.disassembled_count} andamios desarmados
          </p>
          <div className="mt-2 text-xs text-gray-700">
            {(100 - assembledPercentage).toFixed(1)}% del total
          </div>
        </div>

        {/* Total de Metros Cúbicos */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-blue-800">Total</h3>
            <span className="text-3xl">📊</span>
          </div>
          <div className="text-4xl font-bold text-blue-700 mb-1">
            {stats.total_cubic_meters.toFixed(2)} m³
          </div>
          <p className="text-sm text-blue-600">
            {stats.total_count} andamios totales
          </p>
        </div>
      </div>

      {/* Barra de Progreso de Armado */}
      <div className="bg-white rounded-lg p-6 shadow border">
        <h3 className="text-lg font-semibold mb-4">Estado de Armado</h3>
        <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
            style={{ width: `${assembledPercentage}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700">
            {assembledPercentage.toFixed(1)}% Armado
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>0 m³</span>
          <span>{stats.total_cubic_meters.toFixed(2)} m³</span>
        </div>
      </div>

      {/* Estados de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjetas Verdes */}
        <div className="bg-white rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tarjetas Verdes</h3>
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">✓</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {stats.green_cards_count}
          </div>
          <p className="text-sm text-gray-600">
            {greenCardsPercentage.toFixed(1)}% del total
          </p>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${greenCardsPercentage}%` }}
            />
          </div>
        </div>

        {/* Tarjetas Rojas */}
        <div className="bg-white rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tarjetas Rojas</h3>
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">✗</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-red-600 mb-2">
            {stats.red_cards_count}
          </div>
          <p className="text-sm text-gray-600">
            {(100 - greenCardsPercentage).toFixed(1)}% del total
          </p>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${100 - greenCardsPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Botón de Actualizar */}
      <div className="flex justify-end">
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Actualizar</span>
        </button>
      </div>
    </div>
  );
};

export default CubicMetersDashboard;
