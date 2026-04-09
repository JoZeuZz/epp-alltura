import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SignaturePad from '../components/forms/SignaturePad';
import logoWhite from '../assets/logo-alltura-white.png';

type PageState = 'loading' | 'form' | 'success' | 'expired' | 'used' | 'error';

interface EntregaDetalle {
  id: string;
  cantidad: number;
  tipo_item_entrega?: 'retornable' | 'asignacion';
  condicion_salida: string;
  notas?: string;
  articulo_nombre: string;
  articulo_tipo: string;
  tracking_mode: string;
  activo_codigo?: string;
  codigo_lote?: string;
}

interface TokenInfo {
  entrega_id: string;
  trabajador_id: string;
  expira_en: string;
  usado_en?: string;
  entrega_estado: string;
  entrega_tipo: string;
  nota_destino?: string;
  ubicacion_origen_nombre?: string;
  ubicacion_destino_nombre?: string;
  nombres: string;
  apellidos: string;
  rut: string;
  firma_id?: string;
  firmado_en?: string;
  estado_token: 'disponible' | 'usado' | 'expirado' | 'firmado';
  detalles: EntregaDetalle[];
}

const LogoHeader: React.FC = () => (
  <div className="flex justify-center mb-8">
    <div className="bg-dark-blue rounded-xl px-8 py-4 shadow-lg">
      <img src={logoWhite} alt="Alltura Servicios Industriales" className="h-12 w-auto" />
    </div>
  </div>
);

const buildDefaultAcceptanceText = (
  nombres: string,
  apellidos: string,
  detalles: EntregaDetalle[]
): string => {
  const isRetornableDetalle = (d: EntregaDetalle) => {
    if (d.tipo_item_entrega) {
      return d.tipo_item_entrega === 'retornable';
    }

    // Compatibilidad histórica previa a migración 008.
    return d.tracking_mode === 'serial' || Boolean(d.activo_codigo);
  };

  const toDetalleLabel = (d: EntregaDetalle) => {
    const cod = d.activo_codigo ? ` (cód. ${d.activo_codigo})` : '';
    return `${d.articulo_nombre}${cod} x${Number(d.cantidad)}`;
  };

  const retornables = detalles.filter(isRetornableDetalle);
  const asignados = detalles.filter((d) => !isRetornableDetalle(d));

  const nombreArticulos = detalles.map(toDetalleLabel).join(', ');
  const retornablesTexto = retornables.map(toDetalleLabel).join(', ');
  const asignadosTexto = asignados.map(toDetalleLabel).join(', ');

  if (detalles.length > 0 && retornables.length === 0 && asignados.length === detalles.length) {
    return (
      `Yo, ${nombres} ${apellidos}, declaro recibir conforme los siguientes EPP/herramientas: ` +
      `${nombreArticulos || 'los artículos detallados'}. ` +
      `Acepto hacerme responsable de su uso correcto y cuidado, ` +
      `y me comprometo a reportar cualquier extravío o daño a mi supervisor.`
    );
  }

  if (retornables.length > 0 && asignados.length === 0) {
    return (
      `Yo, ${nombres} ${apellidos}, declaro recibir conforme los siguientes artículos retornables: ` +
      `${retornablesTexto}. ` +
      `Acepto hacerme responsable de su custodia, uso correcto y devolución, ` +
      `y me comprometo a reportar cualquier extravío o daño a mi supervisor.`
    );
  }

  if (retornables.length > 0 && asignados.length > 0) {
    return (
      `Yo, ${nombres} ${apellidos}, declaro recibir conforme los artículos retornables (${retornablesTexto}) ` +
      `y los artículos de asignación/consumo (${asignadosTexto}). ` +
      `Acepto hacerme responsable de la custodia, uso correcto y devolución de los ítems retornables, ` +
      `y del uso correcto de los ítems de asignación/consumo. ` +
      `Me comprometo a reportar cualquier extravío o daño a mi supervisor.`
    );
  }

  return (
    `Yo, ${nombres} ${apellidos}, declaro recibir conforme los siguientes EPP/herramientas: ` +
    `${nombreArticulos || 'los artículos detallados'}. ` +
    `Acepto hacerme responsable de su uso correcto y cuidado, ` +
    `y me comprometo a reportar cualquier extravío o daño a mi supervisor.`
  );
};

const PublicSignPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [padKey, setPadKey] = useState(0);
  const [textoAceptacion, setTextoAceptacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('Token inválido o faltante.');
      return;
    }

    fetch(`/api/firmas/tokens/${token}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState('error');
          setErrorMessage(json?.message || 'No se pudo cargar la información de firma.');
          return;
        }
        const data: TokenInfo = json.data ?? json;

        if (data.estado_token === 'expirado') {
          setState('expired');
          return;
        }
        if (data.estado_token === 'usado' || data.estado_token === 'firmado') {
          setState('used');
          return;
        }

        setTokenInfo(data);
        setTextoAceptacion(
          buildDefaultAcceptanceText(data.nombres, data.apellidos, data.detalles)
        );
        setState('form');
      })
      .catch(() => {
        setState('error');
        setErrorMessage('Error de conexión. Verifica tu red e intenta nuevamente.');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureFile) {
      setSubmitError('Debes dibujar tu firma antes de continuar.');
      return;
    }
    if (!textoAceptacion.trim()) {
      setSubmitError('El texto de aceptación no puede estar vacío.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('firma_archivo', signatureFile, signatureFile.name);
      formData.append('texto_aceptacion', textoAceptacion.trim());

      const res = await fetch(`/api/firmas/tokens/${token}/firmar`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 410) {
          setState('expired');
          return;
        }
        if (res.status === 409) {
          setState('used');
          return;
        }
        throw new Error(json?.message || 'No se pudo registrar la firma.');
      }

      setState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar la firma.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-light-gray-bg flex flex-col items-center justify-center px-4">
        <LogoHeader />
        <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-4" />
          <p className="text-neutral-gray">Cargando información de entrega...</p>
        </div>
      </div>
    );
  }

  // ── Token expirado ────────────────────────────────────────────────────────
  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-light-gray-bg flex flex-col items-center justify-center px-4">
        <LogoHeader />
        <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md text-center">
          <div className="text-amber-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-dark-blue mb-2">Enlace expirado</h1>
          <p className="text-neutral-gray text-sm">
            Este enlace de firma ya no es válido. Solicita un nuevo enlace al encargado de bodega.
          </p>
        </div>
      </div>
    );
  }

  // ── Ya firmado ────────────────────────────────────────────────────────────
  if (state === 'used') {
    return (
      <div className="min-h-screen bg-light-gray-bg flex flex-col items-center justify-center px-4">
        <LogoHeader />
        <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-dark-blue mb-2">Entrega ya firmada</h1>
          <p className="text-neutral-gray text-sm">
            Esta entrega ya fue firmada correctamente. No es necesario firmar nuevamente.
          </p>
        </div>
      </div>
    );
  }

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div className="min-h-screen bg-light-gray-bg flex flex-col items-center justify-center px-4">
        <LogoHeader />
        <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-dark-blue mb-2">¡Firma registrada!</h1>
          <p className="text-neutral-gray text-sm mb-4">
            Tu firma ha sido registrada correctamente. Puedes cerrar esta página.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 text-xs">
              Recuerda usar correctamente los EPP/herramientas entregados y reportar cualquier daño
              o extravío a tu supervisor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-light-gray-bg flex flex-col items-center justify-center px-4">
        <LogoHeader />
        <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-dark-blue mb-2">Enlace no válido</h1>
          <p className="text-neutral-gray text-sm">
            {errorMessage || 'No se pudo cargar este enlace de firma.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario de firma ───────────────────────────────────────────────────
  const info = tokenInfo!;
  const tipoLabel: Record<string, string> = {
    entrega: 'Entrega',
    prestamo: 'Entrega',
    traslado: 'Traslado',
  };

  return (
    <div className="min-h-screen bg-light-gray-bg py-8 px-4">
      <LogoHeader />
      <div className="w-full max-w-2xl mx-auto space-y-5">

        {/* Encabezado de la operación */}
        <div className="bg-primary-blue text-white rounded-xl p-6 shadow-md">
          <h1 className="text-xl font-bold mb-1">Acta de Recepción — {tipoLabel[info.entrega_tipo] ?? info.entrega_tipo}</h1>
          <p className="text-blue-100 text-sm">
            Trabajador: <span className="font-semibold">{info.nombres} {info.apellidos}</span>
            {info.rut && <span className="ml-2 text-blue-200 text-xs">RUT {info.rut}</span>}
          </p>
          {info.ubicacion_origen_nombre && (
            <p className="text-blue-200 text-xs mt-1">
              Desde: {info.ubicacion_origen_nombre}
              {info.ubicacion_destino_nombre && ` → ${info.ubicacion_destino_nombre}`}
            </p>
          )}
          {info.nota_destino && (
            <p className="text-blue-200 text-xs mt-1">Nota: {info.nota_destino}</p>
          )}
          <p className="text-blue-200 text-xs mt-2">
            Enlace válido hasta: {new Date(info.expira_en).toLocaleString('es-CL')}
          </p>
        </div>

        {/* Artículos a recibir */}
        {info.detalles.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-5">
            <h2 className="font-semibold text-dark-blue mb-3 text-base">
              Artículos a recibir ({info.detalles.length})
            </h2>
            <div className="space-y-2">
              {info.detalles.map((d, i) => (
                <div key={d.id ?? i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark-blue text-sm">{d.articulo_nombre}</p>
                    <p className="text-neutral-gray text-xs mt-0.5">
                      Cantidad: <span className="font-medium">{Number(d.cantidad)}</span>
                      {' — '}Condición: <span className="font-medium">{d.condicion_salida}</span>
                      {d.activo_codigo && (
                        <span> — Código: <span className="font-medium font-mono">{d.activo_codigo}</span></span>
                      )}
                      {d.codigo_lote && (
                        <span> — Lote: <span className="font-medium">{d.codigo_lote}</span></span>
                      )}
                    </p>
                    {d.notas && <p className="text-neutral-gray text-xs italic mt-0.5">{d.notas}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Texto de aceptación */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h2 className="font-semibold text-dark-blue mb-3 text-base">Texto de aceptación</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <p className="text-amber-700 text-xs font-semibold mb-1">Al firmar confirmas lo siguiente:</p>
              <p className="text-amber-900 text-sm leading-relaxed">{textoAceptacion}</p>
            </div>
          </div>

          {/* Pad de firma */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <SignaturePad
              key={`public-sign-${padKey}`}
              required
              showPreview={false}
              label="Firma aquí con tu dedo"
              onChange={(_dataUrl, file) => {
                setSignatureFile(file);
                setSubmitError('');
              }}
            />
          </div>

          {/* Error de submit */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{submitError}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <button
              type="button"
              onClick={() => {
                setSignatureFile(null);
                setPadKey((k) => k + 1);
                setSubmitError('');
              }}
              className="flex-1 px-5 py-4 rounded-xl border border-gray-300 text-gray-600 font-medium text-base hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px]"
            >
              Limpiar firma
            </button>
            <button
              type="submit"
              disabled={!signatureFile || isSubmitting}
              className="flex-1 px-5 py-4 rounded-xl bg-primary-blue text-white font-semibold text-base shadow-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {isSubmitting ? 'Enviando...' : 'Confirmar y Firmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicSignPage;
