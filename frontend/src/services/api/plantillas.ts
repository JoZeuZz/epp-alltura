import { get, post, patch, uploadWithProgress } from './http';
import type { ArticuloTipo, ArticuloEspecialidad } from './articulos';

// ─── Plantillas ───────────────────────────────────────────────────────────────

export interface PlantillaCert {
  id: string;
  nombre?: string | null;
  url: string;
  creado_en: string;
}

export interface Plantilla {
  id: string;
  tipo: ArticuloTipo;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  descripcion?: string | null;
  foto_url?: string | null;
  manual_url?: string | null;
  estado: 'activo' | 'inactivo';
  especialidades: ArticuloEspecialidad[];
  certificaciones: PlantillaCert[];
  creado_en: string;
}

export interface PlantillaWithCount extends Plantilla {
  instance_count: number;
}

export interface PlantillaCreatePayload {
  tipo: ArticuloTipo;
  nombre: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  especialidades?: ArticuloEspecialidad[];
  manual_url?: string;
}

export interface BatchInstancia {
  nro_serie?: string;
  valor: number;
  fecha_compra?: string;
  fecha_vencimiento?: string;
  proveedor_id?: string;
}

export interface BatchCreatePayload {
  plantilla_id: string;
  bodega_id: string;
  instancias: BatchInstancia[];
}

export interface BatchResult {
  created: number;
  ids: string[];
}

// ─── Plantillas API ───────────────────────────────────────────────────────────

export const getPlantillas = (tipo?: ArticuloTipo): Promise<Plantilla[]> =>
  get<Plantilla[]>('/plantillas', tipo ? { tipo } : undefined);

export const getPlantilla = (id: string): Promise<PlantillaWithCount> =>
  get<PlantillaWithCount>(`/plantillas/${id}`);

export const createPlantilla = (
  data: PlantillaCreatePayload,
  files?: { foto?: File; manual?: File }
): Promise<PlantillaWithCount> => {
  if (!files?.foto && !files?.manual) return post<PlantillaWithCount>('/plantillas', data);
  const fd = new FormData();
  fd.append('payload', JSON.stringify(data));
  if (files.foto)   fd.append('foto', files.foto);
  if (files.manual) fd.append('manual', files.manual);
  return uploadWithProgress<PlantillaWithCount>('post', '/plantillas', fd);
};

export const updatePlantilla = (
  id: string,
  data: Partial<PlantillaCreatePayload>,
  files?: { foto?: File; manual?: File }
): Promise<PlantillaWithCount> => {
  if (!files?.foto && !files?.manual) return patch<PlantillaWithCount>(`/plantillas/${id}`, data);
  const fd = new FormData();
  fd.append('payload', JSON.stringify(data));
  if (files.foto)   fd.append('foto', files.foto);
  if (files.manual) fd.append('manual', files.manual);
  return uploadWithProgress<PlantillaWithCount>('patch', `/plantillas/${id}`, fd);
};

export const addCertificacionPlantilla = (
  plantillaId: string,
  file: File,
  nombre: string
): Promise<Plantilla> => {
  const fd = new FormData();
  fd.append('certificacion', file);
  fd.append('nombre', nombre);
  return uploadWithProgress<Plantilla>('post', `/plantillas/${plantillaId}/certificaciones`, fd);
};

// ─── Batch ────────────────────────────────────────────────────────────────────

export const createArticulosBatch = (
  data: BatchCreatePayload,
  fotoFile?: File
): Promise<BatchResult> => {
  if (!fotoFile) return post<BatchResult>('/articulos/batch', data);
  const fd = new FormData();
  fd.append('payload', JSON.stringify(data));
  fd.append('foto', fotoFile);
  return uploadWithProgress<BatchResult>('post', '/articulos/batch', fd);
};
