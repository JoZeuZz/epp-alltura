import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ToolCard from '../components/tools/ToolCard';

describe('ToolCard', () => {
  const tool = {
    id: 'activo-1',
    codigo: 'ACT-001',
    articulo_nombre: 'Taladro Percutor',
    estado: 'asignado',
    ubicacion_nombre: 'Bodega Central',
    custodio_nombres: 'Ana',
    custodio_apellidos: 'Rojas',
    valor: 125000,
  };

  it('renderiza código y nombre visibles', () => {
    render(<ToolCard tool={tool} onSelect={vi.fn()} />);

    expect(screen.getByText('ACT-001')).toBeInTheDocument();
    expect(screen.getByText('Taladro Percutor')).toBeInTheDocument();
  });

  it('llama onSelect al hacer click en la card', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ToolCard tool={tool} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Ver detalles de ACT-001/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(tool);
  });

  it('muestra estado, ubicación y responsable', () => {
    render(<ToolCard tool={tool} onSelect={vi.fn()} />);

    expect(screen.getByText('Asignado')).toBeInTheDocument();
    expect(screen.getByText(/Ubicación:/i)).toBeInTheDocument();
    expect(screen.getByText(/Bodega Central/i)).toBeInTheDocument();
    expect(screen.getByText(/Responsable:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ana Rojas/i).length).toBeGreaterThan(0);
  });
});
