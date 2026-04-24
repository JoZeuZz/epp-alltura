import React, { useState } from 'react';
import { useLoaderData, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { post } from '../../services/apiService';
import SignaturePad from '../../components/forms/SignaturePad';

interface WorkerLoaderData {
  pendientesFirma?: {
    trabajador_id?: string;
    entregas?: any[];
  };
  custodiasActivas?: {
    trabajador_id?: string;
    custodias?: any[];
  };
}

const ACCEPTANCE_TEXT =
  'Confirmo que recibo estos equipos y herramientas en buen estado y me comprometo a cuidarlos.';

const WorkerDashboard: React.FC = () => {
  const loader = useLoaderData() as WorkerLoaderData;
  const location = useLocation();

  const [pendientes, setPendientes] = useState<any[]>(loader.pendientesFirma?.entregas || []);
  const custodias = loader.custodiasActivas?.custodias || [];
  const section = location.pathname.split('/').pop() || 'dashboard';

  const [signatureForm, setSignatureForm] = useState({
    entregaId: '',
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePadKey, setSignaturePadKey] = useState(0);

  const [tokenForm, setTokenForm] = useState({
    token: '',
  });
  const [tokenSignatureFile, setTokenSignatureFile] = useState<File | null>(null);
  const [tokenPadKey, setTokenPadKey] = useState(0);

  const handleSignPending = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signatureForm.entregaId) {
      toast.error('Selecciona una entrega pendiente.');
      return;
    }

    if (!signatureFile) {
      toast.error('Debes registrar una firma manuscrita.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('firma_archivo', signatureFile, signatureFile.name);
      formData.append('texto_aceptacion', ACCEPTANCE_TEXT);

      await post(`/firmas/entregas/${signatureForm.entregaId}/firmar-dispositivo`, formData);

      setPendientes((prev) => prev.filter((item) => item.id !== signatureForm.entregaId));
      setSignatureFile(null);
      setSignaturePadKey((prev) => prev + 1);
      toast.success('Recepción confirmada correctamente.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo firmar la recepción');
    }
  };

  const handleSignWithToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenForm.token.trim()) {
      toast.error('Ingresa el código de confirmación.');
      return;
    }

    if (!tokenSignatureFile) {
      toast.error('Debes registrar una firma manuscrita.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('firma_archivo', tokenSignatureFile, tokenSignatureFile.name);
      formData.append('texto_aceptacion', ACCEPTANCE_TEXT);

      await post(`/firmas/tokens/${tokenForm.token.trim()}/firmar`, formData);

      toast.success('Confirmación registrada correctamente.');
      setTokenForm({ token: '' });
      setTokenSignatureFile(null);
      setTokenPadKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo firmar con token');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Mis Equipos y Herramientas</h1>
        <p className="text-neutral-gray mt-1">
          {section === 'dashboard' && 'Revisa lo que tienes asignado y confirma recepciones pendientes.'}
          {section === 'firmas' && 'Confirma recepciones desde aquí en pocos pasos.'}
        </p>
      </div>

      <section className="bg-white rounded-lg shadow-md p-5">
        <h2 className="text-lg font-semibold text-dark-blue mb-3">Asignados a Mi</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2">Activo</th>
                <th className="text-left py-2 px-2">Artículo</th>
                <th className="text-left py-2 px-2">Ubicación</th>
                <th className="text-left py-2 px-2">Desde</th>
              </tr>
            </thead>
            <tbody>
              {custodias.length === 0 ? (
                <tr>
                  <td className="py-3 px-2 text-neutral-gray" colSpan={4}>
                    No tienes equipos o herramientas asignados.
                  </td>
                </tr>
              ) : (
                custodias.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-b-0 border-gray-100">
                    <td className="py-2 px-2">{item.activo_codigo || '-'}</td>
                    <td className="py-2 px-2">{item.articulo_nombre || '-'}</td>
                    <td className="py-2 px-2">{item.ubicacion_destino_nombre || '-'}</td>
                    <td className="py-2 px-2">{new Date(item.desde_en).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-5">
        <h2 className="text-lg font-semibold text-dark-blue mb-2">Devoluciones</h2>
        {custodias.length === 0 ? (
          <p className="text-sm text-neutral-gray">Ahora no tienes equipos ni herramientas para devolución.</p>
        ) : (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              Si debes devolver un equipo o herramienta, coordínalo directamente con bodega.
            </p>
            <p>
              Actualmente tienes <span className="font-semibold">{custodias.length}</span> elemento(s) asignado(s).
            </p>
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-md p-5">
        <h2 className="text-lg font-semibold text-dark-blue mb-3">Confirmar Recepción</h2>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2">Entrega</th>
                <th className="text-left py-2 px-2">Items</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.length === 0 ? (
                <tr>
                  <td className="py-3 px-2 text-neutral-gray" colSpan={2}>
                    No tienes entregas pendientes.
                  </td>
                </tr>
              ) : (
                pendientes.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0 border-gray-100">
                    <td className="py-2 px-2">Entrega {item.id.slice(0, 8)}</td>
                    <td className="py-2 px-2">{item.cantidad_items}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form className="space-y-3" onSubmit={handleSignPending}>
          <select
            className="border rounded-md p-2 w-full"
            value={signatureForm.entregaId}
            onChange={(e) => setSignatureForm((prev) => ({ ...prev, entregaId: e.target.value }))}
          >
            <option value="">Selecciona entrega para firmar</option>
            {pendientes.map((item) => (
              <option key={item.id} value={item.id}>
                Entrega {item.id.slice(0, 8)} · {item.cantidad_items} ítem(s)
              </option>
            ))}
          </select>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            {ACCEPTANCE_TEXT}
          </div>

          <SignaturePad
            key={`worker-signature-${signaturePadKey}`}
            required
            label="Tu firma"
            onChange={(_dataUrl, file) => setSignatureFile(file)}
          />

          <button type="submit" className="px-3 py-2 rounded-md bg-primary-blue text-white">
            Confirmar recepción
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-md p-5">
        <h2 className="text-lg font-semibold text-dark-blue mb-3">Confirmar con Código o QR</h2>
        <p className="text-sm text-gray-600 mb-3">
          Usa esta opción solo si recibiste un código o enlace desde bodega.
        </p>
        <form className="space-y-3" onSubmit={handleSignWithToken}>
          <input
            className="border rounded-md p-2 w-full"
            placeholder="Código o token recibido"
            value={tokenForm.token}
            onChange={(e) => setTokenForm((prev) => ({ ...prev, token: e.target.value }))}
          />

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            {ACCEPTANCE_TEXT}
          </div>

          <SignaturePad
            key={`worker-token-signature-${tokenPadKey}`}
            required
            label="Tu firma"
            onChange={(_dataUrl, file) => setTokenSignatureFile(file)}
          />

          <button type="submit" className="px-3 py-2 rounded-md bg-dark-blue text-white">
            Confirmar con código
          </button>
        </form>
      </section>
    </div>
  );
};

export default WorkerDashboard;
