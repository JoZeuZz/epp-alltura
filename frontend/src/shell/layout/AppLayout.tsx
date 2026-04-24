import { useState, Fragment, useRef, useEffect, Suspense } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTour } from '../../hooks/useTour';
import TourOverlay from '../components/TourOverlay';
import type { TourRole } from '../utils/tourSteps';
import { getContextualStepsForRoute } from '../utils/tourSteps';
import { useBreakpoints } from '../../hooks';
import logoWhite from '../../assets/logo-alltura-white.png';
import UserIcon from '../../components/icons/UserIcon';
import NotificationBell from '../components/NotificationBell';
import { formatNameParts } from '../utils/name';

// --- Iconos SVG ---
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

const toTourRole = (role?: string | null): TourRole | null => {
  const normalizedRole = String(role || '').toLowerCase();
  if (normalizedRole === 'admin' || normalizedRole === 'supervisor' || normalizedRole === 'bodega') {
    return normalizedRole;
  }
  if (normalizedRole === 'worker' || normalizedRole === 'trabajador' || normalizedRole === 'client') {
    return 'worker';
  }
  return null;
};

const getRoleLabel = (role?: string | null) => {
  const normalizedRole = String(role || '').toLowerCase();

  if (normalizedRole === 'admin') return 'Administrador';
  if (normalizedRole === 'supervisor') return 'Supervisor';
  if (normalizedRole === 'bodega') return 'Bodega';
  if (normalizedRole === 'worker' || normalizedRole === 'trabajador' || normalizedRole === 'client') {
    return 'Trabajador';
  }

  return 'Usuario';
};

