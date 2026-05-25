import { render, screen } from '@testing-library/react';
import { Modal } from '@jozeuzz/alltura-ui';
import { vi } from 'vitest';

describe('Modal mobileFullscreen', () => {
  it('applies fullscreen classes when mobileFullscreen={true}', () => {
    render(
      <Modal isOpen title="Formulario" onClose={vi.fn()} mobileFullscreen>
        <p>Contenido</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.classList.contains('h-[100dvh]')).toBe(true);
    expect(dialog.classList.contains('rounded-none')).toBe(true);
    expect(dialog.classList.contains('rounded-2xl')).toBe(false);
  });

  it('uses default modal classes when mobileFullscreen is omitted', () => {
    render(
      <Modal isOpen title="Confirmación" onClose={vi.fn()}>
        <p>Contenido</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.classList.contains('rounded-2xl')).toBe(true);
    expect(dialog.classList.contains('h-[100dvh]')).toBe(false);
    expect(dialog.classList.contains('rounded-none')).toBe(false);
  });
});
