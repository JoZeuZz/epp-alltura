import React, { useMemo, useState } from 'react';
import type { Articulo } from '../../services/apiService';

const CX = 300, CY = 190, R = 104;
const COLORS = ['#1E2A4A', '#2A64A4', '#3D7EC8', '#5B9FE0', '#8DC3F5', '#B8D9F8'];
const COLOR_NONE = '#CBD5E1';

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function slicePath(startDeg: number, endDeg: number): string {
  const s = polarToXY(startDeg, R);
  const e = polarToXY(endDeg, R);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
}

interface Props {
  items: Articulo[];
  isLoading: boolean;
  onCityClick: (ciudad: string | null) => void;
}

const InventoryLocationPieChart: React.FC<Props> = ({ items, isLoading, onCityClick }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const cityData = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(a => {
      const key = a.bodega_ciudad ?? a.proyecto_ciudad ?? 'Sin ubicación';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([city, count], i) => ({
        city,
        count,
        color: city === 'Sin ubicación' ? COLOR_NONE : COLORS[i % COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const total = useMemo(() => cityData.reduce((s, d) => s + d.count, 0), [cityData]);

  if (isLoading) {
    return (
      <div
        className="animate-pulse bg-gray-100 rounded-lg h-56 w-full"
        aria-label="Cargando gráfico"
      />
    );
  }

  if (cityData.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 flex items-center justify-center h-40">
        <p className="text-sm text-gray-400">
          Sin datos suficientes para mostrar distribución
        </p>
      </div>
    );
  }

  let angle = 0;
  const slices = cityData.map((d, i) => {
    const sweep = (d.count / total) * 360;
    const startDeg = angle;
    angle += sweep;
    return { ...d, startDeg, endDeg: angle, mid: startDeg + sweep / 2, index: i };
  });

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Distribución por ciudad
        </span>
        <span className="text-xs font-bold text-dark-blue bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
          {total} artículos
        </span>
      </div>

      <div className="mx-auto w-full" style={{ maxWidth: 'min(100%, 460px)' }}>
      <svg viewBox="50 50 500 350" className="w-full" style={{ overflow: 'visible' }}>
        {slices.map((s) => {
          const isActive = hovered === s.index || selected === s.index;
          const midRad = (s.mid - 90) * Math.PI / 180;
          const dx = isActive ? (9 * Math.cos(midRad)).toFixed(2) : '0';
          const dy = isActive ? (9 * Math.sin(midRad)).toFixed(2) : '0';
          const c1 = polarToXY(s.mid, R * 1.05);
          const c2 = polarToXY(s.mid, R * 1.38);
          const lbl = polarToXY(s.mid, R * 1.53);
          const anchor = lbl.x >= CX ? 'start' : 'end';
          const pct = Math.round((s.count / total) * 100);

          return (
            <g
              key={s.city}
              role="group"
              aria-label={`${s.city}: ${s.count} artículos (${pct}%)`}
              transform={`translate(${dx}, ${dy})`}
              style={{ cursor: 'pointer', transition: 'transform 0.18s cubic-bezier(.4,0,.2,1)' }}
              onClick={() => setSelected(selected === s.index ? null : s.index)}
              onMouseEnter={() => setHovered(s.index)}
              onMouseLeave={() => setHovered(null)}
            >
              <path
                d={slicePath(s.startDeg, s.endDeg)}
                fill={s.color}
                stroke="white"
                strokeWidth="2.5"
                strokeLinejoin="round"
                style={{
                  filter: isActive
                    ? `brightness(1.12) drop-shadow(0 4px 12px ${s.color}55)`
                    : undefined,
                  transition: 'filter 0.18s ease',
                }}
              />
              <line
                x1={c1.x.toFixed(2)} y1={c1.y.toFixed(2)}
                x2={c2.x.toFixed(2)} y2={c2.y.toFixed(2)}
                stroke={s.color}
                strokeWidth={isActive ? '2' : '1.5'}
                strokeLinecap="round"
                opacity={isActive ? 1 : 0.5}
                style={{ transition: 'opacity 0.18s ease, stroke-width 0.18s ease' }}
              />
              <circle
                cx={c2.x.toFixed(2)} cy={c2.y.toFixed(2)}
                r="2.5"
                fill={s.color}
                opacity={isActive ? 1 : 0.5}
              />
              <text
                x={lbl.x.toFixed(2)} y={(lbl.y - 2).toFixed(2)}
                textAnchor={anchor}
                style={{
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: selected === s.index ? '700' : '600',
                  fill: selected === s.index ? '#2A64A4' : '#1E2A4A',
                  pointerEvents: 'none',
                  transition: 'fill 0.18s ease',
                }}
              >
                {s.city}
              </text>
              <text
                x={lbl.x.toFixed(2)} y={(lbl.y + 16).toFixed(2)}
                textAnchor={anchor}
                style={{
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  fill: selected === s.index ? '#4A90D9' : '#94A3B8',
                  pointerEvents: 'none',
                  transition: 'fill 0.18s ease',
                }}
              >
                {`${pct}% · ${s.count} uds.`}
              </text>
            </g>
          );
        })}
      </svg>
      </div>

      {selected !== null && (
        <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
          <span className="text-sm text-dark-blue font-medium">
            Ciudad:{' '}
            <strong className="text-primary-blue">{slices[selected].city}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              const city = slices[selected!].city;
              onCityClick(city === 'Sin ubicación' ? null : city);
            }}
            className="text-xs font-semibold text-white bg-dark-blue rounded-md px-3 py-1.5 hover:bg-primary-blue transition-colors"
          >
            Ver inventario →
          </button>
        </div>
      )}

      <p className="text-center text-xs text-gray-300 mt-2">
        Click en un sector para{' '}
        <span className="text-gray-400 font-medium">filtrar por ciudad</span>
      </p>
    </div>
  );
};

export default InventoryLocationPieChart;
