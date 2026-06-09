import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGet } from '../../hooks';
import type { Articulo } from '../../services/apiService';
import AlertaDevolucionBadge from '../../components/AlertaDevolucionBadge';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Proyecto {
  id: string;
  nombre: string;
  sitio?: string | null;
  cliente?: string | null;
  presupuesto_clp?: number | null;
  estado: 'activo' | 'inactivo' | 'finalizado';
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  activo: 'bg-green-100 text-green-700 border-green-200',
  inactivo: 'bg-gray-100 text-gray-600 border-gray-200',
  finalizado: 'bg-orange-100 text-orange-700 border-orange-200',
};

const formatCLP = (value?: number | null) =>
  value != null
    ? value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
    : '—';

// ─── Página ───────────────────────────────────────────────────────────────────

const AdminProyectoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: proyecto, isLoading: loadingProyecto } = useGet<Proyecto>(
    ['proyecto', id!],
    `/proyectos/${id}`
  );

  const { data: articulosData, isLoading: loadingArticulos } = useGet<Articulo[] | { data: Articulo[] }>(
    ['articulos-asignados', id!],
    `/articulos?proyecto_id=${id}`
  );

  const articulos: Articulo[] = Array.isArray(articulosData)
    ? articulosData
    : (articulosData as { data: Articulo[] } | null)?.data ?? [];

  const [devolucionArticuloId, setDevolucionArticuloId] = useState<string | null>(null);
  const [reubicarArticuloId, setReubicarArticuloId] = useState<string | null>(null);

  const totalValor = useMemo(
    () => articulos.reduce((sum, a) => sum + (a.valor ?? 0), 0),
    [articulos]
  );

  if (loadingProyecto) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        Cargando proyecto...
      </div>
    );
  }

  if (!proyecto) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-gray-500 text-sm">Proyecto no encontrado.</p>
        <button
          onClick={() => navigate('/ubicacion/proyectos')}
          className="text-primary-blue text-sm underline"
        >
          Volver a proyectos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/ubicacion/proyectos')}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Proyectos
        </button>
      </div>

      {/* Ficha del proyecto */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{proyecto.nombre}</h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ESTADO_BADGE[proyecto.estado] ?? ESTADO_BADGE.inactivo}`}
          >
            {proyecto.estado.charAt(0).toUpperCase() + proyecto.estado.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
          {proyecto.sitio && (
            <div>
              <span className="font-medium text-gray-700">Sitio: </span>
              {proyecto.sitio}
            </div>
          )}
          {proyecto.cliente && (
            <div>
              <span className="font-medium text-gray-700">Cliente: </span>
              {proyecto.cliente}
            </div>
          )}
          {proyecto.presupuesto_clp != null && (
            <div>
              <span className="font-medium text-gray-700">Presupuesto: </span>
              {formatCLP(proyecto.presupuesto_clp)}
            </div>
          )}
          {proyecto.fecha_inicio && (
            <div>
              <span className="font-medium text-gray-700">Fechas: </span>
              {proyecto.fecha_inicio}
              {proyecto.fecha_fin ? ` → ${proyecto.fecha_fin}` : ''}
            </div>
          )}
        </div>
      </div>

      {/* Artículos asignados */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-medium text-gray-800">Artículos asignados</h2>
          <span className="text-sm text-gray-500">{articulos.length} artículo(s)</span>
        </div>

        {loadingArticulos ? (
          <div className="p-6 text-center text-gray-400 text-sm">Cargando artículos...</div>
        ) : articulos.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            No hay artículos asignados a este proyecto.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {articulos.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800 truncate">{a.nombre}</span>
                    <span className="text-xs text-gray-400">{a.codigo}</span>
                    <AlertaDevolucionBadge alerta={a.alerta_devolucion} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {a.tipo?.toUpperCase()} · {formatCLP(a.valor)}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setDevolucionArticuloId(a.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    aria-label={`Devolver ${a.nombre}`}
                  >
                    Devolver
                  </button>
                  <button
                    onClick={() => setReubicarArticuloId(a.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-blue text-white hover:bg-blue-700 transition-colors"
                    aria-label={`Trasladar ${a.nombre}`}
                  >
                    Trasladar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between text-sm">
          <span className="text-gray-600">
            Total: <strong>{articulos.length}</strong> artículo(s)
          </span>
          <span className="text-gray-700 font-medium">
            Valor acumulado: {formatCLP(totalValor)}
          </span>
        </div>
      </div>

      {/* Cerrar overlays pendientes */}
      {devolucionArticuloId && (
        <div aria-hidden="true">
          <button onClick={() => setDevolucionArticuloId(null)} className="hidden">close</button>
        </div>
      )}
      {reubicarArticuloId && (
        <div aria-hidden="true">
          <button onClick={() => setReubicarArticuloId(null)} className="hidden">close</button>
        </div>
      )}
    </div>
  );
};

export default AdminProyectoDetailPage;
