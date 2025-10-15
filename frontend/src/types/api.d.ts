export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'technician';
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
}

export interface Client {
  id: number;
  name: string;
  contact_info: string;
}

export interface Scaffold {
  id: number;
  project_id?: number;
  assembly_image_url: string;
  cubic_meters: number;
  user_name: string;
  assembly_created_at: string;
  status: 'assembled' | 'disassembled';
  project_name?: string;
  height: number;
  width: number;
  depth: number;
  progress_percentage: number;
  assembly_notes: string;
  disassembly_image_url?: string;
  disassembled_at?: string;
  disassembly_notes?: string;
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
