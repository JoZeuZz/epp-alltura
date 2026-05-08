// ─── Usuario / Autenticación ─────────────────────────────────────────────────

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'supervisor';
  password?: string;
  created_at: string;
  rut?: string;
  phone_number?: string;
  profile_picture_url?: string;
}

// ─── Entidades de Equipos y Herramientas ─────────────────────────────────────

export interface Persona {
  id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  foto_url?: string;
  estado: 'activo' | 'inactivo';
  created_at: string;
  updated_at: string;
}

export interface Trabajador extends Persona {
  cargo?: string;
  fecha_ingreso?: string;
}

export interface Ubicacion {
  id: string;
  nombre: string;
  tipo?: string;
  estado?: 'activo' | 'inactivo';
  activo: boolean;
  created_at: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  rut?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  created_at: string;
}

export interface Articulo {
  id: string;
  grupo_principal: 'epp' | 'equipo' | 'herramienta';
  subclasificacion:
    | 'epp'
    | 'medicion_ensayos'
    | 'manual'
    | 'electrica_cable'
    | 'inalambrica_bateria';
  especialidades: Array<
    'oocc' | 'ooee' | 'equipos' | 'trabajos_verticales_lineas_de_vida'
  >;
  nombre: string;
  marca: string;
  modelo: string;
  unidad_medida?: string;
  estado?: 'activo' | 'inactivo';
  /** URL servida por /api/image-proxy */
  imagen_url?: string;
  activo?: boolean;
  created_at: string;
}

export interface Activo {
  id: string;
  articulo_id: string;
  codigo: string;
  codigo_activo?: string;
  talla?: string;
  estado: 'en_stock' | 'asignado' | 'mantencion' | 'dado_de_baja' | 'perdido';
  ubicacion_actual_id?: string;
  notas?: string;
  created_at: string;
  /** Campos JOIN frecuentes */
  articulo_nombre?: string;
  ubicacion_nombre?: string;
}

export interface Stock {
  id: string;
  articulo_id: string;
  ubicacion_id: string;
  cantidad_disponible?: number;
  cantidad_reservada?: number;
  cantidad?: number;
  created_at: string;
  updated_at: string;
  /** Campos JOIN */
  articulo_nombre?: string;
  ubicacion_nombre?: string;
}

// ─── Entregas ─────────────────────────────────────────────────────────────────

export type EntregaTipo = 'entrega';
export type EntregaEstado =
  | 'borrador'
  | 'pendiente_firma'
  | 'confirmada'
  | 'anulada'
  | 'revertida_admin';

export interface Entrega {
  id: string;
  trabajador_id: string;
  ubicacion_origen_id?: string;
  ubicacion_destino_id?: string;
  usuario_bod_id?: string;
  tipo: EntregaTipo;
  estado: EntregaEstado;
  nota_destino?: string;
  creado_en?: string;
  confirmada_en?: string;
  firmado_en?: string;
  cantidad_items?: number;
  /** Campos JOIN */
  trabajador_nombres?: string;
  trabajador_apellidos?: string;
  trabajador_rut?: string;
  ubicacion_origen_nombre?: string;
  ubicacion_destino_nombre?: string;
}

export interface EntregaDetalle {
  id: string;
  entrega_id: string;
  articulo_id?: string;
  activo_id?: string;
  activo_ids?: string[];
  cantidad: number;
  condicion_salida?: string;
  notas?: string;
  /** Campos JOIN */
  articulo_nombre?: string;
  articulo_tipo?: 'epp' | 'equipo' | 'herramienta' | 'activo';
  activo_codigo?: string;
}

// ─── Firmas ───────────────────────────────────────────────────────────────────

// ─── Respuestas de error API ──────────────────────────────────────────────────

export interface ApiErrorResponse {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  errors?: Array<{ field: string; message: string }>;
}

export interface ApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    statusText?: string;
  };
  message?: string;
}
