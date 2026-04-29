import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import logoWhite from '../assets/logo-alltura-white.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'El email es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string>('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    try {
      const success = await login(data.email, data.password);
      if (success) {
        toast.success('¡Bienvenido!');
        
        const token = localStorage.getItem('accessToken');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.user?.role || payload.role;
            
            if (role === 'admin') {
              navigate('/admin/dashboard', { replace: true });
            } else if (role === 'supervisor') {
              navigate('/supervisor/dashboard', { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          } catch (err) {
            console.error('Error decoding token:', err);
            navigate('/', { replace: true });
          }
        } else {
          navigate('/', { replace: true });
        }
      } else {
        const errorMsg = 'El correo electrónico o la contraseña son incorrectos.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch {
      const errorMsg = 'Ocurrió un error al intentar iniciar sesión. Por favor, inténtelo de nuevo.';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="w-full max-w-md p-8 space-y-8 bg-dark-blue text-white rounded-lg shadow-lg mx-4">
        <div className="text-center">
          <img src={logoWhite} alt="Alltura Logo" className="mx-auto h-12 w-auto mb-6" />
          <h2 className="text-2xl font-bold">Iniciar Sesión</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`mt-1 block w-full px-3 py-2 bg-gray-800 bg-opacity-50 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                errors.email ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {errors.email && (
              <p id="email-error" className="text-red-400 text-sm mt-1" role="alert">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={`mt-1 block w-full px-3 py-2 bg-gray-800 bg-opacity-50 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                errors.password ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {errors.password && (
              <p id="password-error" className="text-red-400 text-sm mt-1" role="alert">{errors.password.message}</p>
            )}
          </div>

          {error && <div className="text-center text-red-400 text-sm" role="alert">{error}</div>}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-blue hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50"
            >
              {isSubmitting ? 'Iniciando...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
