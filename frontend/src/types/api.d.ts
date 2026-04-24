// ─── Usuario / Autenticación ─────────────────────────────────────────────────

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'bodega' | 'worker' | 'trabajador';
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
  /** UUID del registro en tabla trabajador */
  trabajador_id: string;
  usuario_id?: string;
  cargo?: string;
  fecha_ingreso?: string;
  /** Email asociado al login de usuario (si tiene cuenta) */
  email_login?: string;
}

export interface Ubicacion {
  id: string;
  nombre: string;
  descripcion?: string;
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
  grupo_principal: 'equipo' | 'herramienta';
  subclasificacion:
    | 'epp'
    | 'medicion_ensayos'
    | 'manual'
    | 'electrica_cable'
    | 'inalambrica_bateria';
  especialidades: Array<
    'oocc' | 'ooee' | 'andamios' | 'trabajos_verticales_lineas_de_vida'
  >;
  nombre: string;
  marca: string;
  modelo: string;
  unidad_medida?: string;
  requiere_talla?: boolean;
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
  created_at?: string;
  updated_at?: string;
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
  articulo_tipo?: 'equipo' | 'herramienta' | 'activo';
  activo_codigo?: string;
}

// ─── Firmas ───────────────────────────────────────────────────────────────────

export interface FirmaEntrega {
  id: string;
  entrega_id: string;
  trabajador_id: string;
  metodo: 'en_dispositivo' | 'qr_link';
  firma_imagen_url?: string;
  texto_aceptacion?: string;
  ip_firmante?: string;
  firmado_en: string;
}

export interface FirmaToken {
  id: string;
  entrega_id: string;
  token_hash: string;
  expira_en: string;
  usado_en?: string;
  created_at: string;
}

// ─── Custodia / Devoluciones ──────────────────────────────────────────────────

export type CustodiaEstado =
  | 'activa'
  | 'devuelta'
  | 'baja'
  | 'perdida'
  | 'mantencion';

export interface CustodiaActivo {
  id: string;
  activo_id: string;
  trabajador_id: string;
  entrega_detalle_id?: string;
  ubicacion_destino_id?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: CustodiaEstado;
  /** Campos JOIN */
  activo_codigo?: string;
  articulo_nombre?: string;
  trabajador_nombres?: string;
  trabajador_apellidos?: string;
  ubicacion_destino_nombre?: string;
}

export interface Devolucion {
  id: string;
  trabajador_id: string;
  usuario_bod_id?: string;
  supervisor_id?: string;
  estado: 'borrador' | 'pendiente_firma' | 'confirmada' | 'anulada';
  notas?: string;
  created_at?: string;
  updated_at?: string;
  creado_en?: string;
  confirmada_en?: string;
  /** Campos JOIN */
  trabajador_nombres?: string;
  trabajador_apellidos?: string;
}

export interface DevolucionDetalle {
  id: string;
  devolucion_id: string;
  activo_id?: string;
  activo_ids?: string[];
  articulo_id?: string;
  cantidad?: number;
  condicion_entrada?: 'ok' | 'usado' | 'danado' | 'perdido';
  disposicion?: 'devuelto' | 'perdido' | 'baja' | 'mantencion';
  notas?: string;
  /** Campos JOIN */
  articulo_nombre?: string;
  activo_codigo?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_trabajadores: number;
  entregas_pendientes: number;
  entregas_firmadas: number;
  activos_en_uso: number;
  activos_disponibles: number;
  devoluciones_pendientes: number;
  stock_bajo?: number;
}

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
