import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('../services/apiService', () => ({
  apiService: { get: mockGet },
}));

const mockClick = vi.fn();
vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);
Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
});

const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') {
    return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
  }
  return originalCreateElement(tag);
});

import { useInventoryExport } from '../hooks/useInventoryExport';

describe('useInventoryExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: new ArrayBuffer(8) });
  });

  it('calls apiService.get with tipo and formato=excel', async () => {
    const { result } = renderHook(() =>
      useInventoryExport({ tipo: 'epp', estado: 'all', search: '', ciudadFilter: undefined })
    );
    await act(() => result.current.exportExcel());
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('tipo=epp'),
      expect.objectContaining({ responseType: 'blob' })
    );
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('formato=excel'),
      expect.anything()
    );
  });

  it('calls apiService.get with formato=pdf', async () => {
    const { result } = renderHook(() =>
      useInventoryExport({ tipo: 'equipo', estado: 'all', search: '', ciudadFilter: undefined })
    );
    await act(() => result.current.exportPdf());
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('formato=pdf'),
      expect.objectContaining({ responseType: 'blob' })
    );
  });

  it('omits estado param when "all"', async () => {
    const { result } = renderHook(() =>
      useInventoryExport({ tipo: 'epp', estado: 'all', search: '', ciudadFilter: undefined })
    );
    await act(() => result.current.exportExcel());
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).not.toContain('estado=');
  });

  it('includes estado param when not "all"', async () => {
    const { result } = renderHook(() =>
      useInventoryExport({ tipo: 'epp', estado: 'en_stock', search: '', ciudadFilter: undefined })
    );
    await act(() => result.current.exportExcel());
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('estado=en_stock');
  });

  it('includes search param when non-empty', async () => {
    const { result } = renderHook(() =>
      useInventoryExport({ tipo: 'epp', estado: 'all', search: 'casco', ciudadFilter: undefined })
    );
    await act(() => result.current.exportExcel());
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('search=casco');
  });

  it('encodes ciudad=__none__ when ciudadFilter is null', async () => {
    const { result } = renderHook(() =>
      useInventoryExport({ tipo: 'epp', estado: 'all', search: '', ciudadFilter: null })
    );
    await act(() => result.current.exportExcel());
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('ciudad=__none__');
  });

  it('encodes ciudad param when ciudadFilter is a string', async () => {
    const { result } = renderHook(() =>
      useInventoryExport({ tipo: 'epp', estado: 'all', search: '', ciudadFilter: 'Santiago' })
    );
    await act(() => result.current.exportExcel());
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('ciudad=Santiago');
  });

  it('triggers anchor click to download the file', async () => {
    const { result } = renderHook(() =>
      useInventoryExport({ tipo: 'epp', estado: 'all', search: '', ciudadFilter: undefined })
    );
    await act(() => result.current.exportExcel());
    expect(mockClick).toHaveBeenCalled();
  });
});
