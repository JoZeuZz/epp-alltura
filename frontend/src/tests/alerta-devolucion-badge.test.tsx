import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AlertaDevolucionBadge from '../components/AlertaDevolucionBadge';

describe('AlertaDevolucionBadge', () => {
  it('renderiza el badge cuando alerta es true', () => {
    render(<AlertaDevolucionBadge alerta={true} />);
    expect(screen.getByText(/Proyecto finalizado/)).toBeInTheDocument();
  });

  it('no renderiza nada cuando alerta es false', () => {
    const { container } = render(<AlertaDevolucionBadge alerta={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('no renderiza nada cuando alerta es undefined', () => {
    const { container } = render(<AlertaDevolucionBadge />);
    expect(container.firstChild).toBeNull();
  });
});
