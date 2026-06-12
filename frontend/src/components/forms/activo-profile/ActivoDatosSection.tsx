import React from 'react';
import { formatCLP } from '../../../utils/currency';
import { InfoField } from './shared';
import { formatDate } from './utils';
import type { ActivoProfileResponse, ArticuloCertificacion } from '../../../services/apiService';

interface Props {
  profile: ActivoProfileResponse;
}

const ActivoDatosSection: React.FC<Props> = ({ profile }) => (
  <section className="bg-surface-muted rounded-lg p-4 space-y-3">
    <h4 className="text-sm font-semibold text-content-secondary">Datos del artículo</h4>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
      <InfoField label="Registrado"   value={formatDate(profile.creado_en)} />
      <InfoField label="Fecha compra" value={formatDate(profile.fecha_compra)} />
      <InfoField label="Proveedor"    value={profile.proveedor_nombre} />
      <InfoField label="Valor"        value={profile.valor != null ? formatCLP(profile.valor) : null} />
      <InfoField label="Vencimiento"  value={profile.fecha_vencimiento ? formatDate(profile.fecha_vencimiento) : null} />
      <InfoField label="Tipo"         value={profile.tipo?.toUpperCase()} />
      {profile.marca  && <InfoField label="Marca"  value={profile.marca} />}
      {profile.modelo && <InfoField label="Modelo" value={profile.modelo} />}
    </div>

    {profile.factura_url && (
      <div>
        <span className="text-xs font-medium text-content-muted uppercase tracking-wide">Factura</span>
        <div className="mt-1">
          <a href={profile.factura_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            ↓ Descargar factura
          </a>
        </div>
      </div>
    )}

    {profile.manual_url && (
      <div>
        <span className="text-xs font-medium text-content-muted uppercase tracking-wide">Manual / Ficha técnica</span>
        <div className="mt-1">
          <a href={profile.manual_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            ↓ Ver manual
          </a>
        </div>
      </div>
    )}

    {profile.certificaciones && profile.certificaciones.length > 0 && (
      <div>
        <span className="text-xs font-medium text-content-muted uppercase tracking-wide">
          Certificaciones ({profile.certificaciones.length})
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {(profile.certificaciones as ArticuloCertificacion[]).map(cert => (
            <a key={cert.id} href={cert.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-surface border border-edge text-primary hover:bg-surface-muted transition-colors">
              ↓ {cert.nombre || 'Certificación'}
            </a>
          ))}
        </div>
      </div>
    )}
  </section>
);

export default ActivoDatosSection;
