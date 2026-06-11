import { get, patch } from './http';
import type { ArticuloTipo, ArticuloEstado, ArticuloEspecialidad, ArticuloCertificacion } from './articulos';

export interface CursorPaginationParams {
  limit?: number;
  cursor?: string;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string | null;
}


export interface InventoryActivoDetailRow {
  id: string;
  codigo?: string;
  nro_serie?: string | null;
  articulo_id?: string;
  articulo_nombre?: string;
  foto_url?: string | null;
  bodega_actual_id?: string | null;
  bodega_nombre?: string | null;
  proyecto_actual_id?: string | null;
  proyecto_nombre?: string | null;
  estado?: string;
  valor?: number | null;
  fecha_vencimiento?: string | null;
  custodia_id?: string | null;
  custodia_estado?: string | null;
  custodia_desde_en?: string | null;
  custodio_trabajador_id?: string | null;
  custodio_nombres?: string | null;
  custodio_apellidos?: string | null;
  custodia_entrega_id?: string | null;
  ultima_entrega_id?: string | null;
  entrega_confirmada_en?: string | null;
  ultima_devolucion_id?: string | null;
  devolucion_confirmada_en?: string | null;
  dias_en_custodia?: number | null;
  fecha_devolucion_esperada?: string | null;
  semaforo_devolucion?: 'verde' | 'amarillo' | 'rojo' | null;
  ultimo_movimiento_tipo?: string | null;
  ultimo_movimiento_fecha?: string | null;
  ultimo_movimiento_origen_nombre?: string | null;
  ultimo_movimiento_destino_nombre?: string | null;
}

export interface InventoryAvailableAssetQueryParams {
  articulo_id: string;
  bodega_id: string;
  search?: string;
  limit?: number;
}

export interface InventoryAvailableAssetRow {
  id: string;
  codigo: string;
  nro_serie?: string | null;
  estado: ArticuloEstado | string;
  articulo_id: string;
  articulo_nombre?: string;
  bodega_actual_id?: string | null;
  bodega_nombre?: string | null;
  proyecto_actual_id?: string | null;
  proyecto_nombre?: string | null;
}

export interface ReturnEligibleAssetQueryParams {
  trabajador_id: string;
  articulo_id?: string;
  search?: string;
  limit?: number;
}

export interface ReturnEligibleAssetRow {
  custodia_id: string;       // renamed from custodia_activo_id
  articulo_id: string;       // was activo_id
  trabajador_id: string;
  desde_en: string;
  nombre: string;
  tipo: ArticuloTipo;
  nro_serie: string;
  codigo: string;
  foto_url?: string | null;
  valor: number;
}

export interface InventoryMovementQueryParams {
  articulo_id?: string;
  tipo?: string;
  entrega_id?: string;
  devolucion_id?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}

// ---- Perfil completo de activo ----

export interface ActivoTimelineEntry {
  id: string;
  tipo: string;
  fecha_movimiento: string;
  notas?: string | null;
  ubicacion_origen_nombre?: string | null;
  ubicacion_destino_nombre?: string | null;
  entrega_id?: string | null;
  devolucion_id?: string | null;
  responsable_email?: string | null;
  estado_entrega?: string | null;
  estado_devolucion?: string | null;
}

export interface ActivoCustodiaEntry {
  id: string;
  trabajador_id: string;
  entrega_id?: string | null;
  ubicacion_destino_id?: string | null;
  desde_en: string;
  hasta_en?: string | null;
  estado: string;
  custodio_nombres: string;
  custodio_apellidos: string;
  custodia_ubicacion_nombre?: string | null;
  dias_en_custodia?: number | null;
}

export interface ActivoProfileResponse {
  id: string;
  tipo: ArticuloTipo;
  nombre: string;
  codigo: string;
  nro_serie: string;
  marca?: string | null;
  modelo?: string | null;
  descripcion?: string | null;
  estado: ArticuloEstado;
  foto_url?: string | null;
  bodega_actual_id?: string | null;
  bodega_nombre?: string | null;
  proyecto_actual_id?: string | null;
  proyecto_nombre?: string | null;
  fecha_vencimiento?: string | null;
  fecha_compra?: string | null;
  proveedor_id?: string | null;
  proveedor_nombre?: string | null;
  factura_url?: string | null;
  manual_url?: string | null;
  especialidades: ArticuloEspecialidad[];
  certificaciones: ArticuloCertificacion[];
  valor: number;
  creado_en: string;
  custodia_activa?: ActivoCustodiaEntry | null;
  timeline: ActivoTimelineEntry[];
  custodias: ActivoCustodiaEntry[];
  estadisticas: {
    total_entregas: number;
    total_devoluciones: number;
    dias_total_custodia: number;
  };
  alerta_devolucion?: boolean;
}

export const getActivoProfile = (id: string) =>
  get<ActivoProfileResponse>(`/inventario/activos/${id}/perfil`);

// ── Gestión de activos ─────────────────────────────────────
// Use CambiarEstadoArticuloPayload + cambiarEstadoArticulo for new code
export interface CambiarEstadoActivoPayload {
  nuevo_estado: string;
  motivo: string;
  bodega_destino_id?: string;
}

export interface ReubicarActivoPayload {
  bodega_destino_id: string;
  motivo?: string;
}

export const cambiarEstadoActivo = (id: string, payload: CambiarEstadoActivoPayload) =>
  patch<{ id: string; estado: string; bodega_actual_id: string }>(`/inventario/activos/${id}/estado`, payload);

export const reubicarActivo = (id: string, payload: ReubicarActivoPayload) =>
  patch<{ id: string; bodega_actual_id: string }>(`/inventario/activos/${id}/reubicar`, payload);

export const getInventoryAvailableAssets = (params: InventoryAvailableAssetQueryParams) =>
  get<InventoryAvailableAssetRow[]>('/inventario/activos-disponibles', params);

export const getReturnEligibleAssets = (params: ReturnEligibleAssetQueryParams) =>
  get<ReturnEligibleAssetRow[]>('/devoluciones/activos-elegibles', params);
