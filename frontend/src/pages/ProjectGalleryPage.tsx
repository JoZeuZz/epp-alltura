import React, { useMemo, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import ImageWithFallback from '../components/ImageWithFallback';
import { Project, Scaffold } from '../types/api';
import { buildImageUrl } from '../utils/image';

type GalleryItemType = 'assembly' | 'disassembly';

interface GalleryItem {
  id: string;
  scaffold: Scaffold;
  type: GalleryItemType;
  url: string;
  label: string;
  dateLabel?: string;
}

interface LoaderData {
  project: Project;
  scaffolds: Scaffold[];
}

const statusOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'assembled', label: 'Armado' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'disassembled', label: 'Desarmado' },
];

const imageTypeOptions: Array<{ value: 'all' | GalleryItemType; label: string }> = [
  { value: 'all', label: 'Montaje + Desmontaje' },
  { value: 'assembly', label: 'Solo montaje' },
  { value: 'disassembly', label: 'Solo desmontaje' },
];

const formatDate = (date?: string) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString();
};

const buildDownloadName = (projectName: string, scaffold: Scaffold, type: GalleryItemType) => {
  const safeProject = projectName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const scaffoldLabel = scaffold.scaffold_number ? `andamio_${scaffold.scaffold_number}` : `andamio_${scaffold.id}`;
  const suffix = type === 'assembly' ? 'montaje' : 'desmontaje';
  return `${safeProject}_${scaffoldLabel}_${suffix}.jpg`;
};

const ProjectGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { project, scaffolds } = useLoaderData() as LoaderData;
  const [statusFilter, setStatusFilter] = useState('all');
  const [imageTypeFilter, setImageTypeFilter] = useState<'all' | GalleryItemType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredScaffolds = useMemo(() => {
    let filtered = scaffolds || [];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((scaffold) => scaffold.assembly_status === statusFilter);
    }

    if (normalizedSearch) {
      filtered = filtered.filter((scaffold) => {
        const haystack = [
          scaffold.scaffold_number,
          scaffold.area,
          scaffold.tag,
          scaffold.user_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }

    return filtered;
  }, [normalizedSearch, scaffolds, statusFilter]);

  const galleryItems = useMemo(() => {
    const items: GalleryItem[] = [];
    filteredScaffolds.forEach((scaffold) => {
      const assemblyUrl = scaffold.initial_image || scaffold.assembly_image_url;
      const disassemblyUrl = scaffold.disassembly_image || scaffold.disassembly_image_url;

      if (assemblyUrl && (imageTypeFilter === 'all' || imageTypeFilter === 'assembly')) {
        items.push({
          id: `${scaffold.id}-assembly`,
          scaffold,
          type: 'assembly',
          url: assemblyUrl,
          label: 'Montaje',
          dateLabel: formatDate(scaffold.assembly_created_at),
        });
      }

      if (disassemblyUrl && (imageTypeFilter === 'all' || imageTypeFilter === 'disassembly')) {
        items.push({
          id: `${scaffold.id}-disassembly`,
          scaffold,
          type: 'disassembly',
          url: disassemblyUrl,
          label: 'Desmontaje',
          dateLabel: formatDate(scaffold.disassembled_at || scaffold.assembly_created_at),
        });
      }
    });

    const getTimestamp = (item: GalleryItem) => {
      const dateValue =
        item.type === 'disassembly'
          ? item.scaffold.disassembled_at || item.scaffold.assembly_created_at
          : item.scaffold.assembly_created_at;
      if (!dateValue) return 0;
      const timestamp = new Date(dateValue).getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    return items.sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [filteredScaffolds, imageTypeFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark-blue">Galería de fotos</h1>
          <p className="text-sm text-gray-500">
            {project?.name || 'Proyecto'} · Cliente: {project?.client_name || 'Sin cliente'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-blue">Filtros</h2>
            <p className="text-xs text-gray-500">Explora las fotos del proyecto por estado o tipo</p>
          </div>
          <div className="text-sm text-gray-600">
            {galleryItems.length} imagen{galleryItems.length === 1 ? '' : 'es'} encontradas
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de foto</label>
            <select
              value={imageTypeFilter}
              onChange={(event) => setImageTypeFilter(event.target.value as 'all' | GalleryItemType)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue"
            >
              {imageTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="N° andamio, área, tag o usuario"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue"
            />
          </div>
        </div>
      </div>

      {galleryItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-10 text-center text-sm text-gray-500">
          No hay fotos para los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {galleryItems.map((item) => {
            const scaffoldNumber = item.scaffold.scaffold_number || `#${item.scaffold.id}`;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className="group bg-white rounded-lg shadow-md overflow-hidden text-left hover:shadow-lg transition-all"
              >
                <div className="relative">
                  <ImageWithFallback
                    src={buildImageUrl(item.url, 'thumb')}
                    alt={`${item.label} ${scaffoldNumber}`}
                    className="h-48 w-full object-cover"
                  />
                  <span className="absolute top-3 left-3 text-[11px] uppercase tracking-wide bg-black/70 text-white px-2 py-1 rounded-full">
                    {item.label}
                  </span>
                  <span className="absolute bottom-3 right-3 text-[11px] bg-white/90 text-gray-700 px-2 py-1 rounded-full">
                    {item.scaffold.assembly_status === 'assembled'
                      ? 'Armado'
                      : item.scaffold.assembly_status === 'in_progress'
                      ? 'En proceso'
                      : 'Desarmado'}
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-sm font-semibold text-dark-blue">
                    Andamio {scaffoldNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    Área: {item.scaffold.area || 'Sin área'} · TAG: {item.scaffold.tag || 'Sin tag'}
                  </p>
                  {item.dateLabel && (
                    <p className="text-xs text-gray-400">Fecha: {item.dateLabel}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)}>
        {selectedItem && (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{selectedItem.label}</p>
              <h2 className="text-xl font-bold text-dark-blue">
                Andamio {selectedItem.scaffold.scaffold_number || `#${selectedItem.scaffold.id}`}
              </h2>
              <p className="text-xs text-gray-500">
                Área: {selectedItem.scaffold.area || 'Sin área'} · TAG: {selectedItem.scaffold.tag || 'Sin tag'}
              </p>
            </div>
            <div className="relative group">
              <ImageWithFallback
                src={buildImageUrl(selectedItem.url, 'full')}
                alt={`${selectedItem.label} ${selectedItem.scaffold.scaffold_number || selectedItem.scaffold.id}`}
                className="w-full max-h-[70vh] object-contain rounded-lg bg-gray-50"
              />
              <a
                href={buildImageUrl(selectedItem.url, 'full')}
                download={buildDownloadName(project?.name || 'proyecto', selectedItem.scaffold, selectedItem.type)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-white/90 text-gray-700 p-2 rounded-full shadow-md hover:text-gray-900"
                title="Descargar imagen"
                aria-label="Descargar imagen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v10m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
              </a>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              {selectedItem.dateLabel && <span>Fecha: {selectedItem.dateLabel}</span>}
              <span>
                Estado:{' '}
                {selectedItem.scaffold.assembly_status === 'assembled'
                  ? 'Armado'
                  : selectedItem.scaffold.assembly_status === 'in_progress'
                  ? 'En proceso'
                  : 'Desarmado'}
              </span>
              <span>m³: {selectedItem.scaffold.cubic_meters}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectGalleryPage;
