import { useState, Fragment, useRef, useEffect, Suspense } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useTour } from '../hooks/useTour';
import TourOverlay from '../components/TourOverlay';
import type { TourRole } from '../utils/tourSteps';
import { getContextualStepsForRoute } from '../utils/tourSteps';
import { useBreakpoints } from '../hooks/useBreakpoints';
import { formatNameParts } from '../utils/name';

// --- Icons ---
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Tooltip rendered at fixed position to escape sidebar overflow constraints
interface SidebarTooltipState { text: string; y: number }

const toTourRole = (role?: string | null): TourRole | null => {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'admin' || normalized === 'supervisor') return normalized;
  return null;
};

const getRoleLabel = (role?: string | null) => {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'admin') return 'Administrador';
  if (normalized === 'supervisor') return 'Supervisor';
  return 'Usuario';
};

// Shared focus ring for elements on dark (dark-blue) backgrounds
const darkFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[#1E2A4A]';

export interface NavItem {
  to?: string;
  label: string;
  icon?: ReactNode;
  roles?: string[];
  children?: NavItem[];
}

interface AppLayoutProps {
  navItems: NavItem[];
  logoSrc: string;
  notificationBell?: ReactNode;
}

const AppLayout = ({ navItems, logoSrc, notificationBell }: AppLayoutProps) => {
  const { user, logout } = useAuth();
  const { startOnboarding, startContextual, isActive, steps, stepIndex } = useTour();
  const { isMobile } = useBreakpoints();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isDesktop = window.innerWidth >= 1024;
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null && isDesktop) return !JSON.parse(saved);
    return isDesktop;
  });

  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarTooltip, setSidebarTooltip] = useState<SidebarTooltipState | null>(null);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const hasAutoStartedTour = useRef(false);
  const autoOpenedSidebar = useRef(false);
  const guideTimeoutRef = useRef<number | null>(null);
  const currentTourRole = toTourRole(user?.role);

  // Auto-start tour on first visit
  useEffect(() => {
    if (currentTourRole && !hasAutoStartedTour.current) {
      hasAutoStartedTour.current = true;
      startOnboarding(currentTourRole);
    }
  }, [currentTourRole, startOnboarding]);

  // Cleanup guide timeout
  useEffect(() => {
    return () => {
      if (guideTimeoutRef.current) window.clearTimeout(guideTimeoutRef.current);
    };
  }, []);

  // Scroll lock when sidebar open on mobile
  useEffect(() => {
    if (!isMobile) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isSidebarOpen, isMobile]);

  const currentStep = steps[stepIndex];

  // Auto-open sidebar during tour on mobile
  useEffect(() => {
    if (!isMobile) { autoOpenedSidebar.current = false; return; }
    const isLauncherStep = Boolean(currentStep?.id?.includes('tour-launcher'));
    if (isActive && isLauncherStep) {
      if (!isSidebarOpen) { setSidebarOpen(true); autoOpenedSidebar.current = true; }
    } else if (autoOpenedSidebar.current) {
      setSidebarOpen(false);
      autoOpenedSidebar.current = false;
    }
  }, [currentStep?.id, isActive, isMobile, isSidebarOpen]);

  // Close profile menu on outside click or Escape
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileMenuOpen(false);
        profileBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isProfileMenuOpen]);

  // Persist sidebar state on desktop
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(!isSidebarOpen));
    }
  }, [isSidebarOpen]);

  if (!user) return null;

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
    setSidebarTooltip(null);
  };

  const isCollapsed = !isSidebarOpen;
  const showHeaderLogo = (isMobile && !isSidebarOpen) || (!isMobile && isCollapsed);

  // Nav link classes — active state uses inset shadow as left-edge accent indicator
  const linkCls = `relative flex items-center px-3 py-2.5 rounded-lg text-gray-300
    hover:bg-white/10 hover:text-white transition-colors duration-150 min-h-[44px] ${darkFocusRing}
    ${isCollapsed ? 'lg:justify-center lg:px-2.5' : ''}`;

  const activeLinkCls = `relative flex items-center px-3 py-2.5 rounded-lg text-white bg-primary min-h-[44px]
    shadow-[inset_3px_0_0_rgba(255,255,255,0.45)] ${darkFocusRing}
    ${isCollapsed ? 'lg:justify-center lg:px-2.5 lg:shadow-none' : ''}`;

  // Section label: full text when open, thin divider when collapsed
  const renderSectionLabel = (label: string) =>
    isSidebarOpen ? (
      <p className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-[0.1em] text-gray-400/70 uppercase select-none">
        {label}
      </p>
    ) : (
      <div className="hidden lg:block mx-2 my-2 h-px bg-white/10" aria-hidden="true" />
    );

  // Tooltip handlers for collapsed sidebar (fixed-position, escapes overflow)
  const showTooltip = (e: React.MouseEvent, text: string) => {
    if (!isCollapsed) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setSidebarTooltip({ text, y: rect.top + rect.height / 2 });
  };
  const hideTooltip = () => setSidebarTooltip(null);

  const renderNavItem = (item: NavItem, index: number): ReactNode => {
    if (!item.to && item.children) {
      const visible = item.children.filter(
        c => !c.roles || c.roles.includes(user?.role ?? '')
      );
      if (!visible.length) return null;
      return (
        <Fragment key={index}>
          {renderSectionLabel(item.label)}
          {visible.map((child, i) => renderNavItem(child, i))}
        </Fragment>
      );
    }
    if (!item.to) return null;
    if (item.roles && !item.roles.includes(user?.role ?? '')) return null;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={handleLinkClick}
        onMouseEnter={e => showTooltip(e, item.label)}
        onMouseLeave={hideTooltip}
        className={({ isActive }) => (isActive ? activeLinkCls : linkCls)}
      >
        {item.icon && (
          <span className={`flex-shrink-0 w-5 h-5 [&>svg]:w-5 [&>svg]:h-5 [&>svg]:flex-shrink-0 ${isSidebarOpen ? 'mr-3' : ''}`}>
            {item.icon}
          </span>
        )}
        <span className={isCollapsed ? 'sr-only' : ''}>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="flex h-screen bg-surface-muted font-sans">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
      >
        Ir al contenido principal
      </a>

      {/* Mobile overlay — always in DOM, transitions opacity to avoid layout shift */}
      <div
        className={`fixed inset-0 bg-black/55 z-20 lg:hidden transition-opacity duration-300 motion-reduce:transition-none ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Fixed tooltip for collapsed sidebar items — rendered outside overflow constraints */}
      {sidebarTooltip && (
        <div
          role="tooltip"
          aria-hidden="true"
          className="fixed left-[4.75rem] z-[9999] pointer-events-none"
          style={{ top: sidebarTooltip.y - 14 }}
        >
          <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap">
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900" />
            {sidebarTooltip.text}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <nav
        id="sidebar-nav"
        aria-label="Navegación principal"
        data-tour="app-shell-sidebar"
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-dark-blue text-white flex flex-col
          transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-16'}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar top: logo + desktop toggle */}
          <div
            className="relative flex items-center h-16 border-b border-white/10 px-3 pr-12 flex-shrink-0"
          >
            <div
              className={`overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-in-out flex-shrink-0 ${
                isSidebarOpen
                  ? 'max-w-[180px] opacity-100 translate-x-0 origin-left'
                  : 'max-w-[180px] opacity-100 translate-x-0 origin-left lg:max-w-0 lg:opacity-0 lg:translate-x-4 lg:delay-0'
              }`}
              style={{ transitionDuration: 'var(--shell-logo-handoff-duration)' }}
              aria-hidden={!isSidebarOpen}
            >
              <img
                src={logoSrc}
                alt="Alltura"
                className="h-9 w-auto max-w-[180px] flex-shrink-0 object-contain"
              />
            </div>
            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              data-tour="app-shell-sidebar-toggle-desktop"
              aria-label={isSidebarOpen ? 'Contraer menú' : 'Expandir menú'}
              aria-expanded={isSidebarOpen}
              aria-controls="sidebar-nav"
              className={`hidden lg:inline-flex absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors duration-150 flex-shrink-0 ${darkFocusRing}`}
            >
              {isSidebarOpen ? <ChevronLeftIcon aria-hidden="true" /> : <ChevronRightIcon aria-hidden="true" />}
            </button>
          </div>

          {/* Nav links */}
          <div className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-thin">
            {navItems.map((item, i) => renderNavItem(item, i))}
          </div>

          {/* Guide / Tour launcher */}
          <div className="px-2 pb-3 pt-1 border-t border-white/10">
            <button
              type="button"
              data-tour="tour-launcher"
              onMouseEnter={e => showTooltip(e, 'Guía')}
              onMouseLeave={hideTooltip}
              onClick={() => {
                if (guideTimeoutRef.current) window.clearTimeout(guideTimeoutRef.current);
                const contextualSteps = getContextualStepsForRoute(
                  currentTourRole || 'supervisor',
                  location.pathname
                );
                if (contextualSteps.length === 0) {
                  toast('Aún no hay una guía disponible para esta pantalla.');
                  return;
                }
                if (isMobile) {
                  setSidebarOpen(false);
                  guideTimeoutRef.current = window.setTimeout(() => {
                    if (currentTourRole) startContextual(currentTourRole, contextualSteps);
                  }, 150);
                } else {
                  if (currentTourRole) startContextual(currentTourRole, contextualSteps);
                }
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 mt-1 rounded-lg text-gray-300
                hover:bg-white/10 hover:text-white transition-colors duration-150 min-h-[44px] ${darkFocusRing}
                ${isCollapsed ? 'lg:justify-center lg:px-2.5' : ''}`}
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.2 5.3 8.2 4.5 6 4.5a4 4 0 00-2 .5v13a4 4 0 012-.5c2.2 0 4.2.8 6 1.753m0-13c1.8-.953 3.8-1.753 6-1.753a4 4 0 012 .5v13a4 4 0 00-2-.5c-2.2 0-4.2.8-6 1.753" />
              </svg>
              <span className={isCollapsed ? 'sr-only' : ''}>Guía</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main area: header + content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header
          data-tour="app-shell-header"
          className="bg-dark-blue text-white flex items-center gap-[var(--shell-header-gap)] sm:gap-[var(--shell-header-gap-sm)] px-[var(--shell-header-px)] sm:px-[var(--shell-header-px-sm)] md:px-[var(--shell-header-px-md)] h-16 z-30 shadow-md border-b border-white/10 flex-shrink-0 min-w-0"
        >
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            data-tour="app-shell-sidebar-toggle-mobile"
            aria-label={isSidebarOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar-nav"
            className={`lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors duration-150 flex-shrink-0 ${darkFocusRing}`}
          >
            <MenuIcon aria-hidden="true" />
          </button>

          {/* Logo */}
          <img
            src={logoSrc}
            alt="Alltura"
            data-tour="app-shell-logo"
            aria-hidden={!showHeaderLogo}
            className={`h-8 w-auto max-w-[180px] flex-shrink-0 object-contain transition-[opacity,transform,max-width] duration-300 ease-in-out motion-reduce:transition-none ${
              showHeaderLogo
                ? 'opacity-100 translate-x-0 max-w-[180px] origin-left lg:delay-100 motion-reduce:delay-0'
                : 'opacity-0 -translate-x-3 max-w-0 pointer-events-none origin-left lg:delay-0'
            }`}
            style={{
              transitionDuration: 'var(--shell-logo-handoff-duration)',
              transitionDelay: showHeaderLogo && !isMobile
                ? 'var(--shell-logo-handoff-enter-delay-desktop)'
                : '0ms',
            }}
          />

          <div className="flex-1" aria-hidden="true" />

          {/* Right-side actions: notifications + profile */}
          <div
            ref={profileMenuRef}
            className="relative ml-auto flex items-center gap-[var(--shell-header-actions-gap)] sm:gap-[var(--shell-header-actions-gap-sm)] flex-shrink-0"
            data-tour="app-shell-header-actions"
          >
            <div
              className={`p-[var(--shell-header-bell-p)] sm:p-[var(--shell-header-bell-p-sm)] rounded-lg hover:bg-white/10 transition-colors duration-150 ${darkFocusRing}`}
              data-tour="app-shell-notifications"
            >
              {notificationBell}
            </div>

            {/* Profile trigger */}
            <button
              ref={profileBtnRef}
              type="button"
              onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
              data-tour="app-shell-profile-menu"
              aria-label="Menú de perfil"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-controls="profile-dropdown"
              className={`flex items-center gap-[var(--shell-header-profile-gap)] sm:gap-[var(--shell-header-profile-gap-sm)] rounded-lg px-[var(--shell-header-profile-px)] sm:px-[var(--shell-header-profile-px-sm)] py-1.5 hover:bg-white/10 transition-colors duration-150 max-w-[11.5rem] sm:max-w-none ${darkFocusRing}`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center ring-2 ring-white/20">
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-gray-300"
                    aria-hidden="true"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <span className="hidden lg:block text-sm font-medium max-w-[9rem] xl:max-w-[10rem] truncate">
                {formatNameParts(user?.first_name, user?.last_name)}
              </span>
              <ChevronDownIcon
                aria-hidden="true"
                className={`hidden sm:block text-gray-400 transition-transform duration-200 motion-reduce:transition-none ${isProfileMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Profile dropdown — CSS-animated (no flash from conditional mount) */}
            <div
              id="profile-dropdown"
              role="menu"
              aria-label="Opciones de perfil"
              className={`absolute right-0 top-full mt-2 w-[min(var(--shell-profile-dropdown-width),calc(100vw-var(--shell-profile-dropdown-edge)))] bg-[#1a2235] rounded-xl shadow-2xl border border-white/10 py-2 z-[100]
                transition-all duration-200 origin-top-right motion-reduce:transition-none ${
                isProfileMenuOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
              }`}
            >
              {/* User identity header */}
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center ring-2 ring-white/20">
                    {user.profile_picture_url ? (
                      <img src={user.profile_picture_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5 text-gray-300"
                        aria-hidden="true"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate leading-tight">
                      {formatNameParts(user?.first_name, user?.last_name)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{getRoleLabel(user?.role)}</p>
                  </div>
                </div>
              </div>

              <button
                role="menuitem"
                onClick={() => { navigate('/profile'); setProfileMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors duration-150 focus-visible:outline-none focus-visible:bg-white/10"
              >
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mi Perfil
              </button>

              <div className="my-1 mx-2 h-px bg-white/10" />

              <button
                role="menuitem"
                onClick={() => { logout(); setProfileMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-danger/10 flex items-center gap-3 transition-colors duration-150 focus-visible:outline-none focus-visible:bg-danger/10"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main id="main-content" className="flex-1 w-full p-4 sm:p-6 lg:p-10 overflow-y-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64" aria-label="Cargando contenido">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          }>
            <Outlet key={location.pathname} />
          </Suspense>
        </main>
      </div>

      <TourOverlay />
    </div>
  );
};

export default AppLayout;
