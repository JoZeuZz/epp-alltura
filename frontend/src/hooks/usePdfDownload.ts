import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '../services/apiService';

export function usePdfDownload() {
  const [isLoading, setIsLoading] = useState(false);

  async function downloadPdf(url: string, filename: string): Promise<void> {
    setIsLoading(true);
    try {
      const response = await apiService.get(url, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 250);
    } catch {
      toast.error('No se pudo descargar el PDF.');
    } finally {
      setIsLoading(false);
    }
  }

  return { downloadPdf, isLoading };
}
