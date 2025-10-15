import { useState, Fragment } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoWhite from '../assets/logo-alltura-white.png';
import UserIcon from '../components/icons/UserIcon';

// --- Iconos SVG ---
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AppLayout = () => {
  const { user, logout } = useAuth();
  // Estado inicial unificado: la sidebar siempre empieza cerrada.
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    // O un spinner/loading component
    return null;
  }

  // Cierra la sidebar después de hacer clic en un enlace (móvil y escritorio).
  const handleLinkClick = () => {
    setSidebarOpen(false);
  };

  const linkClass = 'flex items-center p-2 text-gray-300 rounded-lg hover:bg-gray-700';
  const activeLinkClass = 'flex items-center p-2 text-white bg-primary-blue rounded-lg';

  const adminLinks = (
    <Fragment>
      <NavLink
        to="/admin/dashboard"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/admin/clients"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
        onClick={handleLinkClick}
      >
        Clientes
      </NavLink>
      <NavLink
        to="/admin/projects"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Proyectos
      </NavLink>
      <NavLink
        to="/admin/users"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Usuarios
      </NavLink>
      <NavLink
        to="/admin/scaffolds"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Andamios
      </NavLink>
    </Fragment>
  );

  const techLinks = (
    <Fragment>
      <NavLink
        to="/tech/dashboard"
        onClick={handleLinkClick}
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Mis Proyectos
      </NavLink>
      <NavLink
        to="/tech/history"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
        onClick={handleLinkClick}
      >
        Historial
      </NavLink>
    </Fragment>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">

      {/* --- Sidebar --- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-dark-blue text-white flex flex-col transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Contenido de la Sidebar, se oculta si está colapsada */}
        <div className="flex flex-col h-full w-64 overflow-hidden">
          <div className="flex items-center justify-between h-20 border-b border-gray-700 px-4 flex-shrink-0">
            <img src={logoWhite} alt="Alltura Logo" className="h-12 w-auto" />
            <button onClick={() => setSidebarOpen(false)} className="text-white">
              <CloseIcon />
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
            <NavLink
              to={`/${user.role}/profile`}
              onClick={handleLinkClick}
              className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
            >
              Mi Perfil
            </NavLink>
            <hr className="my-2 border-gray-700" />
            {user?.role === 'admin' ? adminLinks : techLinks}
          </nav>
          <div className="px-2 py-4 border-t border-gray-700 flex-shrink-0">
            <div className="flex items-center p-2">
              <div className="w-10 h-10 rounded-full bg-gray-500 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div className="ml-3 text-left">
                <p className="text-sm font-medium text-white truncate">Hola, {user?.first_name}</p>
                <p className="text-xs text-gray-400">{user?.last_name}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full mt-2 text-left p-2 text-gray-300 rounded-lg hover:bg-gray-700"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor para Header y Main Content */}
      <div className="flex flex-col flex-1 w-full">
        {/* Header Unificado */}
        <header className="bg-dark-blue text-white flex items-center justify-between p-4 z-30 shadow-lg flex-shrink-0">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-white">
            <MenuIcon />
          </button>
          <img src={logoWhite} alt="Alltura Logo" className="h-8 w-auto" />
          <div className="w-6"></div> {/* Espaciador para centrar el logo */}
        </header>

        {/* --- Main Content --- */}
        <main className="flex-1 w-full p-6 lg:p-10 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
};

export default AppLayout;
