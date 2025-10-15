import React, { useState, useEffect } from 'react';
import { useGet } from '../hooks/useGet';
import { User, Project } from '../types/api';
import { AssignFormData } from '../types/components';

interface AssignTechniciansFormProps {
  project: Project | null;
  onSubmit: (data: AssignFormData) => void;
  onCancel: () => void;
}

export default function AssignTechniciansForm({
  project,
  onSubmit,
  onCancel,
}: AssignTechniciansFormProps) {
  const [assigned, setAssigned] = useState<Set<number>>(new Set());

  const { data: technicians, isLoading: techniciansLoading } = useGet<User[]>(
    'technicians',
    '/users?role=technician',
  );
  const { data: assignedUsers, isLoading: assignedUsersLoading } = useGet<number[]>(
    `project-users-${project?.id}`,
    `/projects/${project?.id}/users`,
    { enabled: !!project },
  );

  useEffect(() => {
    if (assignedUsers) {
      setAssigned(new Set(assignedUsers));
    }
  }, [assignedUsers]);

  const handleCheckboxChange = (techId: number) => {
    setAssigned((prevAssigned) => {
      const newAssigned = new Set(prevAssigned);
      if (newAssigned.has(techId)) {
        newAssigned.delete(techId);
      } else {
        newAssigned.add(techId);
      }
      return newAssigned;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (project) {
      onSubmit({ projectId: project.id, userIds: Array.from(assigned) });
    }
  };

  const isLoading = techniciansLoading || assignedUsersLoading;

  if (isLoading) return <p>Cargando técnicos...</p>;

  return (
    <form onSubmit={handleSubmit}>
      <p className="mb-4">
        Seleccione los técnicos que trabajarán en el proyecto <strong>{project?.name}</strong>.
      </p>
      <div className="max-h-60 overflow-y-auto border rounded-lg p-4 space-y-2 mb-6">
        {technicians && technicians.length > 0 ? (
          technicians.map((tech) => (
            <label
              key={tech.id}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-light-gray-bg"
            >
              <input
                type="checkbox"
                checked={assigned.has(tech.id)}
                onChange={() => handleCheckboxChange(tech.id)}
                className="h-5 w-5 rounded border-gray-300 text-primary-blue focus:ring-primary-blue"
              />
              <span className="text-gray-700">{`${tech.first_name} ${tech.last_name}`}</span>
            </label>
          ))
        ) : (
          <p className="text-neutral-gray">No hay técnicos disponibles para asignar.</p>
        )}
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 mr-2"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="bg-primary-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          Guardar Asignaciones
        </button>
      </div>
    </form>
  );
}
