import ClientNoteItem from './ClientNoteItem';
import ClientNoteForm from './ClientNoteForm';
import type { ClientNote, CreateClientNoteDTO } from '../types/clientNotes';
import { useState } from 'react';

interface ClientNotesListProps {
  notes: ClientNote[];
  loading?: boolean;
  error?: string | null;
  currentUserId?: number;
  currentUserRole?: 'admin' | 'supervisor' | 'client';
  showCreateForm?: boolean;
  targetType?: 'scaffold' | 'project';
  targetId?: number;
  onCreateNote?: (data: CreateClientNoteDTO) => Promise<void>;
  onResolveNote?: (noteId: number, resolutionNotes?: string) => Promise<void>;
  onReopenNote?: (noteId: number) => Promise<void>;
  onUpdateNote?: (noteId: number, noteText: string) => Promise<void>;
  onDeleteNote?: (noteId: number) => Promise<void>;
}

export default function ClientNotesList({
  notes,
  loading,
  error,
  currentUserId,
  currentUserRole,
  showCreateForm = false,
  targetType,
  targetId,
  onCreateNote,
  onResolveNote,
  onReopenNote,
  onUpdateNote,
  onDeleteNote,
}: ClientNotesListProps) {
  const [showForm, setShowForm] = useState(false);

  const canCreateNote =
    currentUserRole === 'client' && targetType && targetId && onCreateNote;

  const handleCreateNote = async (data: CreateClientNoteDTO) => {
    if (!onCreateNote) return;
    await onCreateNote(data);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-medium">Error al cargar las notas</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const unresolvedNotes = notes.filter((n) => !n.is_resolved);
  const resolvedNotes = notes.filter((n) => n.is_resolved);

  return (
    <div className="space-y-4">
      {/* Create Note Button & Form */}
      {canCreateNote && showCreateForm && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full px-4 py-3 text-left border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-2 text-gray-600 hover:text-blue-600"
            >
              <span className="text-xl">+</span>
              <span className="font-medium">Agregar nueva nota</span>
            </button>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3">Nueva Nota</h3>
              <ClientNoteForm
                targetType={targetType}
                targetId={targetId}
                onSubmit={handleCreateNote}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg font-medium">No hay notas</p>
          <p className="text-sm mt-1">
            {canCreateNote
              ? 'Sé el primero en dejar una nota'
              : 'Aún no se han registrado notas'}
          </p>
        </div>
      ) : (
        <>
          {/* Unresolved Notes */}
          {unresolvedNotes.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                Notas Pendientes ({unresolvedNotes.length})
              </h3>
              <div className="space-y-3">
                {unresolvedNotes.map((note) => (
                  <ClientNoteItem
                    key={note.id}
                    note={note}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onResolve={onResolveNote}
                    onReopen={onReopenNote}
                    onUpdate={onUpdateNote}
                    onDelete={onDeleteNote}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Resolved Notes */}
          {resolvedNotes.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                Notas Resueltas ({resolvedNotes.length})
              </h3>
              <div className="space-y-3">
                {resolvedNotes.map((note) => (
                  <ClientNoteItem
                    key={note.id}
                    note={note}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onResolve={onResolveNote}
                    onReopen={onReopenNote}
                    onUpdate={onUpdateNote}
                    onDelete={onDeleteNote}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
