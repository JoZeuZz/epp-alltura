import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ClientNote } from '../types/clientNotes';
import { useState } from 'react';
import { formatNameParts, getInitials } from '../utils/name';

interface ClientNoteItemProps {
  note: ClientNote;
  currentUserId?: number;
  currentUserRole?: 'admin' | 'supervisor' | 'client';
  onResolve?: (noteId: number, resolutionNotes?: string) => Promise<void>;
  onReopen?: (noteId: number) => Promise<void>;
  onUpdate?: (noteId: number, noteText: string) => Promise<void>;
  onDelete?: (noteId: number) => Promise<void>;
}

export default function ClientNoteItem({
  note,
  currentUserId,
  currentUserRole,
  onResolve,
  onReopen,
  onUpdate,
  onDelete,
}: ClientNoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(note.note_text);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAuthor = currentUserId === note.user_id;
  const canEdit = isAuthor && !note.is_resolved && currentUserRole === 'client';
  const canResolve =
    !note.is_resolved &&
    (currentUserRole === 'supervisor' || currentUserRole === 'admin');
  const canReopen = isAuthor && note.is_resolved && currentUserRole === 'client';
  const canDelete = currentUserRole === 'admin';
  const authorName = formatNameParts(note.first_name, note.last_name);
  const authorInitials = getInitials(note.first_name, note.last_name);
  const resolverName = formatNameParts(note.resolver_first_name, note.resolver_last_name);

  const handleUpdate = async () => {
    if (!onUpdate || editedText.trim() === note.note_text) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(note.id, editedText.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!onResolve) return;

    setIsLoading(true);
    try {
      await onResolve(note.id, resolutionNotes.trim() || undefined);
      setShowResolveModal(false);
      setResolutionNotes('');
    } catch (error) {
      console.error('Error resolving note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!onReopen) return;

    setIsLoading(true);
    try {
      await onReopen(note.id);
    } catch (error) {
      console.error('Error reopening note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) return;

    setIsLoading(true);
    try {
      await onDelete(note.id);
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        note.is_resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {note.profile_picture_url ? (
            <img
              src={note.profile_picture_url}
              alt={authorName || 'Usuario'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {authorInitials || '?'}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">
              {authorName}
            </p>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(note.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {note.is_resolved ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Resuelta
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              ● Pendiente
            </span>
          )}
        </div>
      </div>

      {/* Target Info */}
      {(note.scaffold_number || note.project_name) && (
        <div className="text-sm text-gray-600 mb-2">
          {note.target_type === 'scaffold' ? (
            <span>
              📍 Andamio: <strong>{note.scaffold_number}</strong>
              {note.project_name && ` (${note.project_name})`}
            </span>
          ) : (
            <span>
              📁 Proyecto: <strong>{note.project_name}</strong>
            </span>
          )}
        </div>
      )}

      {/* Note Content */}
      {isEditing ? (
        <div className="mb-3">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            maxLength={5000}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleUpdate}
              disabled={isLoading || editedText.trim().length < 1}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedText(note.note_text);
              }}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 whitespace-pre-wrap mb-3">{note.note_text}</p>
      )}

      {/* Resolution Info */}
      {note.is_resolved && note.resolver_first_name && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
          <p className="text-sm font-medium text-green-900 mb-1">
            Resuelta por {resolverName}
          </p>
          {note.resolution_notes && (
            <p className="text-sm text-green-800">{note.resolution_notes}</p>
          )}
          {note.resolved_at && (
            <p className="text-xs text-green-600 mt-1">
              {formatDistanceToNow(new Date(note.resolved_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Editar
          </button>
        )}

        {canResolve && (
          <button
            onClick={() => setShowResolveModal(true)}
            disabled={isLoading}
            className="text-sm text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
          >
            Marcar como Resuelta
          </button>
        )}

        {canReopen && (
          <button
            onClick={handleReopen}
            disabled={isLoading}
            className="text-sm text-orange-600 hover:text-orange-800 font-medium disabled:opacity-50"
          >
            Reabrir
          </button>
        )}

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
          >
            Eliminar
          </button>
        )}
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Resolver Nota</h3>
            <p className="text-sm text-gray-600 mb-4">
              Opcionalmente puedes agregar notas sobre la resolución:
            </p>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Notas de resolución (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px] mb-4"
              maxLength={1000}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolutionNotes('');
                }}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolve}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Resolviendo...' : 'Resolver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
