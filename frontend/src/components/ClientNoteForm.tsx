import { useState } from 'react';
import type { CreateClientNoteDTO } from '../types/clientNotes';

interface ClientNoteFormProps {
  targetType: 'scaffold' | 'project';
  targetId: number;
  onSubmit: (data: CreateClientNoteDTO) => Promise<void>;
  onCancel?: () => void;
}

export default function ClientNoteForm({
  targetType,
  targetId,
  onSubmit,
  onCancel,
}: ClientNoteFormProps) {
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const characterCount = noteText.length;
  const maxCharacters = 5000;
  const isValid = characterCount >= 1 && characterCount <= maxCharacters;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError('El texto de la nota debe tener entre 1 y 5000 caracteres');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data: CreateClientNoteDTO = {
        target_type: targetType,
        note_text: noteText.trim(),
        ...(targetType === 'scaffold'
          ? { scaffold_id: targetId }
          : { project_id: targetId }),
      };

      await onSubmit(data);
      setNoteText('');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al crear la nota';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="note-text"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Escribe tu nota
        </label>
        <textarea
          id="note-text"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Describe el problema o comentario que quieres reportar..."
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 min-h-[120px] ${
            !isValid && characterCount > 0
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
          disabled={isSubmitting}
        />
        <div className="flex justify-between items-center mt-1">
          <span
            className={`text-sm ${
              characterCount > maxCharacters
                ? 'text-red-600 font-medium'
                : characterCount > maxCharacters * 0.9
                ? 'text-orange-600'
                : 'text-gray-500'
            }`}
          >
            {characterCount} / {maxCharacters} caracteres
          </span>
          {characterCount < 1 && (
            <span className="text-sm text-gray-500">Mínimo 1 carácter</span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Nota'}
        </button>
      </div>
    </form>
  );
}
