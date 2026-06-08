import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import { createProveedor, type Proveedor } from '../../services/apiService';
import { extractApiError } from '../../lib/apiError';

const schema = z.object({
  nombre:   z.string().min(2, 'Mínimo 2 caracteres').max(150),
  rut:      z.string().max(20).optional(),
  email:    z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().max(30).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (proveedor: Proveedor) => void;
}

const ProveedorCreateModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => createProveedor(data),
    onSuccess: (proveedor) => {
      toast.success(`Proveedor "${proveedor.nombre}" creado`);
      reset();
      onCreated(proveedor);
    },
    onError: (err: unknown) => {
      const { message } = extractApiError(err);
      toast.error(message);
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo proveedor">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            {...register('nombre')}
            className="w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Ej: MSA Safety Chile"
          />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">RUT</label>
            <input
              {...register('rut')}
              className="w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="76.100.001-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Teléfono</label>
            <input
              {...register('telefono')}
              className="w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="+56222000001"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="ventas@proveedor.cl"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-content-secondary bg-surface-overlay rounded-md hover:bg-edge"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50"
          >
            {mutation.isPending ? 'Creando...' : 'Crear proveedor'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProveedorCreateModal;
