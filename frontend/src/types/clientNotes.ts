// ============ TIPOS PARA NOTAS DE CLIENTES ============

export interface ClientNote {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'client';
  profile_picture_url?: string;
  target_type: 'scaffold' | 'project';
  scaffold_id?: number;
  project_id?: number;
  scaffold_number?: string;
  project_name?: string;
  note_text: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: number;
  resolver_first_name?: string;
  resolver_last_name?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientNoteDTO {
  target_type: 'scaffold' | 'project';
  scaffold_id?: number;
  project_id?: number;
  note_text: string;
}

export interface UpdateClientNoteDTO {
  note_text: string;
}

export interface ResolveClientNoteDTO {
  resolution_notes?: string;
}

export interface ClientNoteStats {
  total: number;
  resolved: number;
  unresolved: number;
  on_scaffolds: number;
  on_project: number;
}

// ============ TIPOS PARA NOTIFICACIONES IN-APP ============

export type NotificationType =
  | 'new_client_note'
  | 'note_resolved'
  | 'scaffold_updated'
  | 'scaffold_modification_added'
  | 'project_assigned'
  | 'note_urgent'
  | 'system';

export interface InAppNotification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: {
    note_id?: number;
    target_type?: 'scaffold' | 'project';
    scaffold_id?: number;
    project_id?: number;
    created_by?: number;
    resolved_by?: number;
    [key: string]: unknown;
  };
  link?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationStats {
  total: number;
  read: number;
  unread: number;
  types_count: number;
}

// ============ TIPOS PARA RESPUESTAS DE API ============

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
  };
}

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
