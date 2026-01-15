// Tipos para modificaciones de andamios

export interface ScaffoldModification {
  id: number;
  scaffold_id: number;
  created_by: number;
  height: number;
  width: number;
  length: number;
  cubic_meters: number;
  reason?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Datos enriquecidos por joins
  created_by_username?: string;
  created_by_name?: string;
  approved_by_username?: string;
  approved_by_name?: string;
  scaffold_number?: string;
  project_id?: number;
  project_name?: string;
}

export interface CreateScaffoldModificationDTO {
  height: number;
  width: number;
  length: number;
  reason?: string;
}

export interface ApproveModificationDTO {
  // No requiere body, solo ID en URL
}

export interface RejectModificationDTO {
  rejection_reason: string;
}

export interface ScaffoldModificationApiResponse {
  success: boolean;
  message?: string;
  data?: ScaffoldModification;
}

export interface ScaffoldModificationsListApiResponse {
  success: boolean;
  data: ScaffoldModification[];
}

export interface ScaffoldWithModifications {
  id: number;
  scaffold_number: string;
  cubic_meters: number;
  additional_cubic_meters: number;
  total_cubic_meters: number;
  modifications?: ScaffoldModification[];
  pending_modifications_count?: number;
  // ... otros campos del scaffold
}
