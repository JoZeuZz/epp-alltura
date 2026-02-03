import { useState, Fragment, useRef, useEffect, Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTour } from '../context/TourContext';
import TourOverlay from '../components/TourOverlay';
import type { TourRole } from '../utils/tourSteps';
import logoWhite from '../assets/logo-alltura-white.png';
import UserIcon from '../components/icons/UserIcon';
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

const AppLayout = () => {
  const { user, logout } = useAuth();
  const { start } = useTour();
  const navigate = useNavigate();
  
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

  useEffect(() => {
    if (user?.role && !hasAutoStartedTour.current) {
      hasAutoStartedTour.current = true;
      start(user.role as TourRole);
    }
  }, [start, user?.role]);

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
  const sectionTitleClass = `px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider ${
    !isSidebarOpen ? 'lg:hidden' : ''
  }`;

  const adminLinks = (
    <Fragment>
      {/* Dashboard */}
      <NavLink
        to="/admin/dashboard"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Dashboard</span>
      </NavLink>

      {/* Operaciones */}
      <div className={sectionTitleClass}>Operaciones</div>
      <NavLink
        to="/admin/projects"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Proyectos</span>
      </NavLink>
      <NavLink
        to="/admin/scaffolds"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Andamios</span>
      </NavLink>

      {/* Catálogos */}
      <div className={sectionTitleClass + ' mt-4'}>Catálogos</div>
      <NavLink
        to="/admin/clients"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
        onClick={handleLinkClick}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Clientes</span>
      </NavLink>

      {/* Configuración */}
      <div className={sectionTitleClass + ' mt-4'}>Configuración</div>
      <NavLink
        to="/admin/users"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Mis Proyectos</span>
      </NavLink>
      <NavLink
        to="/supervisor/history"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
        onClick={handleLinkClick}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Historial</span>
      </NavLink>
    </Fragment>
  );

  const clientLinks = (
    <Fragment>
      <NavLink
        to="/client/dashboard"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Mis Proyectos</span>
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
              aria-label={isSidebarOpen ? "Contraer menú" : "Expandir menú"}
            >
              {isSidebarOpen ? <ChevronLeftIcon aria-hidden="true" /> : <ChevronRightIcon aria-hidden="true" />}
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
            <div className={!isSidebarOpen ? 'lg:space-y-2' : ''}>
              {user?.role === 'admin' ? adminLinks : user?.role === 'supervisor' ? supervisorLinks : clientLinks}
            </div>
          </nav>
          
          {/* Botón de guía */}
          <div className="px-2 pb-2 border-t border-gray-700">
            <button
              type="button"
              data-tour="tour-launcher"
              onClick={() => start(user.role as TourRole, { force: true })}
              title="Guía"
              className={`w-full flex items-center gap-2 p-2 mt-3 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors ${
                !isSidebarOpen ? 'lg:justify-center' : ''
              }`}
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.227 9a3 3 0 015.546 1c0 2-3 2-3 4m.08 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
              <span className={!isSidebarOpen ? 'lg:hidden' : ''}>Guía</span>
            </button>
          </div>

          {/* Sección de usuario con menú desplegable */}
          <div className="px-2 py-4 flex-shrink-0 relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
              className={`w-full flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors ${
                !isSidebarOpen ? 'lg:justify-center' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-500 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div className={`ml-3 text-left flex-1 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                <p className="text-sm font-medium text-white truncate">
                  {formatNameParts(user?.first_name, user?.last_name)}
                </p>
                <p className="text-xs text-gray-400">
                  {user?.role === 'admin' ? 'Administrador' : user?.role === 'supervisor' ? 'Supervisor' : 'Cliente'}
                </p>
              </div>
              <ChevronDownIcon className={`text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''} ${
                !isSidebarOpen ? 'lg:hidden' : ''
              }`} />
            </button>

            {/* Menú desplegable del perfil */}
            {isProfileMenuOpen && (
              <div className={`fixed bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-[100] ${
                isSidebarOpen 
                  ? 'bottom-20 left-2 w-60' 
                  : 'bottom-20 left-2 w-60 lg:left-20 lg:w-48'
              }`}>
                <button
                  onClick={() => {
                    navigate(`/${user.role}/profile`);
                    setProfileMenuOpen(false);
                    handleLinkClick();
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
        </div>
      </nav>

      {/* Contenedor para Header y Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header Unificado */}
        <header className="bg-dark-blue text-white flex items-center justify-between p-4 z-30 shadow-lg flex-shrink-0">
          {/* Botón de menú: solo visible en móvil/tablet */}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="text-white lg:hidden p-2 -ml-2"
            aria-label={isSidebarOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
            aria-expanded={isSidebarOpen}
          >
            <MenuIcon aria-hidden="true" />
          </button>
          {/* Logo centrado en móvil, a la izquierda en desktop */}
          <img src={logoWhite} alt="Alltura Logo" className="h-8 w-auto lg:ml-0" />
          
          {/* Notification Bell - visible para todos los usuarios autenticados */}
          <div className="lg:hidden p-2 -mr-2">
            <NotificationBell variant="dark" />
          </div>
          <div className="hidden lg:block">
            <NotificationBell variant="dark" />
          </div>
        </header>

        {/* --- Main Content --- */}
        <main id="main-content" className="flex-1 w-full p-4 sm:p-6 lg:p-10 overflow-y-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <TourOverlay />
    </div>
  )
};

export default AppLayout;
