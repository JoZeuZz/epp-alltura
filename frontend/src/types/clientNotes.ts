export interface InAppNotificationMetadata {
  project_id?: number | string;
  scaffold_id?: number | string;
  [key: string]: unknown;
}

export interface InAppNotification {
  id: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: InAppNotificationMetadata | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  total: number;
  read: number;
  unread: number;
  types_count: number;
}
