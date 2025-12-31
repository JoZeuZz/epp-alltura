export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'client'; // Actualizado: agregado 'client', cambiado 'technician' a 'supervisor'
  password?: string;
  created_at: string;
  rut?: string;
  phone_number?: string;
  profile_picture_url?: string;
}

export interface Project {
  id: number;
  client_id: number;
  name: string;
  status: 'active' | 'inactive' | 'completed';
  created_at: string;
  client_name: string;
  assigned_client_id?: number; // Nuevo: ID del usuario cliente asignado
  assigned_client_name?: string; // Nuevo: Nombre del cliente asignado
  assigned_client_email?: string; // Nuevo: Email del cliente asignado
  assigned_supervisor_id?: number; // Nuevo: ID del supervisor asignado (antes assignedTechnicianId)
  assigned_supervisor_name?: string; // Nuevo: Nombre del supervisor asignado
  assigned_supervisor_email?: string; // Nuevo: Email del supervisor asignado
}

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  specialty?: string;
}

export interface Scaffold {
  id: number;
  project_id?: number;
  // Nuevos campos de estado
  card_status: 'green' | 'red'; // Nuevo: estado de la tarjeta
  assembly_status: 'assembled' | 'disassembled'; // Nuevo: estado de armado
  initial_image: string; // Nuevo: imagen inicial obligatoria (antes assembly_image_url)
  disassembly_image?: string; // Nuevo: imagen de desarmado (nullable)
  created_by?: number; // Nuevo: ID del usuario que creó el andamio
  created_by_name?: string; // Nuevo: Nombre del usuario que creó el andamio
  // Campos existentes
  assembly_image_url: string; // Mantener por compatibilidad (apuntará a initial_image)
  cubic_meters: number;
  user_name: string;
  assembly_created_at: string;
  status: 'assembled' | 'disassembled'; // Deprecado: usar assembly_status
  created_at?: string; // Nuevo: timestamp de creación del andamio
  updated_at?: string; // Nuevo: timestamp de última actualización
  project_name?: string;
  scaffold_number?: string;
  area?: string;
  tag?: string;
  height: number;
  width: number;
  length: number;
  depth: number;
  progress_percentage: number;
  assembly_notes: string;
  location?: string;
  observations?: string;
  disassembly_image_url?: string; // Deprecado: usar disassembly_image
  disassembled_at?: string;
  disassembly_notes?: string;
  user_id?: number; // Nuevo: ID del usuario asociado al andamio
}

export interface Report {
  id: number;
  assembly_image_url: string;
  user_name: string;
  cubic_meters: number;
  assembly_created_at: string;
  progress_percentage: number;
  assembly_notes?: string;
}

/**
 * Nuevo: Interface para el historial de modificaciones de andamios
 * Registra todos los cambios realizados en un andamio
 */
export interface ScaffoldHistory {
  id: number;
  scaffold_id: number;
  modified_by: number;
  modified_by_name?: string;
  modified_by_email?: string;
  modified_at: string;
  change_type: string; // Tipo de cambio: 'card_status', 'assembly_status', 'update', 'dimensions', etc.
  previous_data: Record<string, any>; // JSON con datos anteriores
  new_data: Record<string, any>; // JSON con datos nuevos
  description: string; // Descripción legible del cambio
}

/**
 * Interface para estadísticas del dashboard
 */
export interface DashboardStats {
  assembled_cubic_meters: number;
  disassembled_cubic_meters: number;
  total_cubic_meters: number;
}
