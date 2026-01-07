import { useAuth } from '../context/AuthContext';

interface ScaffoldPermissionsResult {
  canEdit: boolean;
  canDelete: boolean;
  canToggleCard: boolean;
  canDisassemble: boolean;
}

interface UseScaffoldPermissionsProps {
  scaffoldUserId?: number;
  projectAssignedSupervisorId?: number | null;
  assemblyStatus?: 'assembled' | 'in_progress' | 'disassembled';
}

/**
 * Hook para determinar permisos de edición de andamios
 * 
 * Reglas:
 * - Admin: puede editar/eliminar cualquier andamio
 * - Supervisor: puede editar andamios que creó o de proyectos asignados
 * - Toggle tarjeta: solo si está armado al 100%
 * - Desarmar: solo si está armado o en proceso
 */
export const useScaffoldPermissions = ({
  scaffoldUserId,
  projectAssignedSupervisorId,
  assemblyStatus = 'assembled',
}: UseScaffoldPermissionsProps): ScaffoldPermissionsResult => {
  const { user } = useAuth();

  if (!user) {
    return {
      canEdit: false,
      canDelete: false,
      canToggleCard: false,
      canDisassemble: false,
    };
  }

  const isAdmin = user.role === 'admin';
  const isSupervisor = user.role === 'supervisor';
  const isCreator = user.id === scaffoldUserId;
  const isAssignedToProject = user.id === projectAssignedSupervisorId;

  // Admin puede todo
  const canEdit = isAdmin || (isSupervisor && (isCreator || isAssignedToProject));
  const canDelete = isAdmin;

  // Toggle de tarjeta: solo si está armado al 100% y tiene permisos de edición
  const canToggleCard = canEdit && assemblyStatus === 'assembled';

  // Desarmar: solo si está armado o en proceso (no desarmados) y tiene permisos
  const canDisassemble = canEdit && (assemblyStatus === 'assembled' || assemblyStatus === 'in_progress');

  return {
    canEdit,
    canDelete,
    canToggleCard,
    canDisassemble,
  };
};
