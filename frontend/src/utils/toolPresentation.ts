import type { InventoryActivoDetailRow } from '../services/apiService';
import { formatCLP } from './currency';

export type ToolRawStatus = string;

export type ToolVisualStatus =
  | 'available'
  | 'assigned'
  | 'maintenance'
  | 'decommissioned'
  | 'lost'
  | 'damaged'
  | 'unknown';

export interface ToolActionFlags {
  canAssign: boolean;
  canReturn: boolean;
  canRelocate: boolean;
  canChangeStatus: boolean;
  canEdit: boolean;
}

/**
 * Shape tolerante: mezcla del tipo canónico y variantes observadas en respuestas API.
 */
export interface ToolPresentationSource extends Partial<Omit<InventoryActivoDetailRow, 'articulo_nombre'>> {
  codigo_activo?: string | null;
  asset_code?: string | null;
  nombre?: string | null;
  articulo?: { nombre?: string | null } | null;
  articulo_nombre?: string | null;
  serie?: string | null;
  serial?: string | null;
  numero_serie?: string | null;
  ubicacion_actual_nombre?: string | null;
  location_name?: string | null;
  responsable_nombre?: string | null;
  trabajador_nombres?: string | null;
  trabajador_apellidos?: string | null;
  assigned_to_name?: string | null;
  valor_monetario?: number | string | null;
  costo_unitario?: number | string | null;
  status?: string | null;
}

const STATUS_LABELS: Record<ToolVisualStatus, string> = {
  available: 'Disponible',
  assigned: 'Asignado',
  maintenance: 'Mantención',
  decommissioned: 'Dado de baja',
  lost: 'Perdido',
  damaged: 'Dañado',
  unknown: 'Estado desconocido',
};

const STATUS_BADGE_CLASSES: Record<ToolVisualStatus, string> = {
  available: 'bg-green-100 text-green-800 border-green-300',
  assigned: 'bg-blue-100 text-blue-800 border-blue-300',
  maintenance: 'bg-amber-100 text-amber-800 border-amber-300',
  decommissioned: 'bg-red-100 text-red-800 border-red-300',
  lost: 'bg-gray-200 text-gray-800 border-gray-400',
  damaged: 'bg-orange-100 text-orange-800 border-orange-300',
  unknown: 'bg-slate-100 text-slate-800 border-slate-300',
};

const STATUS_DOT_CLASSES: Record<ToolVisualStatus, string> = {
  available: 'bg-green-500',
  assigned: 'bg-blue-500',
  maintenance: 'bg-amber-500',
  decommissioned: 'bg-red-500',
  lost: 'bg-gray-500',
  damaged: 'bg-orange-500',
  unknown: 'bg-slate-400',
};

const safeText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const safeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const getToolVisibleCode = (tool: ToolPresentationSource): string => {
  const code =
    safeText(tool.codigo) ||
    safeText(tool.codigo_activo) ||
    safeText(tool.asset_code) ||
    safeText(tool.nro_serie) ||
    safeText(tool.serie) ||
    safeText(tool.serial) ||
    safeText(tool.numero_serie) ||
    safeText(tool.id);

  return code || 'Sin código';
};

export const getToolVisibleName = (tool: ToolPresentationSource): string => {
  const name =
    safeText(tool.articulo_nombre) ||
    safeText(tool.nombre) ||
    safeText(tool.articulo?.nombre);

  return name || 'Herramienta sin nombre';
};

export const getToolVisibleSerial = (tool: ToolPresentationSource): string | null => {
  const serial =
    safeText(tool.nro_serie) || safeText(tool.serie) || safeText(tool.serial) || safeText(tool.numero_serie);

  return serial || null;
};

export const getToolVisibleLocation = (tool: ToolPresentationSource): string => {
  // Compatibilidad: algunas respuestas devuelven ubicación en custodias y otras en activo actual.
  const location =
    safeText(tool.ubicacion_nombre) ||
    safeText(tool.custodia_ubicacion_nombre) ||
    safeText(tool.ubicacion_actual_nombre) ||
    safeText(tool.location_name);

  return location || 'Sin ubicación';
};

export const getToolVisibleResponsible = (tool: ToolPresentationSource): string => {
  const direct = safeText(tool.responsable_nombre) || safeText(tool.assigned_to_name);
  if (direct) return direct;

  const custodioNombre = safeText(tool.custodio_nombres);
  const custodioApellido = safeText(tool.custodio_apellidos);
  if (custodioNombre || custodioApellido) {
    return `${custodioNombre} ${custodioApellido}`.trim();
  }

  const trabajadorNombre = safeText(tool.trabajador_nombres);
  const trabajadorApellido = safeText(tool.trabajador_apellidos);
  if (trabajadorNombre || trabajadorApellido) {
    return `${trabajadorNombre} ${trabajadorApellido}`.trim();
  }

  return 'Sin responsable';
};

export const getToolVisibleMonetaryValue = (tool: ToolPresentationSource): string => {
  const value = safeNumber(tool.valor ?? tool.valor_monetario ?? tool.costo_unitario);
  if (value == null) return 'Sin valor registrado';
  return formatCLP(value);
};

export const getToolRawStatus = (tool: ToolPresentationSource): ToolRawStatus => {
  return safeText(tool.estado) || safeText(tool.status) || 'desconocido';
};

export const toToolVisualStatus = (rawStatus: string): ToolVisualStatus => {
  const normalized = safeText(rawStatus).toLowerCase();

  if (!normalized) return 'unknown';

  if (['en_stock', 'stock', 'disponible', 'available'].includes(normalized)) {
    return 'available';
  }

  if (['asignado', 'entregado', 'en_uso', 'assigned', 'in_use'].includes(normalized)) {
    return 'assigned';
  }

  if (['mantencion', 'mantenimiento', 'maintenance'].includes(normalized)) {
    return 'maintenance';
  }

  if (['dado_de_baja', 'baja', 'decommissioned'].includes(normalized)) {
    return 'decommissioned';
  }

  if (['perdido', 'lost'].includes(normalized)) {
    return 'lost';
  }

  if (['danado', 'dañado', 'damaged'].includes(normalized)) {
    return 'damaged';
  }

  return 'unknown';
};

export const getToolStatusLabel = (rawStatus: string): string => {
  const visualStatus = toToolVisualStatus(rawStatus);
  if (visualStatus !== 'unknown') {
    return STATUS_LABELS[visualStatus];
  }

  const cleaned = safeText(rawStatus);
  return cleaned || STATUS_LABELS.unknown;
};

export const getToolStatusBadgeClasses = (rawStatus: string): string => {
  return STATUS_BADGE_CLASSES[toToolVisualStatus(rawStatus)];
};

export const getToolStatusDotClasses = (rawStatus: string): string => {
  return STATUS_DOT_CLASSES[toToolVisualStatus(rawStatus)];
};

export const getToolActionFlags = (tool: ToolPresentationSource): ToolActionFlags => {
  const rawStatus = getToolRawStatus(tool).toLowerCase();
  const visualStatus = toToolVisualStatus(rawStatus);
  const hasActiveCustody = Boolean(tool.custodia_id || tool.custodia_estado || tool.custodio_trabajador_id);

  return {
    canAssign: visualStatus === 'available',
    canReturn: visualStatus === 'assigned' || hasActiveCustody,
    canRelocate: rawStatus === 'en_stock',
    canChangeStatus: rawStatus !== 'asignado',
    canEdit: true,
  };
};
