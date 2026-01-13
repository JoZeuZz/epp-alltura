import React, { useState, useEffect } from 'react';
import { useGet } from '../hooks/useGet';
import { User, Project } from '../types/api';
import { AssignFormData } from '../types/components';

interface AssignSupervisorsFormProps {
  project: Project | null;
  onSubmit: (data: AssignFormData) => void;
  onCancel: () => void;
}

export default function AssignSupervisorsForm({
  project,
  onSubmit,
  onCancel,
}: AssignSupervisorsFormProps) {
  const [assignedSupervisors, setAssignedSupervisors] = useState<Set<number>>(new Set());
  const [assignedClients, setAssignedClients] = useState<Set<number>>(new Set());

  const { data: supervisors, isLoading: supervisorsLoading } = useGet<User[]>(
    'supervisors',
    '/users?role=supervisor',
  );
  const { data: clientUsers, isLoading: clientUsersLoading } = useGet<User[]>(
    'clientUsers',
    '/users?role=client',
  );
  const { data: assignedUsers, isLoading: assignedUsersLoading } = useGet<number[]>(
    `project-users-${project?.id}`,
    `/projects/${project?.id}/users`,
    { enabled: !!project },
  );

  useEffect(() => {
    if (assignedUsers && supervisors && clientUsers && project) {
      const supervisorIds = supervisors.map(s => s.id);
      // Filtrar usuarios cliente por la empresa del proyecto
      const filteredClients = clientUsers.filter(c => c.client_id === project.client_id);
      const clientIds = filteredClients.map(c => c.id);
      
      const supervisorSet = new Set(assignedUsers.filter(id => supervisorIds.includes(id)));
      const clientSet = new Set(assignedUsers.filter(id => clientIds.includes(id)));
      
      setAssignedSupervisors(supervisorSet);
      setAssignedClients(clientSet);
    }
  }, [assignedUsers, supervisors, clientUsers, project]);

  const handleSupervisorChange = (supervisorId: number) => {
    setAssignedSupervisors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(supervisorId)) {
        newSet.delete(supervisorId);
      } else {
        newSet.add(supervisorId);
      }
      return newSet;
    });
  };

  const handleClientChange = (clientId: number) => {
    setAssignedClients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (project) {
      const allAssigned = [...Array.from(assignedSupervisors), ...Array.from(assignedClients)];
      onSubmit({ projectId: project.id, userIds: allAssigned });
    }
  };

  // Filtrar usuarios cliente para mostrar solo los de la misma empresa del proyecto
  const filteredClientUsers = clientUsers?.filter(user => user.client_id === project?.client_id) || [];

  const isLoading = supervisorsLoading || clientUsersLoading || assignedUsersLoading;

  if (isLoading) return <p>Cargando usuarios...</p>;

  return (
    <form onSubmit={handleSubmit}>
      <p className="mb-4">
        Asigne supervisores y usuarios cliente al proyecto <strong>{project?.name}</strong>.
      </p>
      
      {/* Sección de Supervisores */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-dark-blue mb-3 flex items-center">
          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
          Supervisores
        </h3>
        <div className="max-h-48 overflow-y-auto border rounded-lg p-4 space-y-2 bg-blue-50">
          {supervisors && supervisors.length > 0 ? (
            supervisors.map((supervisor) => (
              <label
                key={supervisor.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-blue-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={assignedSupervisors.has(supervisor.id)}
                  onChange={() => handleSupervisorChange(supervisor.id)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{`${supervisor.first_name} ${supervisor.last_name}`}</span>
              </label>
            ))
          ) : (
            <p className="text-neutral-gray text-sm">No hay supervisores disponibles para asignar.</p>
          )}
        </div>
      </div>
      
      {/* Sección de Usuarios Cliente */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-dark-blue mb-3 flex items-center">
          <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-2"></span>
          Usuarios Cliente
        </h3>
        <div className="max-h-48 overflow-y-auto border rounded-lg p-4 space-y-2 bg-green-50">
          {filteredClientUsers && filteredClientUsers.length > 0 ? (
            filteredClientUsers.map((client) => (
              <label
                key={client.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-green-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={assignedClients.has(client.id)}
                  onChange={() => handleClientChange(client.id)}
                  className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-gray-700">{`${client.first_name} ${client.last_name}`}</span>
              </label>
            ))
          ) : (
            <p className="text-neutral-gray text-sm">
              {project?.client_id 
                ? 'No hay usuarios cliente disponibles para esta empresa.' 
                : 'Seleccione una empresa cliente para ver los usuarios disponibles.'}
            </p>
          )}
        </div>
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
