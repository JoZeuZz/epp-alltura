import React, { useId } from 'react';
import { formatCLP } from '../../../utils/currency';
import { getToolStatusBadgeClasses, getToolStatusLabel } from '../../../utils/toolPresentation';
import { buildImageUrl, DEFAULT_IMAGE_PLACEHOLDER } from '../../../utils/image';
import AlertaDevolucionBadge from '../../AlertaDevolucionBadge';
import { ArticuloImageToggle, StatBox, MobileSummaryItem } from './shared';
import { formatDate } from './utils';
import type { ActivoProfileResponse } from '../../../services/apiService';

interface Props {
  profile: ActivoProfileResponse;
  imageExpanded: boolean;
  onToggleImage: () => void;
  showMoreDetails: boolean;
  onToggleDetails: () => void;
}

const ActivoProfileHeader: React.FC<Props> = ({
  profile,
  imageExpanded,
  onToggleImage,
  showMoreDetails,
  onToggleDetails,
}) => {
  const detailsPanelId = useId();
  const imgSrc = buildImageUrl(profile.foto_url, 'medium') || DEFAULT_IMAGE_PLACEHOLDER;
  const imgAlt = `${profile.nombre} — ${profile.codigo}`;

  return (
    <>
      {profile.alerta_devolucion && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
          <AlertaDevolucionBadge alerta={true} />
          <span className="text-sm text-red-700">
            Este artículo está asignado a un proyecto finalizado y pendiente de devolución.
          </span>
        </div>
      )}

      <div className="space-y-4" data-tour="activo-modal-header">
        {/* Mobile */}
        <div className="sm:hidden space-y-3">
          <ArticuloImageToggle
            src={imgSrc}
            alt={imgAlt}
            expanded={imageExpanded}
            onToggle={onToggleImage}
          />
          <div className="grid grid-cols-3 gap-2">
            <MobileSummaryItem label="Estado">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getToolStatusBadgeClasses(profile.estado)}`}>
                {getToolStatusLabel(profile.estado)}
              </span>
            </MobileSummaryItem>
            <MobileSummaryItem label="Responsable">
              <span className="font-medium text-content-primary">
                {profile.custodia_activa
                  ? `${profile.custodia_activa.custodio_nombres} ${profile.custodia_activa.custodio_apellidos}`
                  : 'Sin custodia'}
              </span>
            </MobileSummaryItem>
            <MobileSummaryItem label="Valor">
              <span className="font-medium text-content-primary">
                {profile.valor != null ? formatCLP(profile.valor) : '—'}
              </span>
            </MobileSummaryItem>
          </div>

          <button
            type="button"
            aria-expanded={showMoreDetails}
            aria-controls={detailsPanelId}
            onClick={onToggleDetails}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
          >
            {showMoreDetails ? 'Ocultar detalles' : 'Ver más detalles'}
          </button>
          <div id={detailsPanelId} className={`${showMoreDetails ? 'block' : 'hidden'} bg-surface-muted border border-edge rounded-lg p-3 text-sm text-content-secondary space-y-1`}>
            <p>Artículo: <strong>{profile.nombre}</strong></p>
            <p>Fecha relevante: <strong>{formatDate(profile.custodia_activa?.desde_en ?? profile.creado_en)}</strong></p>
            <p>Ubicación: <strong>{profile.custodia_activa?.custodia_ubicacion_nombre ?? profile.bodega_nombre ?? profile.proyecto_nombre ?? '—'}</strong></p>
            <p>Código: <strong>{profile.codigo}</strong></p>
            {profile.nro_serie && <p>Serie: <strong>{profile.nro_serie}</strong></p>}
          </div>
        </div>

        {/* Desktop */}
        <div className={`hidden sm:flex gap-4 ${imageExpanded ? 'flex-col' : 'flex-row sm:items-start'}`}>
          <ArticuloImageToggle
            src={imgSrc}
            alt={imgAlt}
            expanded={imageExpanded}
            onToggle={onToggleImage}
          />
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-bold text-content-primary">{profile.nombre}</h3>
            <div className="flex flex-wrap gap-2 text-sm text-content-secondary">
              <span>Código: <strong>{profile.codigo}</strong></span>
              {profile.nro_serie && <span>Serie: <strong>{profile.nro_serie}</strong></span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getToolStatusBadgeClasses(profile.estado)}`}>
                {getToolStatusLabel(profile.estado)}
              </span>
              {(profile.bodega_nombre || profile.proyecto_nombre) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-surface-overlay text-content-secondary">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.bodega_nombre ?? profile.proyecto_nombre}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-center">
            <StatBox label="Entregas" value={profile.estadisticas.total_entregas} />
            <StatBox label="Devoluciones" value={profile.estadisticas.total_devoluciones} />
            <StatBox label="Días custodia" value={profile.estadisticas.dias_total_custodia} />
          </div>
        </div>
      </div>
    </>
  );
};

export default ActivoProfileHeader;
