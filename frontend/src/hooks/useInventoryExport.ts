import { useState } from 'react';
import { apiService } from '../services/apiService';

export interface UseInventoryExportOptions {
  tipo: string;
  estado: string;
  search: string;
  ciudadFilter: string | null | undefined;
}

export function useInventoryExport(opts: UseInventoryExportOptions) {
  const [exporting, setExporting] = useState(false);

  async function triggerExport(formato: 'excel' | 'pdf'): Promise<void> {
    if (exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('tipo', opts.tipo);
      params.set('formato', formato);
      if (opts.estado !== 'all') params.set('estado', opts.estado);
      if (opts.search) params.set('search', opts.search);
      if (opts.ciudadFilter !== undefined) {
        params.set('ciudad', opts.ciudadFilter === null ? '__none__' : opts.ciudadFilter);
      }

      const ext = formato === 'excel' ? 'xlsx' : 'pdf';
      const date = new Date().toISOString().slice(0, 10);
      const filename = `inventario-${opts.tipo}-${date}.${ext}`;

      const response = await apiService.get(`/articulos/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const contentType = formato === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      const blob = new Blob([response.data as BlobPart], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return {
    exporting,
    exportExcel: () => triggerExport('excel'),
    exportPdf:   () => triggerExport('pdf'),
  };
}
