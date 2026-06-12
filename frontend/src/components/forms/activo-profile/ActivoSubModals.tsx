import React from 'react';
import EntregaCreateModal from '../EntregaCreateModal';
import EntregaFirmaModal from '../EntregaFirmaModal';
import DevolucionActivoModal from '../DevolucionActivoModal';
import DevolucionFirmaModal from '../DevolucionFirmaModal';
import { formatCLP } from '../../../utils/currency';
import type { ActivoProfileResponse } from '../../../services/apiService';
import type { ActivoWorkflows } from '../../../hooks/useActivoWorkflows';

interface TrabajadorItem {
  id: string;
  persona_id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  cargo?: string | null;
}

interface UbicacionItem {
  id: string;
  nombre: string;
  tipo: 'bodega' | 'planta';
}

interface Props {
  workflows: ActivoWorkflows;
  profile: ActivoProfileResponse;
  trabajadores: TrabajadorItem[];
  ubicaciones: UbicacionItem[];
}

const ActivoSubModals: React.FC<Props> = ({ workflows, profile, trabajadores, ubicaciones }) => {
  const {
    subModal,
    draftEntrega,
    draftDevolucion,
    setDraftDevolucion,
    setSubModal,
    entregaMutation,
    handleCloseEntregaFlow,
    handleSubmodalSuccess,
  } = workflows;

  if (subModal === 'entregar') {
    const code = profile.codigo;
    const name = profile.nombre;
    const value = profile.valor != null ? formatCLP(profile.valor) : '—';
    return (
      <EntregaCreateModal
        isOpen
        onClose={handleCloseEntregaFlow}
        onSubmit={async (payload, foto) => {
          await entregaMutation.mutateAsync({ payload, foto });
        }}
        isSubmitting={entregaMutation.isPending}
        trabajadores={trabajadores}
        ubicaciones={ubicaciones}
        initialArticuloId={profile.id}
        lockArticuloSelection
        initialArticuloCode={code}
        initialArticuloName={name}
        initialArticuloValue={value}
      />
    );
  }

  if (subModal === 'firmar-entrega' && draftEntrega) {
    return (
      <EntregaFirmaModal
        isOpen
        onClose={handleCloseEntregaFlow}
        entrega={draftEntrega}
        onCompleted={handleSubmodalSuccess}
      />
    );
  }

  if (subModal === 'devolver' && profile.custodia_activa) {
    const custodio = profile.custodia_activa;
    const nombre = `${custodio.custodio_nombres} ${custodio.custodio_apellidos}`;
    return (
      <DevolucionActivoModal
        articuloId={profile.id}
        custodiaId={custodio.id}
        trabajadorId={custodio.trabajador_id}
        trabajadorNombre={nombre}
        onClose={() => { setDraftDevolucion(null); setSubModal(null); }}
        onDraftCreated={(draft) => {
          setDraftDevolucion(draft);
          setSubModal('firmar-devolucion');
        }}
      />
    );
  }

  if (subModal === 'firmar-devolucion' && draftDevolucion) {
    return (
      <DevolucionFirmaModal
        isOpen
        onClose={() => { setDraftDevolucion(null); setSubModal(null); }}
        devolucion={draftDevolucion}
        onCompleted={handleSubmodalSuccess}
      />
    );
  }

  return null;
};

export default ActivoSubModals;
