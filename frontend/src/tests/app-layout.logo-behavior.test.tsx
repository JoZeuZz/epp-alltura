import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import AppLayout from '../layouts/AppLayout';

// AppLayout comes from @alltura/shell (symlinked package processed from source).
// Its internal imports resolve to the real path, so we mock those directly.
vi.mock('../../../../alltura-shell/src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../../../../alltura-shell/src/hooks/useTour', () => ({
  useTour: vi.fn(),
}));
vi.mock('../../../../alltura-shell/src/hooks/useBreakpoints', () => ({
  useBreakpoints: vi.fn(),
}));
vi.mock('../../../../alltura-shell/src/components/TourOverlay', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

import { useAuth } from '../../../../alltura-shell/src/hooks/useAuth';
import { useTour } from '../../../../alltura-shell/src/hooks/useTour';
import { useBreakpoints } from '../../../../alltura-shell/src/hooks/useBreakpoints';

const useAuthMock = vi.mocked(useAuth);
const useTourMock = vi.mocked(useTour);
const useBreakpointsMock = vi.mocked(useBreakpoints);

const renderLayout = ({ isMobile = false, collapsed = false } = {}) => {
  window.innerWidth = isMobile ? 390 : 1280;
  localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));

  useBreakpointsMock.mockReturnValue({
    isXs: false,
    isSm: false,
    isMd: false,
    isLg: !isMobile,
    isXl: false,
    is2xl: false,
    isMobile,
    isTablet: false,
    isDesktop: !isMobile,
    isSmallScreen: isMobile,
    isMediumScreen: false,
    isLargeScreen: !isMobile,
  });

  return render(
    <MemoryRouter initialEntries={['/admin/inventario/equipos']}>
      <Routes>
        <Route path="*" element={<AppLayout navItems={[]} logoSrc="/logo-test.png" />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('AppLayout logo behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    useAuthMock.mockReturnValue({
      user: {
        role: 'admin',
        first_name: 'Ana',
        last_name: 'Rojas',
        profile_picture_url: null,
      },
      logout: vi.fn(),
    } as never);

    useTourMock.mockReturnValue({
      startOnboarding: vi.fn(),
      startContextual: vi.fn(),
      isActive: false,
      steps: [],
      stepIndex: 0,
    } as never);
  });

  it('keeps the sidebar logo constrained and hides its wrapper when collapsed on desktop', async () => {
    const user = userEvent.setup();
    const { container } = renderLayout({ isMobile: false, collapsed: false });

    const sidebarLogo = container.querySelector('nav img[alt="Alltura"]') as HTMLImageElement | null;
    const headerLogo = container.querySelector('header img[alt="Alltura"]') as HTMLImageElement | null;
    expect(sidebarLogo).toBeTruthy();
    expect(headerLogo).toBeTruthy();
    expect(sidebarLogo?.className).toContain('object-contain');
    expect(sidebarLogo?.className).toContain('max-w-[180px]');
    expect(sidebarLogo?.className).not.toContain('flex-1');

    const sidebarLogoWrapper = sidebarLogo?.parentElement as HTMLDivElement | null;
    expect(sidebarLogoWrapper).toBeTruthy();
    expect(sidebarLogoWrapper?.getAttribute('aria-hidden')).toBe('false');
    expect(headerLogo?.getAttribute('aria-hidden')).toBe('true');
    expect(headerLogo?.className).toContain('opacity-0');
    expect(headerLogo?.className).toContain('max-w-0');

    await user.click(screen.getByRole('button', { name: 'Contraer menú' }));

    expect(sidebarLogoWrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(sidebarLogoWrapper?.className).toContain('lg:max-w-0');
    expect(sidebarLogoWrapper?.className).toContain('lg:opacity-0');
    expect(headerLogo?.getAttribute('aria-hidden')).toBe('false');
    expect(headerLogo?.className).toContain('opacity-100');
    expect(headerLogo?.className).toContain('max-w-[180px]');
    expect(screen.getByRole('button', { name: 'Expandir menú' })).toBeInTheDocument();
  });

  it('hides the mobile header logo when the sidebar is open', async () => {
    const user = userEvent.setup();
    const { container } = renderLayout({ isMobile: true, collapsed: false });

    const headerLogo = container.querySelector('header img[alt="Alltura"]') as HTMLImageElement | null;
    expect(headerLogo).toBeTruthy();
    expect(headerLogo?.getAttribute('aria-hidden')).toBe('false');
    expect(headerLogo?.className).toContain('opacity-100');

    await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }));

    expect(headerLogo?.getAttribute('aria-hidden')).toBe('true');
    expect(headerLogo?.className).toContain('opacity-0');
    expect(headerLogo?.className).toContain('pointer-events-none');
  });
});
