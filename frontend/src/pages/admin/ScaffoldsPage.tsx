import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLoaderData } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import Modal from '../../components/Modal';
import ProjectSelector from '../../components/ProjectSelector';
import ScaffoldFilters from '../../components/ScaffoldFilters';
import ScaffoldGrid from '../../components/ScaffoldGrid';
import LoadingOverlay from '../../components/LoadingOverlay';
import ScaffoldDetailsModal from '../../components/ScaffoldDetailsModal';
import { Project, Scaffold } from '../../types/api';

const ScaffoldsPage: React.FC = () => {
  const { projects: initialProjects } = useLoaderData() as { projects: Project[] };
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

  const projects = initialProjects;
  const projectsLoading = false;
  const scaffoldsLoading = false;

  // Fetch scaffolds when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      const fetchScaffolds = async () => {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`http://localhost:5000/api/scaffolds/project/${selectedProjectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setScaffolds(data);
      };
      fetchScaffolds();
    }
  }, [selectedProjectId]);

  // Leer parámetros de URL al cargar - establecer el proyecto primero
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    
    if (projectIdFromUrl && !selectedProjectId) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [searchParams, selectedProjectId]);

  // Una vez que los scaffolds se cargan, abrir el modal si hay reportId
  useEffect(() => {
    if (urlParamsProcessed || !scaffolds) return;
    
    const reportIdFromUrl = searchParams.get('reportId');
    
    if (reportIdFromUrl && scaffolds.length > 0) {
      const scaffold = scaffolds.find(s => s.id === parseInt(reportIdFromUrl));
      
      if (scaffold) {
        setSelectedScaffold(scaffold);
        setUrlParamsProcessed(true);
        // Limpiar parámetros después de abrir
        setTimeout(() => setSearchParams({}), 100);
      }
    }
  }, [scaffolds, searchParams, urlParamsProcessed, setSearchParams]);

  // Filtrar scaffolds (calculado, no estado)
  const filteredScaffolds = React.useMemo(() => {
    if (!scaffolds || !selectedProjectId) {
      return [];
    }
    let filtered = [...scaffolds];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter((s) => s.assembly_status === filters.status);
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

    return filtered;
  }, [filters, scaffolds, selectedProjectId]);

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
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiError?.response?.data?.message || 'Error al eliminar el reporte';
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      const errorMsg = 'Error al generar el Excel.';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  const isLoading = projectsLoading || scaffoldsLoading;

  // Calcular estadísticas para mostrar
  const stats = {
    total: filteredScaffolds.length,
    assembled: filteredScaffolds.filter(s => s.assembly_status === 'assembled').length,
    inProgress: filteredScaffolds.filter(s => s.assembly_status === 'in_progress').length,
    disassembled: filteredScaffolds.filter(s => s.assembly_status === 'disassembled').length,
    totalM3: filteredScaffolds.reduce((sum, s) => sum + (Number(s.cubic_meters) || 0), 0),
    assembledM3: filteredScaffolds
      .filter(s => s.assembly_status === 'assembled')
      .reduce((sum, s) => sum + (Number(s.cubic_meters) || 0), 0),
    greenCards: filteredScaffolds.filter(s => s.card_status === 'green').length,
    redCards: filteredScaffolds.filter(s => s.card_status === 'red').length,
  };

  return (
    <div className="space-y-6">
      {/* Header con título y descripción */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 shadow-lg text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Visualizador de Andamios</h1>
        <p className="text-blue-100 text-sm md:text-base">
          Gestiona y visualiza todos los andamios del proyecto
        </p>
      </div>

      {/* Selectores y Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-lg font-semibold text-dark-blue mb-4">Seleccionar Proyecto</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

      {/* Alerta de proyecto desactivado */}
      {selectedProject && (!selectedProject.active || !selectedProject.client_active) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Proyecto Desactivado</p>
              <p className="mt-1 text-sm text-yellow-700">
                {!selectedProject.client_active 
                  ? 'El cliente empresa está desactivado. No se pueden crear ni editar andamios.' 
                  : 'Este proyecto está desactivado. No se pueden crear ni editar andamios.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas del proyecto */}
      {selectedProjectId && filteredScaffolds.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg font-semibold text-dark-blue mb-4">Estadísticas del Proyecto</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Total Andamios */}
            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-500">
              <p className="text-xs text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
            </div>
            
            {/* Armados */}
            <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
              <p className="text-xs text-green-700 mb-1">Armados</p>
              <p className="text-2xl font-bold text-green-600">{stats.assembled}</p>
            </div>
            
            {/* En Proceso */}
            <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-500">
              <p className="text-xs text-yellow-700 mb-1">En Proceso</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
            
            {/* Desarmados */}
            <div className="bg-red-50 rounded-lg p-3 border-l-4 border-red-500">
              <p className="text-xs text-red-700 mb-1">Desarmados</p>
              <p className="text-2xl font-bold text-red-600">{stats.disassembled}</p>
            </div>
            
            {/* Total m³ */}
            <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
              <p className="text-xs text-blue-700 mb-1">Total m³</p>
              <p className="text-xl font-bold text-blue-600">{stats.totalM3.toFixed(1)}</p>
            </div>
            
            {/* m³ Armados */}
            <div className="bg-cyan-50 rounded-lg p-3 border-l-4 border-cyan-500">
              <p className="text-xs text-cyan-700 mb-1">m³ Armados</p>
              <p className="text-xl font-bold text-cyan-600">{stats.assembledM3.toFixed(1)}</p>
            </div>
            
            {/* Tarjetas Verdes */}
            <div className="bg-emerald-50 rounded-lg p-3 border-l-4 border-emerald-500">
              <p className="text-xs text-emerald-700 mb-1">🟢 Verdes</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.greenCards}</p>
            </div>
            
            {/* Tarjetas Rojas */}
            <div className="bg-rose-50 rounded-lg p-3 border-l-4 border-rose-500">
              <p className="text-xs text-rose-700 mb-1">🔴 Rojas</p>
              <p className="text-2xl font-bold text-rose-600">{stats.redCards}</p>
            </div>
          </div>
        </div>
      )}

      {/* Acciones principales */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-dark-blue">
            {selectedProjectId 
              ? `${filteredScaffolds.length} Andamio${filteredScaffolds.length !== 1 ? 's' : ''} Encontrado${filteredScaffolds.length !== 1 ? 's' : ''}`
              : 'Selecciona un proyecto para comenzar'}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handleCreateScaffold}
              disabled={!selectedProjectId || !selectedProject?.active || !selectedProject?.client_active}
              className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Andamio
            </button>
            
            <button
              onClick={handleExportPDF}
              disabled={!selectedProjectId || exporting}
              className="bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {exporting ? 'Generando...' : 'Exportar PDF'}
            </button>
            
            <button
              onClick={handleExportExcel}
              disabled={!selectedProjectId || exportingExcel}
              className="bg-green-500 text-white px-4 py-2.5 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exportingExcel ? 'Generando...' : 'Exportar Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Grid de andamios o estado vacío */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando andamios...</p>
        </div>
      ) : selectedProjectId ? (
        filteredScaffolds.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <ScaffoldGrid scaffolds={filteredScaffolds} onScaffoldSelect={setSelectedScaffold} />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="mt-4 text-gray-600 font-medium">No se encontraron andamios</p>
            <p className="mt-2 text-gray-500 text-sm">Crea un nuevo andamio o ajusta los filtros</p>
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="mt-4 text-gray-600 font-medium">Selecciona un proyecto</p>
          <p className="mt-2 text-gray-500 text-sm">Elige un proyecto para visualizar sus andamios</p>
        </div>
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
