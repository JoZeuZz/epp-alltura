import React from 'react';
import { ResponsiveTable } from '@jozeuzz/alltura-ui';
import type { TableColumn } from '@jozeuzz/alltura-ui';
import type { Articulo, ArticuloEstado } from '../../../services/apiService';
import { formatCLP } from '../../../utils/currency';

const ESTADO_BADGE: Record<ArticuloEstado, { label: string; classes: string }> = {
  en_stock: { label: 'En stock', classes: 'bg-green-100 text-green-800' },
  asignado: { label: 'Asignado', classes: 'bg-blue-100 text-blue-800' },
  mantencion: { label: 'Mantención', classes: 'bg-yellow-100 text-yellow-800' },
  dado_de_baja: { label: 'Dado de baja', classes: 'bg-gray-100 text-gray-600' },
  perdido: { label: 'Perdido', classes: 'bg-red-100 text-red-800' },
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
};

const renderVence = (fecha: string | null | undefined): React.ReactNode => {
  if (!fecha) return '—';
  const diffMs = new Date(fecha).setUTCHours(0, 0, 0, 0) - new Date().setUTCHours(0, 0, 0, 0);
  const diff = Math.ceil(diffMs / 86_400_000);
  const label = formatDate(fecha);
  if (diff < 0) return <span className="text-red-600 font-medium">{label + ' ⚠'}</span>;
  if (diff <= 30) return <span className="text-amber-600 font-medium">{label + ' ⚠'}</span>;
  return <span>{label}</span>;
};

const COLUMNS: TableColumn<Articulo>[] = [
  {
    key: 'nombre',
    header: 'Nombre',
    render: (_, row) => <span className="font-medium text-dark-blue">{row.nombre}</span>,
  },
  {
    key: 'marca',
    header: 'Marca/Modelo',
    hideOnMobile: true,
    render: (_, row) => {
      const text = [row.marca, row.modelo].filter(Boolean).join(' · ');
      return text || '—';
    },
  },
  {
    key: 'codigo',
    header: 'Código',
    className: 'font-mono',
  },
  {
    key: 'nro_serie',
    header: 'N° Serie',
    hideOnMobile: true,
    className: 'font-mono',
  },
  {
    key: 'estado',
    header: 'Estado',
    render: (_, row) => {
      const badge = ESTADO_BADGE[row.estado] ?? { label: row.estado, classes: 'bg-gray-100 text-gray-600' };
      return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.classes}`}>
          {badge.label}
        </span>
      );
    },
  },
  {
    key: 'bodega_nombre',
    header: 'Ubicación',
    hideOnMobile: true,
    render: (_, row) => row.bodega_nombre ?? row.proyecto_nombre ?? '—',
  },
  {
    key: 'valor',
    header: 'Valor',
    hideOnTablet: true,
    render: (_, row) => (row.valor > 0 ? formatCLP(row.valor) : '—'),
  },
  {
    key: 'fecha_vencimiento',
    header: 'Vence',
    hideOnMobile: true,
    render: (_, row) => renderVence(row.fecha_vencimiento),
  },
];

interface AdminInventoryScopedAssetListViewProps {
  items: Articulo[];
  onSelect: (id: string) => void;
  isLoading: boolean;
  emptyMessage: string;
}

const AdminInventoryScopedAssetListView: React.FC<AdminInventoryScopedAssetListViewProps> = ({
  items,
  onSelect,
  isLoading,
  emptyMessage,
}) => (
  <ResponsiveTable<Articulo>
    columns={COLUMNS}
    data={items}
    loading={isLoading}
    emptyMessage={emptyMessage}
    onRowClick={(row) => onSelect(row.id)}
    getRowKey={(row) => row.id}
    caption="Lista de artículos"
  />
);

export default AdminInventoryScopedAssetListView;
