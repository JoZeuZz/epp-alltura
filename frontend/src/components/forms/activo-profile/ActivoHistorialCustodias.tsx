import React from 'react';
import { CustodiaRow } from './shared';
import type { ActivoCustodiaEntry } from '../../../services/apiService';

interface Props {
  custodias: ActivoCustodiaEntry[];
}

const ActivoHistorialCustodias: React.FC<Props> = ({ custodias }) => (
  <section>
    <h4 className="text-sm font-semibold text-content-secondary mb-2">Historial de custodias</h4>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-xs text-content-muted uppercase border-b">
            <th className="text-left py-2 px-2">Custodio</th>
            <th className="text-left py-2 px-2">Ubicación</th>
            <th className="text-left py-2 px-2">Desde</th>
            <th className="text-left py-2 px-2">Hasta</th>
            <th className="text-left py-2 px-2">Días</th>
            <th className="text-left py-2 px-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {custodias.map((c) => (
            <CustodiaRow key={c.id} custodia={c} />
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export default ActivoHistorialCustodias;