const AppLayout = () => {
  const { user, logout } = useAuth();
  const { startOnboarding, startContextual, isActive, steps, stepIndex } = useTour();
  const { isMobile } = useBreakpoints();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado inicial: expandida en desktop, colapsada en móvil
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isDesktop = window.innerWidth >= 1024;
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null && isDesktop) {
      return !JSON.parse(saved); // invertir porque guardamos "collapsed"
    }
    return isDesktop; // true en desktop, false en móvil
  });
  
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const hasAutoStartedTour = useRef(false);
  const autoOpenedSidebar = useRef(false);
  const guideTimeoutRef = useRef<number | null>(null);
  const currentTourRole = toTourRole(user?.role);

  useEffect(() => {
    if (currentTourRole && !hasAutoStartedTour.current) {
      hasAutoStartedTour.current = true;
      startOnboarding(currentTourRole);
    }
  }, [currentTourRole, startOnboarding]);

  useEffect(() => {
    return () => {
      if (guideTimeoutRef.current) {
        window.clearTimeout(guideTimeoutRef.current);
        guideTimeoutRef.current = null;
      }
    };
  }, []);

  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (!isMobile) {
      autoOpenedSidebar.current = false;
      return;
    }

    const isLauncherStep = Boolean(currentStep?.id && currentStep.id.includes('tour-launcher'));

    if (isActive && isLauncherStep) {
      if (!isSidebarOpen) {
        setSidebarOpen(true);
        autoOpenedSidebar.current = true;
      }
    } else if (autoOpenedSidebar.current) {
      setSidebarOpen(false);
      autoOpenedSidebar.current = false;
    }
  }, [currentStep?.id, isActive, isMobile, isSidebarOpen]);

  // Cerrar el menú de perfil al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileMenuOpen]);

  // Guardar estado de sidebar en localStorage (solo desktop)
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(!isSidebarOpen));
    }
  }, [isSidebarOpen]);

  if (!user) {
    // O un spinner/loading component
    return null;
  }

  // Cierra la sidebar después de hacer clic en un enlace (móvil y escritorio).
  const handleLinkClick = () => {
    // Solo cerrar en móvil
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const linkClass = `flex items-center px-3 py-2 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors ${
    !isSidebarOpen ? 'lg:justify-center lg:px-2' : ''
  }`;
  const activeLinkClass = `flex items-center px-3 py-2 text-white bg-primary-blue rounded-lg ${
    !isSidebarOpen ? 'lg:justify-center lg:px-2' : ''
  }`;
  const isAdminInventoryRoute = location.pathname.startsWith('/admin/inventario');
  const isAdminEntregasRoute = location.pathname.startsWith('/admin/entregas');
  const isAdminDevolucionesRoute = location.pathname.startsWith('/admin/devoluciones');
  const navSectionClass = `px-3 pt-3 pb-1 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase ${
    !isSidebarOpen ? 'lg:hidden' : ''
  }`;

  const adminLinks = (
    <Fragment>
      <p className={navSectionClass}>Operaciones</p>
      <NavLink
        to="/admin/dashboard"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Dashboard Operativo</span>
      </NavLink>
      <NavLink
        to="/admin/entregas"
        onClick={handleLinkClick}
        className={({ isActive }) =>
          isActive || isAdminEntregasRoute ? activeLinkClass : linkClass
        }
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4h4" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Entregas</span>
      </NavLink>
      <NavLink
        to="/admin/devoluciones"
        onClick={handleLinkClick}
        className={({ isActive }) =>
          isActive || isAdminDevolucionesRoute ? activeLinkClass : linkClass
        }
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Devoluciones</span>
      </NavLink>
      <NavLink
        to="/admin/inventario/articulos"
        onClick={handleLinkClick}
        className={({ isActive }) =>
          isActive || isAdminInventoryRoute ? activeLinkClass : linkClass
        }
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V7a2 2 0 00-2-2h-3V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4m-8 0H4m4 0v1a1 1 0 001 1h6a1 1 0 001-1v-1" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Inventario</span>
      </NavLink>
      <p className={navSectionClass}>Configuración</p>
      <NavLink
        to="/admin/ubicaciones"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Ubicaciones</span>
      </NavLink>
      <NavLink
        to="/admin/trabajadores"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.655-.084-1.289-.241-1.892M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.655.084-1.289.241-1.892m0 0a5.002 5.002 0 019.518 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Trabajadores</span>
      </NavLink>
      <NavLink
        to="/admin/users"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.655-.084-1.289-.241-1.892M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.655.084-1.289.241-1.892m0 0a5.002 5.002 0 019.518 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM6 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Usuarios del Sistema</span>
      </NavLink>
    </Fragment>
  );

  const supervisorLinks = (
    <Fragment>
      <NavLink
        to="/supervisor/dashboard"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Dashboard Supervisor</span>
      </NavLink>
    </Fragment>
  );

  const bodegaLinks = (
    <Fragment>
      <NavLink
        to="/bodega/dashboard"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7L4 7m16 5H4m16 5H4" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Bodega Operativa</span>
      </NavLink>
      <NavLink
        to="/bodega/operaciones"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Operación Diaria</span>
      </NavLink>
      <NavLink
        to="/bodega/devoluciones"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Devoluciones</span>
      </NavLink>
    </Fragment>
  );

  const workerLinks = (
    <Fragment>
      <NavLink
        to="/worker/dashboard"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5zM4 22c0-4.418 3.582-8 8-8s8 3.582 8 8" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Mis Equipos</span>
      </NavLink>
      <NavLink
        to="/worker/firmas"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-1-3v6m9 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1v-9m18 0l-9-5-9 5" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Confirmar Recepción</span>
      </NavLink>
    </Fragment>
  );

  const clientLinks = (
    <Fragment>
      <NavLink
        to="/worker/dashboard"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Mis Equipos</span>
      </NavLink>
    </Fragment>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Skip to main content link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-blue focus:text-white focus:rounded-md"
      >
        Ir al contenido principal
      </a>

      {/* --- Overlay para móvil/tablet (solo visible cuando sidebar está abierto en pantallas < lg) --- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* --- Sidebar Responsive --- */}
      <nav
        aria-label="Navegación principal"
        data-tour="app-shell-sidebar"
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-dark-blue text-white flex flex-col 
          transform lg:transform-none transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-16'}`}
      >
        {/* Contenido de la Sidebar */}
        <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-64 lg:w-16'
        }`}>
          <div className="flex items-center justify-between h-20 border-b border-gray-700 px-4 flex-shrink-0 overflow-hidden">
            <img 
              src={logoWhite} 
              alt="Alltura Logo" 
              className={`h-12 w-auto transition-all duration-300 ${
                isSidebarOpen ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:absolute lg:-left-full'
              }`} 
            />
            {/* Botón de cerrar en móvil / Botón collapse en desktop */}
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)} 
              className={`text-white flex-shrink-0 ${!isSidebarOpen ? 'lg:mx-auto' : ''}`}
              data-tour="app-shell-sidebar-toggle-desktop"
              aria-label={isSidebarOpen ? "Contraer menú" : "Expandir menú"}
            >
              {isSidebarOpen ? <ChevronLeftIcon aria-hidden="true" /> : <ChevronRightIcon aria-hidden="true" />}
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
            <div className={!isSidebarOpen ? 'lg:space-y-2' : ''}>
              {user?.role === 'admin'
                ? adminLinks
                : user?.role === 'supervisor'
                  ? supervisorLinks
                  : user?.role === 'bodega'
                    ? bodegaLinks
                    : user?.role === 'worker' || user?.role === 'trabajador' || user?.role === 'client'
                      ? workerLinks
                      : clientLinks}
            </div>
          </nav>
          
          {/* Botón de guía */}
          <div className="px-2 pb-2 border-t border-gray-700">
            <button
              type="button"
              data-tour="tour-launcher"
              onClick={() => {
                if (guideTimeoutRef.current) {
                  window.clearTimeout(guideTimeoutRef.current);
                }
                const contextualSteps = getContextualStepsForRoute(
                  currentTourRole || 'worker',
                  location.pathname
                );
                if (contextualSteps.length === 0) {
                  toast('Aún no hay una guía disponible para esta pantalla.');
                  return;
                }
                if (isMobile) {
                  setSidebarOpen(false);
                  guideTimeoutRef.current = window.setTimeout(() => {
                    if (currentTourRole) {
                      startContextual(currentTourRole, contextualSteps);
                    }
                  }, 150);
                } else {
                  if (currentTourRole) {
                    startContextual(currentTourRole, contextualSteps);
                  }
                }
              }}
              title="Guía"
              className={`w-full flex items-center gap-2 p-2 mt-3 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors ${
                !isSidebarOpen ? 'lg:justify-center' : ''
              }`}
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.2 5.3 8.2 4.5 6 4.5a4 4 0 00-2 .5v13a4 4 0 012-.5c2.2 0 4.2.8 6 1.753m0-13c1.8-.953 3.8-1.753 6-1.753a4 4 0 012 .5v13a4 4 0 00-2-.5c-2.2 0-4.2.8-6 1.753"
                />
              </svg>
              <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Guía</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Contenedor para Header y Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header Unificado */}
        <header data-tour="app-shell-header" className="bg-dark-blue text-white flex items-center justify-between p-4 z-30 shadow-lg flex-shrink-0">
          {/* Botón de menú: solo visible en móvil/tablet */}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="text-white lg:hidden p-2 -ml-2"
            data-tour="app-shell-sidebar-toggle-mobile"
            aria-label={isSidebarOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
            aria-expanded={isSidebarOpen}
          >
            <MenuIcon aria-hidden="true" />
          </button>
          {/* Logo centrado en móvil, a la izquierda en desktop */}
          <img src={logoWhite} alt="Alltura Logo" data-tour="app-shell-logo" className="h-8 w-auto lg:ml-0" />
          
          {/* Acciones de cabecera */}
          <div ref={profileMenuRef} className="relative flex items-center gap-1 sm:gap-2" data-tour="app-shell-header-actions">
            <div className="p-1" data-tour="app-shell-notifications">
              <NotificationBell variant="dark" />
            </div>

            <button
              type="button"
              onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
              data-tour="app-shell-profile-menu"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-700 transition-colors"
              aria-label="Abrir menú de perfil"
              aria-expanded={isProfileMenuOpen}
            >
              <div className="w-8 h-8 rounded-full bg-gray-500 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <span className="hidden md:block text-sm font-medium max-w-[10rem] truncate">
                {formatNameParts(user?.first_name, user?.last_name)}
              </span>
              <ChevronDownIcon
                className={`text-gray-300 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-[100]">
                <div className="px-4 py-2 border-b border-gray-700">
                  <p className="text-sm font-medium text-white truncate">
                    {formatNameParts(user?.first_name, user?.last_name)}
                  </p>
                  <p className="text-xs text-gray-400">{getRoleLabel(user?.role)}</p>
                </div>

                <button
                  onClick={() => {
                    navigate('/profile');
                    setProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Mi Perfil
                </button>
                <hr className="my-1 border-gray-700" />
                <button
                  onClick={() => {
                    logout();
                    setProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* --- Main Content --- */}
        <main id="main-content" className="flex-1 w-full p-4 sm:p-6 lg:p-10 overflow-y-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
            </div>
          }>
            <Outlet key={location.pathname} />
          </Suspense>
        </main>
      </div>

      <TourOverlay />
    </div>
  )
};

export default AppLayout;
