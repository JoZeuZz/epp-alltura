import { get, post } from './apiService';

export type DevEntity = 'articulos' | 'trabajadores' | 'proyectos' | 'bodegas';

export interface DevExportResponse {
  entity: DevEntity;
  count: number;
  exported_at: string;
  data: unknown[];
}

export interface DevImportResponse {
  entity: DevEntity;
  inserted: number;
  updated: number;
  errors: Array<{ id: string; error: string }>;
}

export async function exportEntity(entity: DevEntity): Promise<void> {
  const result = await get<DevExportResponse>(`/dev/export/${entity}`);
  const date = new Date().toISOString().split('T')[0];
  const filename = `epp-alltura-${entity}-${date}.json`;
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importEntity(
  entity: DevEntity,
  data: unknown[]
): Promise<DevImportResponse> {
  return post<DevImportResponse>(`/dev/import/${entity}`, { data });
}

export function readJsonFile(file: File): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const rows = Array.isArray(parsed) ? parsed : parsed?.data;
        if (!Array.isArray(rows)) {
          reject(new Error('JSON debe ser un array o tener campo "data" array'));
          return;
        }
        resolve(rows);
      } catch {
        reject(new Error('Archivo JSON inválido'));
      }
    };
    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsText(file);
  });
}
