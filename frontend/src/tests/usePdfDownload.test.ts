import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// apiService is an AxiosInstance — .get() returns Promise<AxiosResponse<T>>
const mockGet = vi.hoisted(() => vi.fn());
vi.mock('../services/apiService', () => ({
  apiService: { get: mockGet },
}));

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
const mockWindowOpen = vi.fn(() => ({ closed: false }));
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;
global.window.open = mockWindowOpen as unknown as typeof window.open;

import { usePdfDownload } from '../hooks/usePdfDownload';

describe('usePdfDownload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with isLoading false', () => {
    const { result } = renderHook(() => usePdfDownload());
    expect(result.current.isLoading).toBe(false);
  });

  it('resolves isLoading to false after download', async () => {
    // AxiosInstance.get with responseType: arraybuffer resolves to AxiosResponse<ArrayBuffer>
    mockGet.mockResolvedValue({ data: new ArrayBuffer(4) });
    const { result } = renderHook(() => usePdfDownload());
    await act(async () => {
      await result.current.downloadPdf('/test/pdf', 'test.pdf');
    });
    expect(result.current.isLoading).toBe(false);
    expect(mockGet).toHaveBeenCalledWith('/test/pdf', { responseType: 'arraybuffer' });
  });

  it('creates blob with pdf type and opens new tab', async () => {
    mockGet.mockResolvedValue({ data: new ArrayBuffer(8) });
    const { result } = renderHook(() => usePdfDownload());
    await act(async () => {
      await result.current.downloadPdf('/inventario/activos/123/pdf', 'ficha.pdf');
    });
    expect(mockCreateObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'application/pdf' })
    );
    expect(mockWindowOpen).toHaveBeenCalledWith('blob:mock-url', '_blank', 'noopener,noreferrer');
  });
});
