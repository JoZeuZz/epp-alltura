import { Link } from 'react-router-dom';
import logo from '../assets/logo-alltura.png';

const Unauthorized = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center text-center p-4">
    <img src={logo} alt="Alltura Logo" className="mx-auto h-16 w-auto mb-8" />
    <h1 className="text-4xl font-extrabold text-dark-blue">Acceso Denegado</h1>
    <p className="mt-2 text-lg text-neutral-gray">No tienes permiso para ver esta página.</p>
    <div className="mt-8">
      <Link
        to="/login"
        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue"
      >
        Volver al Login
      </Link>
    </div>
  </div>
);

export default Unauthorized;
