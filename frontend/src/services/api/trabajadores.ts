import { get, post, put } from './http';
import type { ArticuloTipo, ArticuloEstado } from './articulos';

// ── Perfil Trabajador ──────────────────────────────────────
export interface TrabajadorCustodiaRow {
  custodia_id: string;
  articulo_id: string;
  entrega_id: string;
  desde_en: string;
  fecha_devolucion_esperada: string | null;
  codigo: string;
  nro_serie: string;
  estado: ArticuloEstado;
  nombre: string;
  tipo: ArticuloTipo;
  bodega_nombre?: string | null;
  proyecto_nombre?: string | null;
  alerta_devolucion?: boolean;
  dias_en_custodia: number;
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'sin_plazo';
  dias_restantes: number | null;
}

export interface TrabajadorProfileResponse {
  id: string;
  persona_id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  cargo?: string;
  fecha_ingreso?: string;
  estado: string;
  foto_url?: string | null;
  custodias: TrabajadorCustodiaRow[];
  stats: {
    activos_en_custodia: number;
    total_custodias: number;
    total_entregas: number;
    dias_promedio_custodia: number;
    activos_vencidos_o_proximos: number;
  };
}

export const getTrabajadorProfile = (id: string) =>
  get<TrabajadorProfileResponse>(`/trabajadores/${id}/profile`);

export interface TrabajadorActaRow {
  entrega_id: string;
  entrega_fecha: string;
  articulo_codigo: string;
  articulo_nombre: string;
  articulo_tipo: string | null;
  es_activo: boolean;
  devolucion_id: string | null;
  devolucion_fecha: string | null;
}

export const getTrabajadorActas = (id: string) =>
  get<TrabajadorActaRow[]>(`/trabajadores/${id}/actas`);

// ── Crear / actualizar (con foto opcional) ─────────────────
export interface TrabajadorPayload {
  rut?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  cargo?: string;
  fecha_ingreso?: string;
  estado?: 'activo' | 'inactivo';
  persona_estado?: 'activo' | 'inactivo';
}

export interface Trabajador extends TrabajadorPayload {
  id: string;
  persona_id: string;
  foto_url?: string | null;
}

const buildTrabajadorBody = (payload: TrabajadorPayload, foto?: File | null): TrabajadorPayload | FormData => {
  if (!foto) return payload;
  const fd = new FormData();
  fd.append('payload', JSON.stringify(payload));
  fd.append('foto', foto);
  return fd;
};

export const createTrabajador = (payload: TrabajadorPayload, foto?: File | null) =>
  post<Trabajador>('/trabajadores', buildTrabajadorBody(payload, foto));

export const updateTrabajador = (id: string, payload: TrabajadorPayload, foto?: File | null) =>
  put<Trabajador>(`/trabajadores/${id}`, buildTrabajadorBody(payload, foto));
