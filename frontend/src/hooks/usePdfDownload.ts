import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '../services/apiService';

export function usePdfDownload() {
  const [isLoading, setIsLoading] = useState(false);

  async function downloadPdf(url: string, filename: string): Promise<void> {
    setIsLoading(true);
    try {
      const response = await apiService.get(url, { responseType: 'arraybuffer' });
      const blob = new Blob([response.data as ArrayBuffer], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 100);
        toast.success('PDF listo. Revisa tu carpeta de Descargas.');
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      toast.error('No se pudo descargar el PDF.');
    } finally {
      setIsLoading(false);
    }
  }

  return { downloadPdf, isLoading };
}
