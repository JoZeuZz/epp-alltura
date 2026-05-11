import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

import { useExcelExport } from '../hooks/useExcelExport';
import * as XLSX from 'xlsx';

describe('useExcelExport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls XLSX.utils.json_to_sheet with provided data', () => {
    const { result } = renderHook(() => useExcelExport());
    const rows = [{ codigo: 'A1', estado: 'ok' }];
    act(() => { result.current.exportToExcel(rows, 'test.xlsx'); });
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(rows);
  });

  it('calls XLSX.writeFile with the given filename', () => {
    const { result } = renderHook(() => useExcelExport());
    act(() => { result.current.exportToExcel([], 'my-export.xlsx'); });
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'my-export.xlsx');
  });
});
