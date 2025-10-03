import React, { useState, useEffect } from 'react';
import { useGet } from '../../hooks/useGet';
import * as api from '../../services/apiService';
import Modal from '../../components/Modal';
import ProjectSelector from '../../components/ProjectSelector';
import ScaffoldFilters from '../../components/ScaffoldFilters';
import ScaffoldGrid from '../../components/ScaffoldGrid';
import { Project, Scaffold } from '../../types/api';

const ScaffoldsPage: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [filters, setFilters] = useState({ status: 'all', startDate: '', endDate: '' });
  const [scaffolds, setScaffolds] = useState<Scaffold[]>([]);
  const [selectedScaffold, setSelectedScaffold] = useState<Scaffold | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: projects, isLoading: projectsLoading } = useGet<Project[]>('projects', '/projects');
  const { data: allScaffolds, isLoading: scaffoldsLoading } = useGet<Scaffold[]>(
    'scaffolds',
    `/scaffolds/project/${selectedProjectId}`,
    { enabled: !!selectedProjectId },
  );

  // Apply filters when filters or allScaffolds change
  useEffect(() => {
    if (!allScaffolds) {
      setScaffolds([]);
      return;
    }
    let filtered = [...allScaffolds];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter((s) => s.status === filters.status);
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(
        (s) => new Date(s.assembly_created_at) >= new Date(filters.startDate),
      );
    }
    if (filters.endDate) {
      // Add 1 day to endDate to include the whole day
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      filtered = filtered.filter((s) => new Date(s.assembly_created_at) < end);
    }

    setScaffolds(filtered);
  }, [filters, allScaffolds]);

  const handleCloseModal = () => {
    setSelectedScaffold(null);
  };

  const handleExportPDF = async () => {
    if (!selectedProjectId) return;
    setExporting(true);
    try {
      // Pasar los filtros como query params
      const params = new URLSearchParams(filters as Record<string, string>).toString();
      const response = await api.get<Blob>(`/projects/${selectedProjectId}/export/pdf?${params}`, {
        responseType: 'blob', // Importante para recibir el archivo
      });
      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      const project = projects?.find((p) => p.id.toString() === selectedProjectId);
      const filename = `Reporte-Proyecto-${project?.name.replace(/\s/g, '_') || 'export'}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    } catch (err) {
      setError('Error al generar el PDF.');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedProjectId) return;
    setExportingExcel(true);
    try {
      const response = await api.get<Blob>(`/projects/${selectedProjectId}/export/excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      const project = projects?.find((p) => p.id.toString() === selectedProjectId);
      const filename = `Reporte-Proyecto-${project?.name.replace(/\s/g, '_') || 'export'}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    } catch (err) {
      setError('Error al generar el Excel.');
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  const isLoading = projectsLoading || scaffoldsLoading;

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark-blue mb-6">Visualizador de Andamios</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="md:col-span-1">
          <ProjectSelector
            projects={projects || []}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
          />
        </div>
        <div className="md:col-span-3">
          <ScaffoldFilters filters={filters} onFilterChange={setFilters} />
        </div>
      </div>

      <div className="flex justify-end space-x-2 mb-4">
        <button
          onClick={handleExportPDF}
          disabled={!selectedProjectId || exporting}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400"
        >
          {exporting ? 'Generando...' : 'Exportar a PDF'}
        </button>
        <button
          onClick={handleExportExcel}
          disabled={!selectedProjectId || exportingExcel}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
        >
          {exportingExcel ? 'Generando...' : 'Exportar a Excel'}
        </button>
      </div>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}

      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <ScaffoldGrid scaffolds={scaffolds} onScaffoldSelect={setSelectedScaffold} />
      )}

      <Modal isOpen={!!selectedScaffold} onClose={handleCloseModal}>
        {selectedScaffold && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-dark-blue">
              Detalle del Andamio #{selectedScaffold.id}
            </h2>
            <div className="space-y-4">
              <img
                src={selectedScaffold.assembly_image_url}
                alt="Foto de montaje"
                className="rounded-lg w-full object-contain max-h-[50vh]"
              />
              <div className="p-4 bg-gray-100 rounded-lg">
                <p>
                  <strong>Fecha de Montaje:</strong>{' '}
                  {new Date(selectedScaffold.assembly_created_at).toLocaleString()}
                </p>
                <p>
                  <strong>Dimensiones:</strong> {selectedScaffold.height}m x{' '}
                  {selectedScaffold.width}m x {selectedScaffold.depth}m
                </p>
                <p>
                  <strong>Metros Cúbicos:</strong> {selectedScaffold.cubic_meters} m³
                </p>
                <p>
                  <strong>Estado:</strong>{' '}
                  <span className="capitalize">
                    {selectedScaffold.status === 'assembled' ? 'Armado' : 'Desarmado'}
                  </span>
                </p>
                {selectedScaffold.assembly_notes && (
                  <p className="mt-2">
                    <strong>Notas de Montaje:</strong> {selectedScaffold.assembly_notes}
                  </p>
                )}
              </div>
              {selectedScaffold.status === 'disassembled' && (
                <div className="p-4 bg-gray-100 rounded-lg border-t">
                  <h3 className="font-bold text-dark-blue">Información de Desmontaje</h3>
                  {selectedScaffold.disassembly_image_url && (
                    <img
                      src={selectedScaffold.disassembly_image_url}
                      alt="Foto de desmontaje"
                      className="mt-2 rounded-lg w-full object-contain max-h-[50vh]"
                    />
                  )}
                  {selectedScaffold.disassembled_at && (
                    <p>
                      <strong>Fecha de Desmontaje:</strong>{' '}
                      {new Date(selectedScaffold.disassembled_at).toLocaleString()}
                    </p>
                  )}
                  {selectedScaffold.disassembly_notes && (
                    <p className="mt-2">
                      <strong>Notas de Desmontaje:</strong> {selectedScaffold.disassembly_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScaffoldsPage;
