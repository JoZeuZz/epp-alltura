import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const processImageFile = vi.fn();
vi.mock('../utils/imageProcessing', () => ({
  processImageFile: (...args: unknown[]) => processImageFile(...args),
}));

import TrabajadorFotoInput from '../components/forms/TrabajadorFotoInput';

describe('TrabajadorFotoInput', () => {
  beforeEach(() => {
    processImageFile.mockReset();
    // jsdom no implementa createObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('muestra el estado vacío con texto de subida', () => {
    render(<TrabajadorFotoInput value={null} onChange={() => {}} />);
    expect(screen.getByText(/subir foto del trabajador/i)).toBeInTheDocument();
  });

  it('comprime con processImageFile y entrega el archivo procesado', async () => {
    const onChange = vi.fn();
    const processed = new File(['x'], 'small.webp', { type: 'image/webp' });
    processImageFile.mockResolvedValue({ file: processed });

    render(<TrabajadorFotoInput value={null} onChange={onChange} />);

    const input = screen.getByTestId('trabajador-foto-input') as HTMLInputElement;
    const original = new File(['xxxxx'], 'big.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [original] } });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(processed));
    expect(processImageFile).toHaveBeenCalledWith(original, { maxSizeMB: 0.4, maxWidthOrHeight: 512 });
  });
});
