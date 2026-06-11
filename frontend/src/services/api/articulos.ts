import { get, post, put, del } from './http';

export type ArticuloTipo = 'epp' | 'herramienta' | 'equipo';
export type ArticuloEstado = 'en_stock' | 'asignado' | 'mantencion' | 'dado_de_baja' | 'perdido';
export type ArticuloEspecialidad =
  | 'oocc'
  | 'ooee'
  | 'equipos'
  | 'trabajos_verticales_lineas_de_vida';

export interface ArticuloCertificacion {
  id: string;
  nombre?: string | null;
  url: string;
  creado_en: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  rut?: string | null;
  email?: string | null;
  telefono?: string | null;
  estado: string;
}

export interface Articulo {
  id: string;
  tipo: ArticuloTipo;
  nombre: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  nro_serie?: string | null;
  plantilla_id?: string | null;
  codigo: string;
  valor: number;
  foto_url?: string | null;
  foto_color_dominante?: string | null;
  estado: ArticuloEstado;
  bodega_actual_id?: string | null;
  bodega_nombre?: string | null;
  proyecto_actual_id?: string | null;
  proyecto_nombre?: string | null;
  proyecto_estado?: 'activo' | 'inactivo' | 'finalizado' | null;
  alerta_devolucion?: boolean;
  usuario_actual_id?: string | null;
  usuario_actual_nombre?: string | null;
  especialidades: ArticuloEspecialidad[];
  fecha_vencimiento?: string | null;
  fecha_compra?: string | null;
  proveedor_id?: string | null;
  proveedor_nombre?: string | null;
  factura_url?: string | null;
  manual_url?: string | null;
  certificaciones?: ArticuloCertificacion[];
  creado_en: string;
  creado_por_email?: string | null;
}

export interface ArticuloQueryParams {
  tipo?: ArticuloTipo;
  estado?: ArticuloEstado;
  bodega_id?: string;
  proyecto_id?: string;
  especialidad?: ArticuloEspecialidad;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ArticuloCreatePayload {
  tipo: ArticuloTipo;
  nombre: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  nro_serie?: string;
  plantilla_id?: string;
  valor?: number;
  bodega_id: string;
  especialidades?: ArticuloEspecialidad[];
  fecha_vencimiento?: string;
  fecha_compra?: string;
  proveedor_id?: string;
  manual_url?: string;
}

export interface ArticuloUpdatePayload {
  id: string;
  nombre?: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  nro_serie?: string;
  valor?: number;
  especialidades?: ArticuloEspecialidad[];
  fecha_vencimiento?: string | null;
  fecha_compra?: string | null;
  proveedor_id?: string | null;
  manual_url?: string | null;
}

export interface CambiarEstadoArticuloPayload {
  nuevo_estado: 'en_stock' | 'mantencion' | 'dado_de_baja' | 'perdido';
  motivo?: string;
  bodega_destino_id?: string;
}

export interface ArticleFiles {
  foto?: File;
  factura?: File;
  manual?: File;
}

function buildArticleFormData<T extends object>(data: T, files: ArticleFiles): T | FormData {
  const hasFiles = files.foto || files.factura || files.manual;
  if (!hasFiles) return data;
  const fd = new FormData();
  fd.append('payload', JSON.stringify(data));
  if (files.foto)    fd.append('foto',    files.foto);
  if (files.factura) fd.append('factura', files.factura);
  if (files.manual)  fd.append('manual',  files.manual);
  return fd;
}

export const getArticulos = (params?: ArticuloQueryParams) =>
  get<{ items: Articulo[]; total: number }>('/articulos', params);
export const getArticuloById = (id: string) =>
  get<Articulo>(`/articulos/${id}`);
export const createArticulo = (payload: ArticuloCreatePayload, files: ArticleFiles = {}) =>
  post<Articulo>('/articulos', buildArticleFormData(payload, files));
export const updateArticulo = ({ id, ...payload }: ArticuloUpdatePayload, files: ArticleFiles = {}) =>
  put<Articulo>(`/articulos/${id}`, buildArticleFormData(payload, files));
export const addCertificacion = (articuloId: string, file: File, nombre?: string) => {
  const fd = new FormData();
  fd.append('certificacion', file);
  if (nombre) fd.append('nombre', nombre);
  return post<Articulo>(`/articulos/${articuloId}/certificaciones`, fd);
};
export const deleteCertificacion = (articuloId: string, certId: string) =>
  del<Articulo>(`/articulos/${articuloId}/certificaciones/${certId}`);
export const deleteArticulo = (id: string) =>
  del<{ message: string }>(`/articulos/${id}`);
export const getProveedores = () =>
  get<Proveedor[]>('/proveedores');
export const createProveedor = (payload: { nombre: string; rut?: string; email?: string; telefono?: string }) =>
  post<Proveedor>('/proveedores', payload);
export const cambiarEstadoArticulo = (id: string, payload: CambiarEstadoArticuloPayload) =>
  post<Articulo>(`/articulos/${id}/estado`, payload);
