import { useState } from 'react';
import { apiService } from '../services/apiService';
import type { AxiosResponse } from 'axios';

export function usePdfDownload() {
  const [isLoading, setIsLoading] = useState(false);

  async function downloadPdf(url: string, filename: string): Promise<void> {
    setIsLoading(true);
    try {
      // apiService is an AxiosInstance — .get returns AxiosResponse<Blob>
      const response: AxiosResponse<Blob> = await apiService.get(url, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsLoading(false);
    }
  }

  return { downloadPdf, isLoading };
}
