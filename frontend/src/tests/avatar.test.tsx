import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Avatar from '../components/Avatar';

describe('Avatar', () => {
  it('muestra la imagen cuando hay fotoUrl', () => {
    render(<Avatar fotoUrl="uploads/x.webp" nombre="Ana Rojas" />);
    const img = screen.getByRole('img', { name: 'Ana Rojas' });
    expect(img).toBeInTheDocument();
  });

  it('muestra iniciales cuando no hay fotoUrl', () => {
    render(<Avatar nombre="Ana Rojas" />);
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('usa color de fondo determinístico por nombre', () => {
    const { container: c1 } = render(<Avatar nombre="Ana Rojas" />);
    const { container: c2 } = render(<Avatar nombre="Ana Rojas" />);
    const bg1 = (c1.firstChild as HTMLElement).style.backgroundColor;
    const bg2 = (c2.firstChild as HTMLElement).style.backgroundColor;
    expect(bg1).not.toBe('');
    expect(bg1).toBe(bg2);
  });
});
