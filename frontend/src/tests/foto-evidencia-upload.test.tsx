import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
global.URL.revokeObjectURL = vi.fn();

import FotoEvidenciaUpload from '../components/forms/FotoEvidenciaUpload';

describe('FotoEvidenciaUpload', () => {
  it('renders banner with "Subir foto" text and required asterisk', () => {
    render(<FotoEvidenciaUpload value={null} onChange={vi.fn()} />);
    expect(screen.getByText('Subir foto')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows "Obligatoria" subtitle', () => {
    render(<FotoEvidenciaUpload value={null} onChange={vi.fn()} />);
    expect(screen.getByText(/Obligatoria/)).toBeInTheDocument();
  });

  it('shows error alert when error prop is provided', () => {
    render(
      <FotoEvidenciaUpload
        value={null}
        onChange={vi.fn()}
        error="La foto de evidencia es obligatoria."
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('La foto de evidencia es obligatoria.');
  });

  it('shows preview and clear button when a file is provided', () => {
    const mockFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    render(<FotoEvidenciaUpload value={mockFile} onChange={vi.fn()} />);
    expect(screen.getByAltText('Vista previa de evidencia')).toBeInTheDocument();
    expect(screen.getByLabelText('Eliminar imagen seleccionada')).toBeInTheDocument();
  });

  it('calls onChange(null) when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const mockFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    render(<FotoEvidenciaUpload value={mockFile} onChange={onChange} />);
    await user.click(screen.getByLabelText('Eliminar imagen seleccionada'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
