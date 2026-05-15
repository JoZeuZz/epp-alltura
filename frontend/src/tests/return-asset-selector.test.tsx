import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReturnAssetSelector from '../components/forms/ReturnAssetSelector';
import * as apiService from '../services/apiService';

vi.mock('../services/apiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/apiService')>();
  return {
    ...actual,
    getReturnEligibleAssets: vi.fn(),
  };
});

const getReturnEligibleAssetsMock = vi.mocked(apiService.getReturnEligibleAssets);

const eligibleAssets = [
  {
    custodia_id: 'custodia-1',
    articulo_id: 'art-1',
    trabajador_id: 'worker-1',
    desde_en: '2026-01-01T00:00:00.000Z',
    nombre: 'Taladro',
    tipo: 'herramienta',
    codigo: 'TAL-001',
    nro_serie: 'SER-001',
    valor: 100000,
  },
  {
    custodia_id: 'custodia-2',
    articulo_id: 'art-2',
    trabajador_id: 'worker-1',
    desde_en: '2026-01-01T00:00:00.000Z',
    nombre: 'Taladro',
    tipo: 'herramienta',
    codigo: 'TAL-002',
    nro_serie: 'SER-002',
    valor: 100000,
  },
];

describe('ReturnAssetSelector', () => {
  beforeEach(() => {
    getReturnEligibleAssetsMock.mockReset();
    getReturnEligibleAssetsMock.mockResolvedValue(eligibleAssets as never);
  });

  it('al cambiar trabajadorId limpia selección', async () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <ReturnAssetSelector
        value={['custodia-1']}
        onChange={onChange}
        trabajadorId="worker-1"
        articuloId="art-1"
      />
    );

    rerender(
      <ReturnAssetSelector
        value={['custodia-1']}
        onChange={onChange}
        trabajadorId="worker-2"
        articuloId="art-1"
      />
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  it('no permite seleccionar un activo excluido', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ReturnAssetSelector
        value={[]}
        onChange={onChange}
        trabajadorId="worker-1"
        articuloId="art-1"
        excludedIds={['custodia-2']}
      />
    );

    expect(await screen.findByText('TAL-001')).toBeInTheDocument();
    expect(screen.queryByText('TAL-002')).not.toBeInTheDocument();

    await user.click(screen.getByText('TAL-001'));

    expect(onChange).toHaveBeenCalledWith(['custodia-1']);
    expect(onChange).not.toHaveBeenCalledWith(['custodia-2']);
  });

  it('conserva selección si el activo sigue visible', async () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <ReturnAssetSelector
        value={['custodia-1']}
        onChange={onChange}
        trabajadorId="worker-1"
        articuloId="art-1"
        excludedIds={[]}
      />
    );

    expect(await screen.findByText('TAL-001')).toBeInTheDocument();

    rerender(
      <ReturnAssetSelector
        value={['custodia-1']}
        onChange={onChange}
        trabajadorId="worker-1"
        articuloId="art-1"
        excludedIds={['custodia-2']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('TAL-001')).toBeInTheDocument();
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
