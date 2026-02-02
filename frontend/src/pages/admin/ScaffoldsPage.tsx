import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLoaderData } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import ProjectSelector from '../../components/ProjectSelector';
import ScaffoldFilters from '../../components/ScaffoldFilters';
import ScaffoldGrid from '../../components/ScaffoldGrid';
import LoadingOverlay from '../../components/LoadingOverlay';
import ScaffoldDetailsModal from '../../components/ScaffoldDetailsModal';
import { Project, Scaffold } from '../../types/api';
import UploadProgress, { UploadStage } from '../../components/UploadProgress';
import { apiService, get, patch, del, uploadWithProgress } from '../../services/apiService';
import {
  processImageFile,
  formatBytes,
  ImageProcessingResult,
  ALLOWED_IMAGE_ACCEPT,
} from '../../utils/imageProcessing';

// Alertas inteligentes deshabilitadas temporalmente

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
  const [scaffoldToDisassemble, setScaffoldToDisassemble] = useState<number | null>(null);
  const [disassembleImage, setDisassembleImage] = useState<File | null>(null);
  const [disassembleNotes, setDisassembleNotes] = useState('');
  const [isDisassembling, setIsDisassembling] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageMeta, setImageMeta] = useState<ImageProcessingResult | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedScaffoldIds, setSelectedScaffoldIds] = useState<Set<number>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  // Alertas inteligentes deshabilitadas temporalmente

  const projects = initialProjects;
  const projectsLoading = false;
  const scaffoldsLoading = false;

  const fetchScaffolds = async (projectId: string) => {
    if (!projectId) return;
    try {
      setError(null);
      const data = await get<Scaffold[]>(`/scaffolds/project/${projectId}`);
      setScaffolds(data || []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar los andamios del proyecto.');
    }
  };

  // Fetch scaffolds when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      fetchScaffolds(selectedProjectId);
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
  const baseFilteredScaffolds = React.useMemo(() => {
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

  const filteredScaffolds = baseFilteredScaffolds;

  useEffect(() => {
    setBulkMode(false);
    setSelectedScaffoldIds(new Set());
    // alertFilter deshabilitado
  }, [selectedProjectId]);

  useEffect(() => {
    if (!bulkMode && selectedScaffoldIds.size > 0) {
      setSelectedScaffoldIds(new Set());
    }
  }, [bulkMode, selectedScaffoldIds.size]);

  useEffect(() => {
    if (selectedScaffoldIds.size === 0) return;
    const visibleIds = new Set(baseFilteredScaffolds.map((s) => s.id));
    setSelectedScaffoldIds((prev) => {
      const next = new Set<number>();
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [baseFilteredScaffolds, selectedScaffoldIds.size]);

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

  const handleToggleCard = async (scaffoldId: number, currentStatus: 'green' | 'red') => {
    try {
      const newStatus = currentStatus === 'green' ? 'red' : 'green';
      
      await patch(`/scaffolds/${scaffoldId}/card-status`, { card_status: newStatus });
      
      toast.success(`Tarjeta cambiada a ${newStatus === 'green' ? 'verde' : 'roja'}`);
      
      // Actualizar estado local
      setScaffolds(scaffolds.map(s => 
        s.id === scaffoldId ? { ...s, card_status: newStatus } : s
      ));
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiError?.response?.data?.message || 'Error al cambiar la tarjeta';
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleToggleSelect = (scaffoldId: number) => {
    setSelectedScaffoldIds((prev) => {
      const next = new Set(prev);
      if (next.has(scaffoldId)) {
        next.delete(scaffoldId);
      } else {
        next.add(scaffoldId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedScaffoldIds(new Set(filteredScaffolds.map((s) => s.id)));
  };

  const handleClearSelection = () => {
    setSelectedScaffoldIds(new Set());
  };

  const handleBulkCardStatus = async (status: 'green' | 'red') => {
    if (selectedScaffoldIds.size === 0) {
      toast.error('Selecciona al menos un andamio');
      return;
    }

    const selectedScaffolds = scaffolds.filter((s) => selectedScaffoldIds.has(s.id));
    const eligibleScaffolds = selectedScaffolds.filter(
      (s) => s.assembly_status === 'assembled' && s.progress_percentage === 100,
    );
    const toUpdate = eligibleScaffolds.filter((s) => s.card_status !== status);
    const skipped = selectedScaffolds.length - eligibleScaffolds.length;
    const already = eligibleScaffolds.length - toUpdate.length;

    if (toUpdate.length === 0) {
      if (eligibleScaffolds.length === 0) {
        toast.error('No hay andamios elegibles para cambiar tarjeta');
      } else {
        toast(`Todos los seleccionados ya están en tarjeta ${status === 'green' ? 'verde' : 'roja'}`, {
          icon: 'ℹ️',
        });
      }
      return;
    }

    setBulkUpdating(true);
    try {
      const results = await Promise.allSettled(
        toUpdate.map((scaffold) =>
          patch(`/scaffolds/${scaffold.id}/card-status`, { card_status: status }),
        ),
      );

      const successIds: number[] = [];
      const failedIds: number[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successIds.push(toUpdate[index].id);
        } else {
          failedIds.push(toUpdate[index].id);
        }
      });

      if (successIds.length > 0) {
        setScaffolds((prev) =>
          prev.map((scaffold) =>
            successIds.includes(scaffold.id) ? { ...scaffold, card_status: status } : scaffold,
          ),
        );
        toast.success(
          `${successIds.length} andamio${successIds.length === 1 ? '' : 's'} actualizado${successIds.length === 1 ? '' : 's'}`,
        );
      }

      if (failedIds.length > 0) {
        toast.error(`No se pudieron actualizar ${failedIds.length} andamio${failedIds.length === 1 ? '' : 's'}`);
      }

      if (skipped > 0) {
        toast(`Se omitieron ${skipped} por no estar al 100% armado`, { icon: '⚠️' });
      }

      if (already > 0) {
        toast(`Se omitieron ${already} porque ya estaban ${status === 'green' ? 'verdes' : 'rojas'}`, {
          icon: 'ℹ️',
        });
      }
    } catch (err) {
      toast.error('Error al actualizar tarjetas');
      console.error(err);
    } finally {
      setBulkUpdating(false);
      setSelectedScaffoldIds(new Set());
    }
  };

  const handleDisassemble = (scaffoldId: number) => {
    setScaffoldToDisassemble(scaffoldId);
    setDisassembleImage(null);
    setDisassembleNotes('');
    setImageMeta(null);
    setIsProcessingImage(false);
  };

  const handleDisassembleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const processed = await processImageFile(file);
      setDisassembleImage(processed.file);
      setImageMeta(processed);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error(error instanceof Error ? error.message : 'Error al procesar la imagen');
      setDisassembleImage(null);
      setImageMeta(null);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleConfirmDisassemble = async () => {
    if (!scaffoldToDisassemble || !disassembleImage) {
      toast.error('Por favor, selecciona una imagen del desarmado');
      return;
    }

    setIsDisassembling(true);
    try {
      const formData = new FormData();
      formData.append('disassembly_image', disassembleImage);
      if (disassembleNotes) {
        formData.append('disassembly_notes', disassembleNotes);
      }

      const controller = new AbortController();
      uploadControllerRef.current = controller;
      setUploadProgress(0);
      setUploadStage('processing');
      await new Promise((resolve) => setTimeout(resolve, 0));
      setUploadStage('uploading');
      await uploadWithProgress(
        'put',
        `/scaffolds/${scaffoldToDisassemble}/disassemble`,
        formData,
        setUploadProgress,
        controller.signal
      );
      setUploadStage('finishing');

      toast.success('Andamio desarmado correctamente');
      
      // Actualizar estado local
      setScaffolds(scaffolds.map(s => 
        s.id === scaffoldToDisassemble 
          ? { ...s, assembly_status: 'disassembled', card_status: 'red', progress_percentage: 0 } 
          : s
      ));
      
      setScaffoldToDisassemble(null);
      setDisassembleImage(null);
      setDisassembleNotes('');
      setImageMeta(null);
    } catch (err: unknown) {
      const cancelError = err as { code?: string; name?: string };
      if (cancelError?.code === 'ERR_CANCELED' || cancelError?.name === 'CanceledError') {
        toast('Subida cancelada', { icon: 'ℹ️' });
        return;
      }
      const apiError = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiError?.response?.data?.message || 'Error al desarmar el andamio';
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsDisassembling(false);
      setUploadStage('idle');
      setUploadProgress(0);
      uploadControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (!uploadControllerRef.current) return;
    uploadControllerRef.current.abort();
    uploadControllerRef.current = null;
    setUploadStage('idle');
    setUploadProgress(0);
    setIsDisassembling(false);
  };

  const handleDeleteScaffold = async (scaffoldId: number) => {
    try {
      await del(`/scaffolds/${scaffoldId}`);
      
      toast.success('Reporte eliminado correctamente');
      
      // Actualizar la lista local eliminando el andamio
      setScaffolds(scaffolds.filter(s => s.id !== scaffoldId));
      
      // Cerrar el modal
      setSelectedScaffold(null);
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
      const params: Record<string, string> = {};
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await apiService.get(
        `/projects/${selectedProjectId}/report/pdf`,
        { responseType: 'blob', params },
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
      const response = await apiService.get(
        `/projects/${selectedProjectId}/report/excel`,
        { responseType: 'blob' },
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
  const isDisassembleLocked = isDisassembling || uploadStage !== 'idle' || isProcessingImage;
  const activeFiltersCount =
    (filters.status && filters.status !== 'all' ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0);

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

  // alertItems deshabilitado

  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 shadow-md text-white">
        <h1 className="text-2xl md:text-3xl font-bold">Visualizador de Andamios</h1>
        <p className="text-blue-100 text-xs md:text-sm">
          Gestiona y visualiza los andamios del proyecto
        </p>
      </div>

      {/* Selector de proyecto + filtros compactos */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-dark-blue mb-2">Proyecto</h2>
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                showFilters ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              Filtros
              {activeFiltersCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] px-2 py-0.5">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-4 border-t pt-4">
            <ScaffoldFilters filters={filters} onFilterChange={setFilters} />
          </div>
        )}
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

      {/* Alertas inteligentes (deshabilitadas temporalmente) */}
      {/*
      {selectedProjectId && baseFilteredScaffolds.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-dark-blue">Alertas inteligentes</h2>
              <p className="text-xs text-gray-500">
                Basadas en los andamios del proyecto y filtros actuales
              </p>
            </div>
            {alertFilter && (
              <button
                type="button"
                onClick={() => setAlertFilter(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Limpiar filtro
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {alertItems.map((item) => {
              const isActive = alertFilter === item.id;
              const isDisabled = item.count === 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setAlertFilter(isActive ? null : item.id)}
                  className={`rounded-lg border p-3 text-left transition-all ${item.className} ${
                    isActive ? `ring-2 ring-offset-2 ${item.ringClass}` : ''
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold">{item.count}</p>
                  <p className="text-[11px] mt-1 opacity-80">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
      */}

      {/* Acciones principales compactas */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-dark-blue">
              {selectedProjectId 
                ? `${filteredScaffolds.length} Andamio${filteredScaffolds.length !== 1 ? 's' : ''} Encontrado${filteredScaffolds.length !== 1 ? 's' : ''}`
                : 'Selecciona un proyecto para comenzar'}
            </h2>
            <p className="text-xs text-gray-500">
              Accesos rápidos a creación, galería y exportación
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCreateScaffold}
              disabled={!selectedProjectId || !selectedProject?.active || !selectedProject?.client_active}
              title="Crear andamio"
              className="h-10 w-10 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="sr-only">Crear Andamio</span>
            </button>

            <button
              onClick={() => selectedProjectId && navigate(`/admin/project/${selectedProjectId}/gallery`)}
              disabled={!selectedProjectId}
              title="Ver galería"
              className="h-10 w-10 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11a3 3 0 100 6 3 3 0 000-6z" />
              </svg>
              <span className="sr-only">Ver Galería</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!selectedProjectId || exporting}
              title={exporting ? 'Generando PDF...' : 'Exportar PDF'}
              className="h-10 w-10 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="sr-only">{exporting ? 'Generando PDF...' : 'Exportar PDF'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!selectedProjectId || exportingExcel}
              title={exportingExcel ? 'Generando Excel...' : 'Exportar Excel'}
              className="h-10 w-10 rounded-full bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="sr-only">{exportingExcel ? 'Generando Excel...' : 'Exportar Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Acciones masivas */}
      {selectedProjectId && baseFilteredScaffolds.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-dark-blue">Acciones masivas</h2>
                <p className="text-xs text-gray-500">
                  Cambia tarjetas en lote cuando los andamios estén al 100% armado
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkMode((prev) => !prev)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {bulkMode ? 'Salir de selección' : 'Seleccionar varios'}
              </button>
            </div>

            {bulkMode && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                    Seleccionados: {selectedScaffoldIds.size}
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:bg-gray-50"
                  >
                    Seleccionar visibles
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:bg-gray-50"
                  >
                    Limpiar selección
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkCardStatus('green')}
                    disabled={bulkUpdating || selectedScaffoldIds.size === 0}
                    className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Poner tarjeta verde
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkCardStatus('red')}
                    disabled={bulkUpdating || selectedScaffoldIds.size === 0}
                    className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Poner tarjeta roja
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
          <div className="bg-white rounded-lg shadow-md p-3 md:p-4">
            <ScaffoldGrid 
              scaffolds={filteredScaffolds} 
              onScaffoldSelect={setSelectedScaffold}
              onToggleCard={handleToggleCard}
              onDisassemble={handleDisassemble}
              projectAssignedSupervisorId={selectedProject?.assigned_supervisor_id}
              selectable={bulkMode}
              selectedIds={selectedScaffoldIds}
              onToggleSelect={handleToggleSelect}
            />
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

      {/* Estadísticas del proyecto (movidas al final) */}
      {selectedProjectId && filteredScaffolds.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-sm font-semibold text-dark-blue mb-3">Estadísticas del Proyecto</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-gray-50 rounded-lg p-2.5 md:p-3 border-l-4 border-gray-500">
              <p className="text-xs text-gray-600 mb-1">Total</p>
              <p className="text-xl md:text-2xl font-bold text-gray-700">{stats.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2.5 md:p-3 border-l-4 border-green-500">
              <p className="text-xs text-green-700 mb-1">Armados</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">{stats.assembled}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2.5 md:p-3 border-l-4 border-yellow-500">
              <p className="text-xs text-yellow-700 mb-1">En Proceso</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2.5 md:p-3 border-l-4 border-red-500">
              <p className="text-xs text-red-700 mb-1">Desarmados</p>
              <p className="text-xl md:text-2xl font-bold text-red-600">{stats.disassembled}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5 md:p-3 border-l-4 border-blue-500">
              <p className="text-xs text-blue-700 mb-1">Total m³</p>
              <p className="text-lg md:text-xl font-bold text-blue-600">{stats.totalM3.toFixed(1)}</p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-2.5 md:p-3 border-l-4 border-cyan-500">
              <p className="text-xs text-cyan-700 mb-1">m³ Armados</p>
              <p className="text-lg md:text-xl font-bold text-cyan-600">{stats.assembledM3.toFixed(1)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 md:p-3 border-l-4 border-emerald-500">
              <p className="text-xs text-emerald-700 mb-1">🟢 Verdes</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-600">{stats.greenCards}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-2.5 md:p-3 border-l-4 border-rose-500">
              <p className="text-xs text-rose-700 mb-1">🔴 Rojas</p>
              <p className="text-xl md:text-2xl font-bold text-rose-600">{stats.redCards}</p>
            </div>
          </div>
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

      {/* Modal de desarmado */}
      <Modal 
        isOpen={!!scaffoldToDisassemble} 
        onClose={() => {
          uploadControllerRef.current?.abort();
          uploadControllerRef.current = null;
          setScaffoldToDisassemble(null);
          setDisassembleImage(null);
          setDisassembleNotes('');
          setImageMeta(null);
          setIsProcessingImage(false);
          setUploadStage('idle');
          setUploadProgress(0);
        }}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-dark-blue mb-4">Desarmar Andamio</h2>
          <p className="text-gray-600 mb-6">
            Por favor, proporciona una imagen del andamio desarmado y notas opcionales.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen del desarmado <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept={ALLOWED_IMAGE_ACCEPT}
                onChange={handleDisassembleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isDisassembleLocked}
              />
              {disassembleImage && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ Imagen seleccionada: {disassembleImage.name}
                </p>
              )}
              {imageMeta && (
                <p className="mt-2 text-xs text-gray-500">
                  {imageMeta.wasCompressed
                    ? `Optimizada: ${formatBytes(imageMeta.originalBytes)} → ${formatBytes(imageMeta.processedBytes)}`
                    : `Tamaño: ${formatBytes(imageMeta.originalBytes)}`}
                </p>
              )}
              {isProcessingImage && (
                <p className="mt-1 text-xs text-gray-500">Procesando imagen...</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas del desarmado (opcional)
              </label>
              <textarea
                value={disassembleNotes}
                onChange={(e) => setDisassembleNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingresa observaciones sobre el desarmado..."
                disabled={isDisassembleLocked}
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                uploadControllerRef.current?.abort();
                uploadControllerRef.current = null;
                setScaffoldToDisassemble(null);
                setDisassembleImage(null);
                setDisassembleNotes('');
                setImageMeta(null);
                setIsProcessingImage(false);
                setUploadStage('idle');
                setUploadProgress(0);
              }}
              disabled={isDisassembleLocked}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDisassemble}
              disabled={!disassembleImage || isDisassembleLocked}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDisassembleLocked ? 'Desarmando...' : 'Confirmar Desarmado'}
            </button>
          </div>
          <UploadProgress
            stage={uploadStage}
            progress={uploadProgress}
            className="mt-4 space-y-2"
          />
          {uploadStage !== 'idle' && (
            <button
              type="button"
              onClick={handleCancelUpload}
              className="text-xs text-gray-500 hover:text-gray-700 mt-2"
            >
              Cancelar subida
            </button>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!selectedScaffold} onClose={handleCloseModal}>
        {selectedScaffold && (
          <ScaffoldDetailsModal
            scaffold={selectedScaffold}
            onDelete={handleDeleteScaffold}
            canEdit={true}
            projectId={selectedProjectId ? Number(selectedProjectId) : undefined}
            onUpdate={() => {
              if (selectedProjectId) {
                fetchScaffolds(selectedProjectId);
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default ScaffoldsPage;
