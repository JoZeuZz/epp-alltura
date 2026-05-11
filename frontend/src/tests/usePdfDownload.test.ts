import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// apiService is an AxiosInstance — .get() returns Promise<AxiosResponse<T>>
const mockGet = vi.hoisted(() => vi.fn());
vi.mock('../shell/services/apiService', () => ({
  apiService: { get: mockGet },
}));

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

import { usePdfDownload } from '../hooks/usePdfDownload';

describe('usePdfDownload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with isLoading false', () => {
    const { result } = renderHook(() => usePdfDownload());
    expect(result.current.isLoading).toBe(false);
  });

  it('resolves isLoading to false after download', async () => {
    // AxiosInstance.get resolves to AxiosResponse — mock .data as Blob
    mockGet.mockResolvedValue({ data: new Blob(['%PDF'], { type: 'application/pdf' }) });
    const { result } = renderHook(() => usePdfDownload());
    await act(async () => {
      await result.current.downloadPdf('/test/pdf', 'test.pdf');
    });
    expect(result.current.isLoading).toBe(false);
    // verify called with url + config (AxiosInstance.get takes url, config? — no params arg)
    expect(mockGet).toHaveBeenCalledWith('/test/pdf', { responseType: 'blob' });
  });

  it('revokes object URL after triggering download', async () => {
    mockGet.mockResolvedValue({ data: new Blob(['%PDF']) });
    const { result } = renderHook(() => usePdfDownload());
    await act(async () => {
      await result.current.downloadPdf('/inventario/activos/123/pdf', 'ficha.pdf');
    });
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
