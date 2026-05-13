import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ArticleFormModal from '../../../components/forms/ArticleFormModal';
import {
  createArticulo,
  getInventoryActivosAll,
  type ArticuloCreatePayload,
  type ArticuloGrupoPrincipal,
  type InventoryActivoTypeScope,
} from '../../../services/apiService';
import AdminInventoryScopedAssetCards from './AdminInventoryScopedAssetCards';
import { INVENTORY_ASSET_SCOPE_COPY } from './inventoryAssetScope.constants';
import { useExcelExport } from '../../../hooks/useExcelExport';
import { usePdfDownload } from '../../../hooks/usePdfDownload';

interface AdminInventoryScopedAssetPageProps {
  scope: InventoryActivoTypeScope;
}

const SCOPE_TO_GRUPO: Record<InventoryActivoTypeScope, ArticuloGrupoPrincipal> = {
  epp: 'epp',
  equipos: 'equipo',
  herramientas: 'herramienta',
};

const AdminInventoryScopedAssetPage: React.FC<AdminInventoryScopedAssetPageProps> = ({ scope }) => {
  const copy = INVENTORY_ASSET_SCOPE_COPY[scope];
  const { exportToExcel } = useExcelExport();
  const { downloadPdf, isLoading: isPdfLoading } = usePdfDownload();
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [showCreateArticle, setShowCreateArticle] = useState(false);
  const queryClient = useQueryClient();

  const createArticleMutation = useMutation({
    mutationFn: ({ payload, foto }: { payload: ArticuloCreatePayload; foto?: File }) =>
      createArticulo(payload, foto),
    onSuccess: () => {
      toast.success('Artículo creado correctamente.');
      setShowCreateArticle(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-inventory', 'articulos'] });
    },
    onError: () => {
      toast.error('No se pudo crear el artículo. Inténtalo de nuevo.');
    },
  });

  const handleExportPdf = async () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    await downloadPdf(
      `/inventario/export/pdf?categoria=${scope}`,
      `inventario-${scope}-${timestamp}.pdf`
    );
  };

  const handleExportExcel = async () => {
    setIsExcelLoading(true);
    try {
      const rows = await getInventoryActivosAll(scope);
      const timestamp = new Date().toISOString().slice(0, 10);
      const excelRows = rows.map((r) => ({
        Código: r.codigo ?? '',
        Artículo: r.articulo_nombre ?? '',
        Estado: r.estado ?? '',
        Ubicación: r.ubicacion_nombre ?? '',
        'Asignado a': r.custodio_nombres
          ? `${r.custodio_nombres} ${r.custodio_apellidos ?? ''}`
          : '',
        'Días custodia': r.dias_en_custodia ?? '',
        Vencimiento: r.fecha_vencimiento
          ? new Date(r.fecha_vencimiento).toLocaleDateString('es-CL')
          : '',
      }));
      exportToExcel(excelRows, `inventario-${scope}-${timestamp}.xlsx`, scope.toUpperCase());
    } finally {
      setIsExcelLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-tour={`admin-inventory-${scope}`}>
      <section className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">{copy.pageTitle}</h1>
        <p className="text-neutral-gray">{copy.pageSubtitle}</p>
      </section>
      <div className="flex gap-2 justify-end" data-tour="admin-inventory-export-toolbar">
        <button
          type="button"
          onClick={() => void handleExportPdf()}
          disabled={isPdfLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-edge text-sm text-content-secondary bg-surface hover:bg-surface-muted transition-colors disabled:opacity-50"
          aria-label="Exportar PDF"
        >
          {isPdfLoading ? '…' : '↓'} Exportar PDF
        </button>
        <button
          type="button"
          onClick={() => void handleExportExcel()}
          disabled={isExcelLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-edge text-sm text-content-secondary bg-surface hover:bg-surface-muted transition-colors disabled:opacity-50"
          aria-label="Exportar Excel"
        >
          {isExcelLoading ? '…' : '↓'} Exportar Excel
        </button>
        <button
          type="button"
          onClick={() => setShowCreateArticle(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary-blue text-sm text-white bg-primary-blue hover:bg-blue-700 transition-colors"
          aria-label="Nuevo artículo"
        >
          + Nuevo artículo
        </button>
      </div>
      <AdminInventoryScopedAssetCards scope={scope} />
      {showCreateArticle && (
        <ArticleFormModal
          isOpen={showCreateArticle}
          onClose={() => setShowCreateArticle(false)}
          onSubmit={async (payload, foto) => {
            await createArticleMutation.mutateAsync({ payload, foto });
          }}
          isSubmitting={createArticleMutation.isPending}
          mode="create"
          lockedGrupoPrincipal={SCOPE_TO_GRUPO[scope]}
        />
      )}
    </div>
  );
};

export default AdminInventoryScopedAssetPage;
