import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { first_name: 'Ana', last_name: 'Rojas', rut: '', phone_number: '', profile_picture_url: '' },
    refreshUserData: vi.fn(),
  }),
}));
vi.mock('../hooks/useMutate', () => ({
  usePut: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../hooks/useFormErrors', () => ({
  useFormErrors: () => ({ error: null, handleError: vi.fn(), clearError: vi.fn() }),
}));

import ProfilePage from '../pages/ProfilePage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

describe('ProfilePage avatar', () => {
  it('el avatar es un label que dispara el input de foto', () => {
    renderPage();
    const label = screen.getByLabelText('Cambiar foto de perfil');
    expect(label.tagName).toBe('LABEL');
    expect(label.getAttribute('for')).toBe('profile-picture-upload');
  });

  it('no muestra texto de optimización', () => {
    renderPage();
    expect(screen.queryByText(/optimizada/i)).not.toBeInTheDocument();
  });
});
