import React, { useState, useEffect } from 'react';
import {
  assignClientToProject,
  assignSupervisorToProject,
  getUsersByRole,
} from '../services/apiService';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'client';
}

interface ProjectAssignmentFormProps {
  projectId: number;
  currentClientId?: number | null;
  currentSupervisorId?: number | null;
  onAssignmentChange?: () => void;
}

/**
 * Formulario para asignar clientes y supervisores a proyectos
 * Solo accesible por administradores
 */
export const ProjectAssignmentForm: React.FC<ProjectAssignmentFormProps> = ({
  projectId,
  currentClientId,
  currentSupervisorId,
  onAssignmentChange,
}) => {
  const [clients, setClients] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    currentClientId || null
  );
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(
    currentSupervisorId || null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [clientsData, supervisorsData] = await Promise.all([
        getUsersByRole('client'),
        getUsersByRole('supervisor'),
      ]);
      setClients(clientsData as User[]);
      setSupervisors(supervisorsData as User[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClient = async () => {
    if (!selectedClientId) {
      setError('Por favor selecciona un cliente');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await assignClientToProject(projectId, selectedClientId);

      setSuccessMessage('Cliente asignado correctamente');
      if (onAssignmentChange) {
        onAssignmentChange();
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSupervisor = async () => {
    if (!selectedSupervisorId) {
      setError('Por favor selecciona un supervisor');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await assignSupervisorToProject(projectId, selectedSupervisorId);

      setSuccessMessage('Supervisor asignado correctamente');
      if (onAssignmentChange) {
        onAssignmentChange();
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar supervisor');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignClient = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await assignClientToProject(projectId, null);

      setSelectedClientId(null);
      setSuccessMessage('Cliente desasignado correctamente');
      if (onAssignmentChange) {
        onAssignmentChange();
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desasignar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignSupervisor = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await assignSupervisorToProject(projectId, null);

      setSelectedSupervisorId(null);
      setSuccessMessage('Supervisor desasignado correctamente');
      if (onAssignmentChange) {
        onAssignmentChange();
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desasignar supervisor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Asignación de Usuarios al Proyecto</h3>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Asignación de Cliente */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold flex items-center space-x-2">
            <span>👤</span>
            <span>Cliente Asignado</span>
          </h4>
          {currentClientId && (
            <button
              onClick={handleUnassignClient}
              className="text-sm text-red-600 hover:text-red-800"
              disabled={saving}
            >
              Desasignar
            </button>
          )}
        </div>

        <div className="space-y-3">
          <select
            value={selectedClientId || ''}
            onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            disabled={saving}
          >
            <option value="">-- Seleccionar Cliente --</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.email})
              </option>
            ))}
          </select>

          <button
            onClick={handleAssignClient}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            disabled={!selectedClientId || saving}
          >
            {saving ? 'Asignando...' : 'Asignar Cliente'}
          </button>
        </div>
      </div>

      {/* Asignación de Supervisor */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold flex items-center space-x-2">
            <span>👷</span>
            <span>Supervisor Asignado</span>
          </h4>
          {currentSupervisorId && (
            <button
              onClick={handleUnassignSupervisor}
              className="text-sm text-red-600 hover:text-red-800"
              disabled={saving}
            >
              Desasignar
            </button>
          )}
        </div>

        <div className="space-y-3">
          <select
            value={selectedSupervisorId || ''}
            onChange={(e) => setSelectedSupervisorId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            disabled={saving}
          >
            <option value="">-- Seleccionar Supervisor --</option>
            {supervisors.map((supervisor) => (
              <option key={supervisor.id} value={supervisor.id}>
                {supervisor.name} ({supervisor.email})
              </option>
            ))}
          </select>

          <button
            onClick={handleAssignSupervisor}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            disabled={!selectedSupervisorId || saving}
          >
            {saving ? 'Asignando...' : 'Asignar Supervisor'}
          </button>
        </div>
      </div>

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Los clientes podrán ver solo los proyectos asignados a ellos. 
          Los supervisores podrán crear y editar andamios en los proyectos donde estén asignados.
        </p>
      </div>
    </div>
  );
};

export default ProjectAssignmentForm;
