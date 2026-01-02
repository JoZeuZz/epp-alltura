import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useGet } from '../../hooks/useGet';
import Modal from '../../components/Modal';
import ProjectSelector from '../../components/ProjectSelector';
import ScaffoldFilters from '../../components/ScaffoldFilters';
import ScaffoldGrid from '../../components/ScaffoldGrid';
import LoadingOverlay from '../../components/LoadingOverlay';
import ScaffoldDetailsModal from '../../components/ScaffoldDetailsModal';
import { Project, Scaffold } from '../../types/api';

const ScaffoldsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState({ status: 'all', startDate: '', endDate: '' });
  const [scaffolds, setScaffolds] = useState<Scaffold[]>([]);
  const [selectedScaffold, setSelectedScaffold] = useState<Scaffold | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);

  const { data: projects, isLoading: projectsLoading } = useGet<Project[]>('projects', '/projects');
  const { data: allScaffolds, isLoading: scaffoldsLoading } = useGet<Scaffold[]>(
    ['scaffolds', selectedProjectId], // Query key depends on the selected project
    `/scaffolds/project/${selectedProjectId}`,
    undefined, // No params needed here
    { enabled: !!selectedProjectId }, // This is a React Query option, not an API param
  );

  // Leer parámetros de URL al cargar - establecer el proyecto primero
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    
    if (projectIdFromUrl && !selectedProjectId) {
      console.log('Setting project from URL:', projectIdFromUrl);
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [searchParams, selectedProjectId]);

  // Una vez que los scaffolds se cargan, abrir el modal si hay reportId
  useEffect(() => {
    if (urlParamsProcessed || !allScaffolds) return;
    
    const reportIdFromUrl = searchParams.get('reportId');
    
    if (reportIdFromUrl && allScaffolds.length > 0) {
      console.log('Looking for report:', reportIdFromUrl, 'in', allScaffolds.length, 'scaffolds');
      const scaffold = allScaffolds.find(s => s.id === parseInt(reportIdFromUrl));
      
      if (scaffold) {
        console.log('Found scaffold, opening modal:', scaffold);
        setSelectedScaffold(scaffold);
        setUrlParamsProcessed(true);
        // Limpiar parámetros después de abrir
        setTimeout(() => setSearchParams({}), 100);
      } else {
        console.log('Scaffold not found with id:', reportIdFromUrl);
      }
    }
  }, [allScaffolds, searchParams, urlParamsProcessed, setSearchParams]);

  // Apply filters when filters or allScaffolds change
  useEffect(() => {
    if (!allScaffolds || !selectedProjectId) {
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
  }, [filters, allScaffolds, selectedProjectId]);

  const handleCloseModal = () => {
    setSelectedScaffold(null);
  };

  const handleCreateScaffold = () => {
    if (!selectedProjectId) {
      toast.error('Por favor, selecciona un proyecto primero');
      return;
    }
    
    // Verificar si el proyecto está activo
    if (selectedProject && (!selectedProject.active || !selectedProject.client_active)) {
      toast.error('No se pueden crear andamios para un proyecto o cliente desactivado');
      return;
    }
    
    navigate(`/admin/project/${selectedProjectId}/create-scaffold`);
  };

  const handleDeleteScaffold = async (scaffoldId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`/api/scaffolds/${scaffoldId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      toast.success('Reporte eliminado correctamente');
      
      // Actualizar la lista local eliminando el andamio
      setScaffolds(scaffolds.filter(s => s.id !== scaffoldId));
      
      // Cerrar el modal
      setSelectedScaffold(null);
      
      // Recargar los datos del servidor
      window.location.reload();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al eliminar el reporte';
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedProjectId) return;
    setExporting(true);
    try {
      // Pasar solo los filtros como query params (sin incluir responseType)
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `/api/projects/${selectedProjectId}/report/pdf?${queryParams.toString()}`, 
        {
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(response.data);
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
      toast.success('PDF generado exitosamente');
    } catch (err: any) {
      const errorMsg = 'Error al generar el PDF.';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedProjectId) return;
    setExportingExcel(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `/api/projects/${selectedProjectId}/report/excel`,
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
      const project = projects?.find((p) => p.id.toString() === selectedProjectId);
      const filename = `Reporte-Proyecto-${project?.name.replace(/\s/g, '_') || 'export'}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      toast.success('Excel generado exitosamente');
    } catch (err: any) {
      const errorMsg = 'Error al generar el Excel.';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  const isLoading = projectsLoading || scaffoldsLoading;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-dark-blue mb-4 md:mb-6">Visualizador de Andamios</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="md:col-span-1">
          <ProjectSelector
            projects={projects || []}
            selectedProjectId={selectedProjectId}
            onProjectSelect={(projectId) => {
              setSelectedProjectId(projectId);
              const project = projects?.find(p => p.id === parseInt(projectId));
              setSelectedProject(project || null);
            }}
          />
        </div>
        <div className="md:col-span-3">
          <ScaffoldFilters filters={filters} onFilterChange={setFilters} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 mb-4">
        {selectedProject && (!selectedProject.active || !selectedProject.client_active) && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-2 rounded" role="alert">
            <p className="font-bold">Proyecto Desactivado</p>
            <p className="text-sm">
              {!selectedProject.client_active 
                ? 'El cliente empresa está desactivado. No se pueden crear ni editar andamios.' 
                : 'Este proyecto está desactivado. No se pueden crear ni editar andamios.'}
            </p>
          </div>
        )}
        <button
          onClick={handleCreateScaffold}
          disabled={!selectedProjectId || !selectedProject?.active || !selectedProject?.client_active}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm md:text-base w-full sm:w-auto"
        >
          + Crear Andamio
        </button>
        <button
          onClick={handleExportPDF}
          disabled={!selectedProjectId || exporting}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 text-sm md:text-base w-full sm:w-auto"
        >
          {exporting ? 'Generando...' : 'Exportar a PDF'}
        </button>
        <button
          onClick={handleExportExcel}
          disabled={!selectedProjectId || exportingExcel}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400 text-sm md:text-base w-full sm:w-auto"
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

      <LoadingOverlay 
        isOpen={exporting} 
        message="Generando PDF del proyecto..."
        subMessage="Esto puede tomar unos segundos dependiendo del número de andamios"
      />
      
      <LoadingOverlay 
        isOpen={exportingExcel} 
        message="Generando Excel del proyecto..."
        subMessage="Procesando datos y creando el archivo"
      />

      <Modal isOpen={!!selectedScaffold} onClose={handleCloseModal}>
        {selectedScaffold && (
          <ScaffoldDetailsModal
            scaffold={selectedScaffold}
            onDelete={handleDeleteScaffold}
            canEdit={true}
            projectId={selectedProjectId ? Number(selectedProjectId) : undefined}
            onUpdate={() => {
              window.location.reload();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default ScaffoldsPage;
