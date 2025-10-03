import React, { useState } from 'react';
import { post } from '../services/apiService';
import { Project, Report } from '../types/api';
import { useGet } from '../hooks/useGet';

const ReportViewerPage: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const { data: projects } = useGet<Project[]>('projects', '/projects');
  const { data: reports } = useGet<Report[]>(
    `reports-${selectedProjectId}`,
    `/projects/${selectedProjectId}/reports`,
    { enabled: !!selectedProjectId },
  );

  const filteredReports =
    reports?.filter((report) => {
      const reportDate = new Date(report.assembly_created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && reportDate < start) return false;
      if (end) {
        // Include the whole day
        end.setHours(23, 59, 59, 999);
        if (reportDate > end) return false;
      }
      return true;
    }) || [];

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!selectedProjectId) return;
    try {
      // Se espera que la respuesta sea un Blob para la descarga del archivo.
      const response = (await post(
        `/projects/${selectedProjectId}/export?format=${format}`,
        // La configuración de axios se pasa dentro del segundo argumento.
        { data: { startDate, endDate }, config: { responseType: 'blob' } },
      )) as Blob;

      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'pdf' ? 'pdf' : 'xlsx';
      link.setAttribute('download', `reporte_proyecto_${selectedProjectId}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(`Error exporting ${format}`, error);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-dark-blue mb-8">Visualizador de Reportes</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8 bg-white p-4 rounded-lg shadow-md items-end">
        <div>
          <label htmlFor="project-select" className="block text-sm font-medium text-neutral-gray">
            Proyecto
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
          >
            <option value="" disabled>
              Selecciona un proyecto
            </option>
            {projects?.map((p: Project) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-neutral-gray">
            Fecha Desde
          </label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-neutral-gray">
            Fecha Hasta
          </label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
          />
        </div>
        <div className="flex items-end space-x-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={!selectedProjectId}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50"
          >
            Exportar PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={!selectedProjectId}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Report Grid */}
      {selectedProjectId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-transform duration-300"
                onClick={() => setSelectedReport(report)}
              >
                <img
                  src={report.assembly_image_url}
                  alt="Reporte"
                  className="h-48 w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-lg font-bold text-dark-blue">{report.cubic_meters} m³</p>
                  <p className="text-sm text-neutral-gray">{report.user_name || 'N/A'}</p>
                  <p className="text-sm text-neutral-gray">
                    {new Date(report.assembly_created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-neutral-gray col-span-full text-center">
              No se encontraron reportes para este proyecto y rango de fechas.
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <p className="text-neutral-gray">
            Por favor, selecciona un proyecto para ver sus reportes.
          </p>
        </div>
      )}

      {/* Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <h3 className="text-2xl font-bold text-dark-blue mb-4">Detalles del Reporte</h3>
              <img
                src={selectedReport.assembly_image_url}
                alt="Reporte Detallado"
                className="rounded-lg w-full object-contain max-h-[60vh]"
              />
              <div className="mt-4">
                <p className="mt-2">
                  <strong>Metros Cúbicos:</strong> {selectedReport.cubic_meters} m³
                </p>
                <p>
                  <strong>Progreso:</strong> {selectedReport.progress_percentage}%
                </p>
                <p>
                  <strong>Técnico:</strong> {selectedReport.user_name || 'N/A'}
                </p>
                <p>
                  <strong>Fecha:</strong>{' '}
                  {new Date(selectedReport.assembly_created_at).toLocaleString()}
                </p>
                {selectedReport.assembly_notes && (
                  <p className="mt-2">
                    <strong>Notas:</strong> {selectedReport.assembly_notes}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportViewerPage;
