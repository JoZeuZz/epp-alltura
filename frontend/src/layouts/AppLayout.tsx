import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoWhite from '../assets/logo-alltura-white.png';

const AppLayout = () => {
  const { user, logout } = useAuth();

  if (!user) {
    // O un spinner/loading component
    return null;
  }

  const linkClass = 'flex items-center p-2 text-gray-300 rounded-lg hover:bg-gray-700';
  const activeLinkClass = 'flex items-center p-2 text-white bg-primary-blue rounded-lg';

  const adminLinks = (
    <>
      <NavLink
        to="/admin/dashboard"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/admin/clients"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Clientes
      </NavLink>
      <NavLink
        to="/admin/projects"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Proyectos
      </NavLink>
      <NavLink
        to="/admin/users"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Usuarios
      </NavLink>
      <NavLink
        to="/admin/scaffolds"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Andamios
      </NavLink>
    </>
  );

  const techLinks = (
    <>
      <NavLink
        to="/tech/dashboard"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Mis Proyectos
      </NavLink>
      <NavLink
        to="/tech/history"
        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
      >
        Historial
      </NavLink>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-dark-blue text-white flex flex-col">
        <div className="flex items-center justify-center h-20 border-b border-gray-700">
          <img src={logoWhite} alt="Alltura Logo" className="h-12 w-auto" />
        </div>
        <nav className="flex-1 px-2 py-4 space-y-2">
          <NavLink
            to={`/${user.role}/profile`}
            className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
          >
            Mi Perfil
          </NavLink>
          <hr className="my-2 border-gray-700" />
          {user?.role === 'admin' ? adminLinks : techLinks}
        </nav>
        <div className="px-2 py-4 border-t border-gray-700">
          <p className="text-sm text-center text-gray-400">Hola, {user?.name}</p>
          <button
            onClick={logout}
            className="w-full mt-2 text-left p-2 text-gray-300 rounded-lg hover:bg-gray-700"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-10 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
