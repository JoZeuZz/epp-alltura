import { useState, useEffect, useCallback } from 'react';
import {
  getMyClientNotes,
  getScaffoldNotes,
  getProjectNotes,
  createClientNote,
  updateClientNote,
  resolveClientNote,
  reopenClientNote,
  deleteClientNote,
  getUnresolvedProjectNotes,
} from '../services/apiService';
import type {
  ClientNote,
  CreateClientNoteDTO,
  UpdateClientNoteDTO,
  ResolveClientNoteDTO,
} from '../types/clientNotes';

/**
 * Hook para gestionar notas de cliente
 */
export const useClientNotes = (params?: {
  scaffoldId?: number;
  projectId?: number;
  unresolvedOnly?: boolean;
}) => {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response: { data: ClientNote[] };
      if (params?.scaffoldId) {
        response = (await getScaffoldNotes(params.scaffoldId)) as {
          data: ClientNote[];
        };
      } else if (params?.projectId) {
        if (params.unresolvedOnly) {
          response = (await getUnresolvedProjectNotes(params.projectId)) as {
            data: ClientNote[];
          };
        } else {
          response = (await getProjectNotes(params.projectId)) as {
            data: ClientNote[];
          };
        }
      } else {
        response = (await getMyClientNotes({
          unresolved_only: params?.unresolvedOnly,
        })) as { data: ClientNote[] };
      }

      setNotes(response.data || []);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cargar las notas';
      setError(errorMessage);
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [params?.scaffoldId, params?.projectId, params?.unresolvedOnly]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (data: CreateClientNoteDTO) => {
    try {
      await createClientNote(data);
      await fetchNotes(); // Recargar notas
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al crear la nota';
      throw new Error(errorMessage);
    }
  };

  const updateNote = async (noteId: number, data: UpdateClientNoteDTO) => {
    try {
      await updateClientNote(noteId, data);
      await fetchNotes();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar la nota';
      throw new Error(errorMessage);
    }
  };

  const resolveNote = async (noteId: number, data?: ResolveClientNoteDTO) => {
    try {
      await resolveClientNote(noteId, data);
      await fetchNotes();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al resolver la nota';
      throw new Error(errorMessage);
    }
  };

  const reopenNote = async (noteId: number) => {
    try {
      await reopenClientNote(noteId);
      await fetchNotes();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al reabrir la nota';
      throw new Error(errorMessage);
    }
  };

  const deleteNote = async (noteId: number) => {
    try {
      await deleteClientNote(noteId);
      await fetchNotes();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al eliminar la nota';
      throw new Error(errorMessage);
    }
  };

  return {
    notes,
    loading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    resolveNote,
    reopenNote,
    deleteNote,
  };
};
