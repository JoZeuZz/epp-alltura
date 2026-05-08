/**
 * Tests for the afterSignatureBeforeConfirm extension point in EntregaFirmaModal.
 * This no-op hook enables future photo-evidence injection without changing the
 * confirmation flow.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntregaFirmaModal from '../components/forms/EntregaFirmaModal';
import * as apiService from '../services/apiService';

vi.mock('../services/apiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/apiService')>();
  return {
    ...actual,
    confirmEntrega: vi.fn(),
    firmarEntregaDispositivo: vi.fn(),
    generateEntregaSignatureToken: vi.fn(),
  };
});

vi.mock('../hooks/useDeliverySignatureEvents', () => ({
  useDeliverySignatureEvents: vi.fn(),
}));

const confirmEntregaMock = vi.mocked(apiService.confirmEntrega);

const mockEntrega = {
  id: 'entrega-1',
  estado: 'borrador' as const,
  trabajador_id: 'trab-1',
  trabajador_nombre: 'Juan Pérez',
  detalles: [],
  created_at: '2026-01-01T00:00:00.000Z',
};

function renderModal(props: Partial<Parameters<typeof EntregaFirmaModal>[0]> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    entrega: mockEntrega as never,
    onCompleted: vi.fn(),
  };
  return render(<EntregaFirmaModal {...defaults} {...props} />);
}

describe('EntregaFirmaModal - afterSignatureBeforeConfirm extension point', () => {
  beforeEach(() => {
    confirmEntregaMock.mockReset();
    confirmEntregaMock.mockResolvedValue({} as never);
  });

  it('calls afterSignatureBeforeConfirm before confirmEntrega when provided', async () => {
    const afterHook = vi.fn().mockResolvedValue(undefined);
    const onCompleted = vi.fn();

    // With alreadySigned=true the confirm button is active without drawing
    renderModal({ afterSignatureBeforeConfirm: afterHook, onCompleted, alreadySigned: true });

    const btn = screen.getByRole('button', { name: /confirmar/i });
    await userEvent.click(btn);

    await waitFor(() => {
      expect(afterHook).toHaveBeenCalledTimes(1);
      expect(confirmEntregaMock).toHaveBeenCalledTimes(1);
    });
  });

  it('afterSignatureBeforeConfirm defaults to no-op (undefined) and does not block confirmation', async () => {
    const onCompleted = vi.fn();
    renderModal({ onCompleted, alreadySigned: true });

    const btn = screen.getByRole('button', { name: /confirmar/i });
    expect(btn).not.toBeDisabled();

    await userEvent.click(btn);

    await waitFor(() => {
      expect(confirmEntregaMock).toHaveBeenCalledTimes(1);
    });
  });

  it('if afterSignatureBeforeConfirm is provided, it is awaited before confirm', async () => {
    const callOrder: string[] = [];
    const afterHook = vi.fn().mockImplementation(async () => {
      callOrder.push('afterHook');
    });
    confirmEntregaMock.mockImplementation(async () => {
      callOrder.push('confirm');
      return {} as never;
    });

    const onCompleted = vi.fn();
    renderModal({
      afterSignatureBeforeConfirm: afterHook,
      onCompleted,
      alreadySigned: true,
    });

    const btn = screen.getByRole('button', { name: /confirmar/i });
    await userEvent.click(btn);

    await waitFor(() => {
      expect(callOrder).toEqual(['afterHook', 'confirm']);
    });
  });

  it('afterSignatureBeforeConfirm errors do not silently swallow, they propagate as UI error', async () => {
    const afterHook = vi.fn().mockRejectedValue(new Error('foto falló'));
    const onCompleted = vi.fn();

    renderModal({
      afterSignatureBeforeConfirm: afterHook,
      onCompleted,
      alreadySigned: true,
    });

    const btn = screen.getByRole('button', { name: /confirmar/i });
    await userEvent.click(btn);

    await waitFor(() => {
      expect(confirmEntregaMock).not.toHaveBeenCalled();
      expect(onCompleted).not.toHaveBeenCalled();
    });
  });
});
