import { useState, useEffect, useCallback } from 'react';
import {
  getScaffoldModifications,
  createScaffoldModification,
  approveModification,
  rejectModification,
  deleteModification,
} from '../services/apiService';
import type {
  ScaffoldModification,
  CreateScaffoldModificationDTO,
} from '../types/scaffoldModifications';

interface UseScaffoldModificationsProps {
  scaffoldId: number;
  autoFetch?: boolean;
}

interface UseScaffoldModificationsReturn {
  modifications: ScaffoldModification[];
  loading: boolean;
  error: string | null;
  fetchModifications: () => Promise<void>;
  createModification: (data: CreateScaffoldModificationDTO) => Promise<void>;
  approve: (modificationId: number) => Promise<void>;
  reject: (modificationId: number, reason: string) => Promise<void>;
  deleteModif: (modificationId: number) => Promise<void>;
  pendingCount: number;
  approvedCount: number;
  totalAdditionalCubicMeters: number;
}

export function useScaffoldModifications({
  scaffoldId,
  autoFetch = true,
}: UseScaffoldModificationsProps): UseScaffoldModificationsReturn {
  const [modifications, setModifications] = useState<ScaffoldModification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModifications = useCallback(async () => {
    if (!scaffoldId) return;

    try {
      setLoading(true);
      setError(null);
      const response: any = await getScaffoldModifications(scaffoldId);
      setModifications(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar modificaciones');
      console.error('Error fetching modifications:', err);
    } finally {
      setLoading(false);
    }
  }, [scaffoldId]);

  const createModification = useCallback(
    async (data: CreateScaffoldModificationDTO) => {
      try {
        setError(null);
        await createScaffoldModification(scaffoldId, data);
        await fetchModifications(); // Recargar lista
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al crear modificación');
        throw err;
      }
    },
    [scaffoldId, fetchModifications]
  );

  const approve = useCallback(
    async (modificationId: number) => {
      try {
        setError(null);
        await approveModification(modificationId);
        await fetchModifications(); // Recargar lista
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al aprobar modificación');
        throw err;
      }
    },
    [fetchModifications]
  );

  const reject = useCallback(
    async (modificationId: number, reason: string) => {
      try {
        setError(null);
        await rejectModification(modificationId, reason);
        await fetchModifications(); // Recargar lista
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al rechazar modificación');
        throw err;
      }
    },
    [fetchModifications]
  );

  const deleteModif = useCallback(
    async (modificationId: number) => {
      try {
        setError(null);
        await deleteModification(modificationId);
        await fetchModifications(); // Recargar lista
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al eliminar modificación');
        throw err;
      }
    },
    [fetchModifications]
  );

  // Cálculos derivados
  const pendingCount = modifications.filter((m) => m.approval_status === 'pending').length;
  const approvedCount = modifications.filter((m) => m.approval_status === 'approved').length;
  const totalAdditionalCubicMeters = modifications
    .filter((m) => m.approval_status === 'approved')
    .reduce((sum, m) => sum + parseFloat(String(m.cubic_meters)), 0);

  // Auto-fetch al montar
  useEffect(() => {
    if (autoFetch) {
      fetchModifications();
    }
  }, [autoFetch, fetchModifications]);

  return {
    modifications,
    loading,
    error,
    fetchModifications,
    createModification,
    approve,
    reject,
    deleteModif,
    pendingCount,
    approvedCount,
    totalAdditionalCubicMeters,
  };
}
