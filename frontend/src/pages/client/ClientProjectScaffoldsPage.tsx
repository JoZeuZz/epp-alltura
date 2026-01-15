import React, { useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import ScaffoldDetailsModal from '../../components/ScaffoldDetailsModal';
import { ProjectDashboard } from '../../components/dashboard';
import { Project, Scaffold } from '../../types/api';

interface ProjectDashboardSummary {
  totalCubicMeters: number;
  assembledCubicMeters: number;
  disassembledCubicMeters: number;
  inProgressCubicMeters: number;
  totalScaffolds: number;
  assembledScaffolds: number;
  disassembledScaffolds: number;
  inProgressScaffolds: number;
  greenCards: number;
  redCards: number;
  recentScaffoldsCount: number;
  avgProgress: number;
}

interface LoaderData {
  project: Project;
  scaffolds: Scaffold[];
  summary: ProjectDashboardSummary;
}

/**
 * Página de visualización de andamios para usuarios cliente
 * Vista de solo lectura con dashboard de métricas y andamios del proyecto
 */
const ClientProjectScaffoldsPage: React.FC = () => {
  const revalidator = useRevalidator();
  const { project, scaffolds, summary } = useLoaderData() as LoaderData;
  const [selectedScaffold, setSelectedScaffold] = useState<Scaffold | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDashboard, setShowDashboard] = useState<boolean>(true);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const refetchScaffolds = async () => {
    revalidator.revalidate();
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `/api/projects/${project.id}/report/pdf`, 
        {
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      const filename = `Reporte-${project?.name.replace(/\s/g, '_') || 'proyecto'}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      toast.success('PDF generado exitosamente');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiError?.response?.data?.message || 'Error al generar el PDF';
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `/api/projects/${project.id}/report/excel`,
        {
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      const filename = `Reporte-${project?.name.replace(/\s/g, '_') || 'proyecto'}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      toast.success('Excel generado exitosamente');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiError?.response?.data?.message || 'Error al generar el Excel';
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  const filteredScaffolds = scaffolds?.filter((scaffold) => {
    if (statusFilter === 'all') return true;
    return scaffold.assembly_status === statusFilter;
  });

  return (
    <div className="pb-4">
      {/* Header compacto */}
      <div className="mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-3xl font-bold text-dark-blue">
          {project?.name || 'Proyecto'}
        </h1>
        <p className="text-xs sm:text-base text-gray-500">Cliente: {project?.client_name}</p>
      </div>

      {/* Toggle Dashboard/Andamios - Ultra compacto en móvil */}
      <div className="flex gap-1.5 mb-3 sm:mb-4">
        <button
          onClick={() => setShowDashboard(true)}
          className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            showDashboard
              ? 'bg-primary-blue text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setShowDashboard(false)}
          className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            !showDashboard
              ? 'bg-primary-blue text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          <span>Andamios</span>
        </button>
      </div>

      {/* Botones de exportación - Solo visible cuando HAY andamios */}
      {!showDashboard && scaffolds && scaffolds.length > 0 && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">{exporting ? 'Generando...' : 'Exportar PDF'}</span>
            <span className="sm:hidden">PDF</span>
          </button>
          
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">{exportingExcel ? 'Generando...' : 'Exportar Excel'}</span>
            <span className="sm:hidden">Excel</span>
          </button>
        </div>
      )}

      {/* Dashboard o Lista de Andamios */}
      {showDashboard ? (
        <ProjectDashboard summary={summary} projectName={project?.name} />
      ) : (
        <>
          {/* Filtros - Solo visible cuando HAY andamios */}
          {scaffolds && scaffolds.length > 0 && (
            <div className="mb-3 sm:mb-4">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm ${
                    statusFilter === 'all'
                      ? 'bg-primary-blue text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                    <span>Todos</span>
                    <span className={`text-xs font-bold ${
                      statusFilter === 'all' ? 'text-white/90' : 'text-gray-500'
                    }`}>({scaffolds?.length || 0})</span>
                  </div>
                </button>
                <button
                  onClick={() => setStatusFilter('assembled')}
                  className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm ${
                    statusFilter === 'assembled'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                    <span>Armados</span>
                    <span className={`text-xs font-bold ${
                      statusFilter === 'assembled' ? 'text-white/90' : 'text-gray-500'
                    }`}>({scaffolds?.filter((s) => s.assembly_status === 'assembled').length || 0})</span>
                  </div>
                </button>
                <button
                  onClick={() => setStatusFilter('in_progress')}
                  className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm ${
                    statusFilter === 'in_progress'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                    <span className="hidden sm:inline">En Proceso</span>
                    <span className="sm:hidden">Proceso</span>
                    <span className={`text-xs font-bold ${
                      statusFilter === 'in_progress' ? 'text-white/90' : 'text-gray-500'
                    }`}>({scaffolds?.filter((s) => s.assembly_status === 'in_progress').length || 0})</span>
                  </div>
                </button>
                <button
                  onClick={() => setStatusFilter('disassembled')}
                  className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm ${
                    statusFilter === 'disassembled'
                      ? 'bg-yellow-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                    <span>Desarmados</span>
                    <span className={`text-xs font-bold ${
                      statusFilter === 'disassembled' ? 'text-white/90' : 'text-gray-500'
                    }`}>({scaffolds?.filter((s) => s.assembly_status === 'disassembled').length || 0})</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Grid de andamios */}
          {!filteredScaffolds || filteredScaffolds.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay andamios</h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter === 'all'
                  ? 'Aún no hay andamios creados en este proyecto.'
                  : `No hay andamios ${
                      statusFilter === 'assembled'
                        ? 'armados'
                        : statusFilter === 'in_progress'
                        ? 'en proceso'
                        : 'desarmados'
                    } en este momento.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredScaffolds.map((scaffold) => (
                <div
                  key={scaffold.id}
                  onClick={() => setSelectedScaffold(scaffold)}
                  className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                >
                  {/* Imagen */}
                  <div className="relative h-48 bg-gray-200">
                    <img
                      src={scaffold.assembly_image_url || '/placeholder-scaffold.png'}
                      alt={`Andamio #${scaffold.id}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo imagen%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {/* Badge de estado de ensamblaje */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full shadow-lg ${
                          scaffold.assembly_status === 'assembled'
                            ? 'bg-green-500 text-white'
                            : scaffold.assembly_status === 'in_progress'
                            ? 'bg-blue-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}
                      >
                        {scaffold.assembly_status === 'assembled'
                          ? `Armado ${scaffold.progress_percentage}%`
                          : scaffold.assembly_status === 'in_progress'
                          ? `En Proceso ${scaffold.progress_percentage}%`
                          : 'Desarmado'}
                      </span>
                    </div>
                    {/* Badge de estado de tarjeta */}
                    <div className="absolute top-2 left-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center ${
                            scaffold.card_status === 'green'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                          title={scaffold.card_status === 'green' ? 'Tarjeta Verde - Habilitado' : 'Tarjeta Roja - No Habilitado'}
                        >
                          {scaffold.card_status === 'red' && (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Información */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-dark-blue">
                        Andamio #{scaffold.id}
                      </h3>
                    </div>
                    
                    {/* Indicadores de estado */}
                    <div className="flex gap-2 mb-3">
                      <div
                        className={`px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
                          scaffold.card_status === 'green'
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {scaffold.card_status === 'green' ? (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Tarjeta Verde
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                            </svg>
                            Tarjeta Roja
                          </>
                        )}
                      </div>
                      {scaffold.assembly_status === 'disassembled' && (
                        <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300 inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Desarmado
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      {scaffold.location && (
                        <p>
                          <span className="font-semibold">Ubicación:</span> {scaffold.location}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold">Dimensiones:</span> {scaffold.height}m ×{' '}
                        {scaffold.width}m × {scaffold.length}m
                      </p>
                      <p>
                        <span className="font-semibold">Volumen:</span> {scaffold.cubic_meters} m³
                      </p>
                      {scaffold.assembly_status === 'in_progress' && (
                        <p>
                          <span className="font-semibold">Avance:</span>{' '}
                          {scaffold.progress_percentage}%
                        </p>
                      )}
                      <p>
                        <span className="font-semibold">Fecha:</span>{' '}
                        {new Date(scaffold.assembly_created_at).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de detalles */}
      <Modal isOpen={!!selectedScaffold} onClose={() => setSelectedScaffold(null)}>
        {selectedScaffold && (
          <ScaffoldDetailsModal
            scaffold={selectedScaffold}
            onUpdate={() => {
              refetchScaffolds();
              setSelectedScaffold(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default ClientProjectScaffoldsPage;
