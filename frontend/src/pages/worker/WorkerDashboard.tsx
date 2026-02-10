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

const WorkerDashboard: React.FC = () => {
  const loader = useLoaderData() as WorkerLoaderData;
  const location = useLocation();

  const [pendientes, setPendientes] = useState<any[]>(loader.pendientesFirma?.entregas || []);
  const custodias = loader.custodiasActivas?.custodias || [];
  const section = location.pathname.split('/').pop() || 'dashboard';

  const [signatureForm, setSignatureForm] = useState({
    entregaId: '',
    texto_aceptacion:
      'Confirmo recepción de los activos/EPP indicados y asumo responsabilidad de custodia y uso seguro.',
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePadKey, setSignaturePadKey] = useState(0);

  const [tokenForm, setTokenForm] = useState({
    token: '',
    texto_aceptacion:
      'Confirmo recepción de los activos/EPP indicados y asumo responsabilidad de custodia y uso seguro.',
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
      formData.append('texto_aceptacion', signatureForm.texto_aceptacion);

      await post(`/firmas/entregas/${signatureForm.entregaId}/firmar-dispositivo`, formData);

      setPendientes((prev) => prev.filter((item) => item.id !== signatureForm.entregaId));
      setSignatureFile(null);
      setSignaturePadKey((prev) => prev + 1);
      toast.success('Recepción firmada correctamente.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo firmar la recepción');
    }
  };

  const handleSignWithToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenForm.token.trim()) {
      toast.error('Ingresa el token de firma.');
      return;
    }

    if (!tokenSignatureFile) {
      toast.error('Debes registrar una firma manuscrita.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('firma_archivo', tokenSignatureFile, tokenSignatureFile.name);
      formData.append('texto_aceptacion', tokenForm.texto_aceptacion);

      await post(`/firmas/tokens/${tokenForm.token.trim()}/firmar`, formData);

      toast.success('Firma por token registrada correctamente.');
      setTokenForm((prev) => ({ ...prev, token: '' }));
      setTokenSignatureFile(null);
      setTokenPadKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'No se pudo firmar con token');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Portal Trabajador EPP</h1>
        <p className="text-neutral-gray mt-1">
          {section === 'dashboard' && 'Consulta tu custodia activa y firma entregas pendientes.'}
          {section === 'firmas' && 'Firma recepciones por dispositivo compartido o por token/QR.'}
        </p>
      </div>

      <section className="bg-white rounded-lg shadow-md p-5">
        <h2 className="text-lg font-semibold text-dark-blue mb-3">Activos en Custodia</h2>
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
                    No tienes activos en custodia activa.
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
        <h2 className="text-lg font-semibold text-dark-blue mb-3">Entregas Pendientes de Firma</h2>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2">Entrega</th>
                <th className="text-left py-2 px-2">Tipo</th>
                <th className="text-left py-2 px-2">Estado</th>
                <th className="text-left py-2 px-2">Items</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.length === 0 ? (
                <tr>
                  <td className="py-3 px-2 text-neutral-gray" colSpan={4}>
                    No tienes entregas pendientes.
                  </td>
                </tr>
              ) : (
                pendientes.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0 border-gray-100">
                    <td className="py-2 px-2">{item.id.slice(0, 8)}</td>
                    <td className="py-2 px-2">{item.tipo}</td>
                    <td className="py-2 px-2">{item.estado}</td>
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
                {item.id.slice(0, 8)} - {item.tipo}
              </option>
            ))}
          </select>

          <textarea
            className="border rounded-md p-2 w-full"
            value={signatureForm.texto_aceptacion}
            onChange={(e) =>
              setSignatureForm((prev) => ({ ...prev, texto_aceptacion: e.target.value }))
            }
          />

          <SignaturePad
            key={`worker-signature-${signaturePadKey}`}
            required
            label="Firma de recepción"
            onChange={(_dataUrl, file) => setSignatureFile(file)}
          />

          <button type="submit" className="px-3 py-2 rounded-md bg-primary-blue text-white">
            Firmar Recepción
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-md p-5">
        <h2 className="text-lg font-semibold text-dark-blue mb-3">Firma por Token / QR</h2>
        <form className="space-y-3" onSubmit={handleSignWithToken}>
          <input
            className="border rounded-md p-2 w-full"
            placeholder="Token recibido"
            value={tokenForm.token}
            onChange={(e) => setTokenForm((prev) => ({ ...prev, token: e.target.value }))}
          />

          <textarea
            className="border rounded-md p-2 w-full"
            value={tokenForm.texto_aceptacion}
            onChange={(e) => setTokenForm((prev) => ({ ...prev, texto_aceptacion: e.target.value }))}
          />

          <SignaturePad
            key={`worker-token-signature-${tokenPadKey}`}
            required
            label="Firma para token/QR"
            onChange={(_dataUrl, file) => setTokenSignatureFile(file)}
          />

          <button type="submit" className="px-3 py-2 rounded-md bg-dark-blue text-white">
            Firmar con Token
          </button>
        </form>
      </section>
    </div>
  );
};

export default WorkerDashboard;
