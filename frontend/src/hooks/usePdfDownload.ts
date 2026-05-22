import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '../services/apiService';
import type { AxiosResponse } from 'axios';

export function usePdfDownload() {
  const [isLoading, setIsLoading] = useState(false);

  async function downloadPdf(url: string, filename: string): Promise<void> {
    setIsLoading(true);
    try {
      const response: AxiosResponse<Blob> = await apiService.get(url, { responseType: 'blob' });
      const contentType = (response.headers['content-type'] as string | undefined) ?? '';
      if (!contentType.includes('application/pdf')) {
        toast.error('Error al generar el PDF. Intenta de nuevo.');
        return;
      }
      const objectUrl = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('No se pudo descargar el PDF.');
    } finally {
      setIsLoading(false);
    }
  }

  return { downloadPdf, isLoading };
}
