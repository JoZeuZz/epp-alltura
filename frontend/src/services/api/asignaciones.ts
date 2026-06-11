import { get, post, postForm } from './http';
import type { Articulo, ArticuloTipo } from './articulos';
import type { EntregaRow } from './entregas';

// ─── Asignaciones a usuarios de sistema ───────────────────────────────────────

export interface AsignacionUsuario {
  id: string;
  articulo_id: string;
  usuario_id: string;
  asignado_por_usuario_id: string;
  bodega_origen_id: string | null;
  usuario_origen_id: string | null;
  estado: 'activa' | 'cerrada' | 'anulada';
  desde_en: string;
  hasta_en: string | null;
  motivo_cierre: string | null;
  notas: string | null;
  asignado_por_nombre?: string;
}

export interface ArticuloAsignado extends Pick<Articulo,
  'id' | 'tipo' | 'nombre' | 'marca' | 'modelo' | 'codigo' | 'nro_serie' |
  'estado' | 'valor' | 'foto_url' | 'fecha_vencimiento'
> {
  asignacion_id: string;
  asignado_en: string;
  asignacion_notas: string | null;
  bodega_origen_nombre: string | null;
  asignado_por_nombre: string | null;
}

export interface MisAsignacionesResponse {
  items: ArticuloAsignado[];
  total: number;
}

export interface AssignArticulosPayload {
  usuario_id: string;
  articulo_ids: string[];
  origen_tipo: 'bodega' | 'usuario';
  bodega_origen_id?: string;
  notas?: string;
}

export interface DeliverAssignedPayload {
  trabajador_id: string;
  proyecto_destino_id: string;
  articulo_ids: string[];
  nota_destino?: string;
  fecha_devolucion_esperada?: string;
  evidencia_foto_url?: string;
}

export interface ReturnToBodegaPayload {
  articulo_ids: string[];
  bodega_destino_id: string;
  notas?: string;
}

export interface AsignacionHistorialResponse {
  items: (AsignacionUsuario & {
    articulo_nombre: string;
    codigo: string;
    articulo_tipo: ArticuloTipo;
    bodega_origen_nombre: string | null;
    asignado_por_nombre: string;
  })[];
  total: number;
}

export interface MisAsignacionesQueryParams {
  tipo?: ArticuloTipo;
  search?: string;
  limit?: number;
  offset?: number;
}

export const getMisAsignacionesUsuario = (params?: MisAsignacionesQueryParams) =>
  get<MisAsignacionesResponse>('/asignaciones-usuario/mias', params);

export const assignArticulosToUsuario = (payload: AssignArticulosPayload) =>
  post<{ ok: boolean; asignaciones_creadas: number; ids: string[] }>(
    '/asignaciones-usuario',
    payload
  );

export const deliverAssignedArticulosToTrabajador = (
  payload: DeliverAssignedPayload,
  imageFile?: File
) => {
  if (imageFile) {
    const form = new FormData();
    form.append('foto', imageFile);
    form.append('trabajador_id', payload.trabajador_id);
    form.append('proyecto_destino_id', payload.proyecto_destino_id);
    payload.articulo_ids.forEach((id) => form.append('articulo_ids[]', id));
    if (payload.nota_destino) form.append('nota_destino', payload.nota_destino);
    if (payload.fecha_devolucion_esperada) form.append('fecha_devolucion_esperada', payload.fecha_devolucion_esperada);
    return postForm<EntregaRow>('/asignaciones-usuario/entregar-a-trabajador', form);
  }
  return post<EntregaRow>('/asignaciones-usuario/entregar-a-trabajador', payload);
};

export const returnAssignedArticulosToBodega = (payload: ReturnToBodegaPayload) =>
  post<{ ok: boolean; cerradas: number }>('/asignaciones-usuario/devolver-bodega', payload);

export const getUserAssignmentHistory = (userId: string, params?: { limit?: number; offset?: number }) =>
  get<AsignacionHistorialResponse>(`/users/${userId}/asignaciones`, params);
