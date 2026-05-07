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
  activo_codigo?: string;
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

const formatExpiry = (iso: string): string => {
  const d = new Date(iso);
  const str = d.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const CONDICION_STYLE: Record<string, string> = {
  bueno: 'bg-emerald-100 text-emerald-800',
  nuevo: 'bg-blue-100 text-blue-800',
  regular: 'bg-amber-100 text-amber-800',
  malo: 'bg-red-100 text-red-800',
};

const TIPO_LABEL: Record<string, string> = {
  entrega: 'Entrega de equipos',
};

const buildAcceptanceText = (
  nombres: string,
  apellidos: string,
  detalles: EntregaDetalle[]
): string => {
  const items = detalles
    .map((d) => {
      const cod = d.activo_codigo ? ` (cód. ${d.activo_codigo})` : '';
      return `${d.articulo_nombre}${cod} x${Number(d.cantidad)}`;
    })
    .join(', ');
  return (
    `Yo, ${nombres} ${apellidos}, confirmo que recibo los equipos y herramientas indicados ` +
    `(${items || 'ítems detallados'}) en buen estado. ` +
    `Me comprometo a su uso y cuidado responsable.`
  );
};

// ── Pantalla de estado terminal ───────────────────────────────────────────────
const StatusScreen: React.FC<{
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  footer?: React.ReactNode;
}> = ({ iconBg, icon, title, body, footer }) => (
  <div className="min-h-screen bg-light-gray-bg flex flex-col items-center justify-center px-4 py-12">
    <div className="flex justify-center mb-8">
      <div className="bg-dark-blue rounded-2xl px-8 py-4 shadow-lg">
        <img src={logoWhite} alt="Alltura Servicios Industriales" className="h-10 w-auto" />
      </div>
    </div>
    <div className="bg-white rounded-2xl shadow-md overflow-hidden w-full max-w-md" role="main">
      <div className={`${iconBg} flex justify-center items-center py-10`}>{icon}</div>
      <div className="px-8 py-7 text-center">
        <h1 className="text-xl font-bold text-dark-blue mb-3">{title}</h1>
        <p className="text-neutral-gray text-sm leading-relaxed">{body}</p>
        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
const PublicSignPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [padKey, setPadKey] = useState(0);
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
        if (data.estado_token === 'expirado') { setState('expired'); return; }
        if (data.estado_token === 'usado' || data.estado_token === 'firmado') { setState('used'); return; }
        setTokenInfo(data);
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
    if (!tokenInfo) {
      setSubmitError('No se pudo cargar la información de la entrega.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('firma_archivo', signatureFile, signatureFile.name);
      formData.append(
        'texto_aceptacion',
        buildAcceptanceText(tokenInfo.nombres, tokenInfo.apellidos, tokenInfo.detalles)
      );

      const res = await fetch(`/api/firmas/tokens/${token}/firmar`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 410) { setState('expired'); return; }
        if (res.status === 409) { setState('used'); return; }
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

  const clearSignature = () => {
    setSignatureFile(null);
    setPadKey((k) => k + 1);
    setSubmitError('');
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div
        className="min-h-screen bg-light-gray-bg flex items-center justify-center px-4"
        role="status"
        aria-label="Verificando enlace de firma"
      >
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-blue animate-spin" />
          </div>
          <p className="text-neutral-gray text-sm">Verificando enlace de firma…</p>
        </div>
      </div>
    );
  }

  // ── Estados terminales ────────────────────────────────────────────────────
  if (state === 'expired') return (
    <StatusScreen
      iconBg="bg-amber-50"
      icon={
        <svg className="w-14 h-14 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      title="Enlace expirado"
      body="Este enlace de firma ya no es válido. Solicita un nuevo enlace al encargado de bodega."
    />
  );

  if (state === 'used') return (
    <StatusScreen
      iconBg="bg-emerald-50"
      icon={
        <svg className="w-14 h-14 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      title="Recepción ya confirmada"
      body="Esta recepción ya fue firmada correctamente. No es necesario firmar nuevamente."
    />
  );

  if (state === 'success') return (
    <StatusScreen
      iconBg="bg-emerald-50"
      icon={
        <svg className="w-14 h-14 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      title="¡Confirmación registrada!"
      body="Tu firma quedó registrada correctamente. Puedes cerrar esta página."
      footer={
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left">
          <p className="text-emerald-800 text-xs leading-relaxed">
            Usa y cuida correctamente los equipos y herramientas entregados. Reporta cualquier daño o extravío a tu supervisor de inmediato.
          </p>
        </div>
      }
    />
  );

  if (state === 'error') return (
    <StatusScreen
      iconBg="bg-red-50"
      icon={
        <svg className="w-14 h-14 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      title="Enlace no válido"
      body={errorMessage || 'No se pudo cargar este enlace de firma.'}
    />
  );

  // ── Formulario de firma ───────────────────────────────────────────────────
  const info = tokenInfo!;

  return (
    <div className="min-h-screen bg-light-gray-bg">

      {/* Barra superior sticky — contexto visible al desplazar en móvil */}
      <div
        className="sticky top-0 z-10 bg-dark-blue shadow-md"
        aria-hidden="true"
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logoWhite} alt="" className="h-7 w-auto flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold leading-tight truncate">
              {TIPO_LABEL[info.entrega_tipo] ?? info.entrega_tipo}
            </p>
            <p className="text-blue-300 text-xs truncate">
              {info.nombres} {info.apellidos}
            </p>
          </div>
          <span className="flex-shrink-0 bg-blue-700/60 text-blue-200 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
            Pendiente firma
          </span>
        </div>
      </div>

      {/* Contenido scrollable + CTA sticky inferior */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-40 space-y-4">

          {/* ── Sección 1: Encabezado de la operación ── */}
          <section aria-labelledby="op-heading">
            {/* Cabecera oscura con identidad de la operación */}
            <div className="bg-dark-blue rounded-t-2xl px-5 py-4">
              <h1 id="op-heading" className="text-white text-base font-bold leading-snug">
                {TIPO_LABEL[info.entrega_tipo] ?? info.entrega_tipo}
              </h1>
              <p className="text-blue-200 text-sm mt-0.5">
                {info.nombres} {info.apellidos}
                {info.rut && (
                  <span className="text-blue-300 ml-2 text-xs">RUT {info.rut}</span>
                )}
              </p>
            </div>
            {/* Cuerpo claro con detalles de contexto */}
            <div className="bg-white rounded-b-2xl shadow-sm border-x border-b border-gray-100 px-5 py-4 space-y-2.5">
              {info.ubicacion_origen_nombre && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {info.ubicacion_origen_nombre}
                    {info.ubicacion_destino_nombre && (
                      <>
                        <span className="text-gray-400 mx-1.5">→</span>
                        {info.ubicacion_destino_nombre}
                      </>
                    )}
                  </span>
                </div>
              )}
              {info.nota_destino && (
                <div className="flex items-start gap-2.5 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span>{info.nota_destino}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-gray-500">
                  Válido hasta:{' '}
                  <span className="font-semibold text-gray-700">{formatExpiry(info.expira_en)}</span>
                </span>
              </div>
            </div>
          </section>

          {/* ── Sección 2: Artículos ── */}
          {info.detalles.length > 0 && (
            <section
              aria-labelledby="items-heading"
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 id="items-heading" className="font-semibold text-dark-blue text-sm">
                  Equipos y herramientas
                </h2>
                <span className="bg-primary-blue text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {info.detalles.length}
                </span>
              </div>
              <ul className="divide-y divide-gray-50" role="list">
                {info.detalles.map((d, i) => (
                  <li key={d.id ?? i} className="px-5 py-4 flex items-start gap-3.5">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-50 text-primary-blue rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-dark-blue text-sm leading-snug">
                          {d.articulo_nombre}
                        </p>
                        <span
                          className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CONDICION_STYLE[d.condicion_salida.toLowerCase()] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {d.condicion_salida}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span className="text-xs text-gray-500">
                          Cant.:{' '}
                          <span className="font-medium text-gray-700">{Number(d.cantidad)}</span>
                        </span>
                        {d.activo_codigo && (
                          <span className="text-xs text-gray-500">
                            Cód.:{' '}
                            <span className="font-mono font-medium text-gray-700">
                              {d.activo_codigo}
                            </span>
                          </span>
                        )}
                      </div>
                      {d.notas && (
                        <p className="mt-1 text-xs text-gray-400 italic">{d.notas}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Sección 3: Declaración de recepción ── */}
          <section
            aria-labelledby="declaration-heading"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 id="declaration-heading" className="font-semibold text-dark-blue text-sm">
                Declaración de recepción
              </h2>
            </div>
            <div className="px-5 py-4">
              <blockquote className="pl-4 border-l-4 border-primary-blue">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {buildAcceptanceText(info.nombres, info.apellidos, info.detalles)}
                </p>
              </blockquote>
              <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                Al firmar confirmas tu conformidad con los equipos listados. Este registro queda almacenado en el sistema.
              </p>
            </div>
          </section>

          {/* ── Sección 4: Pad de firma ── */}
          <section
            aria-labelledby="signature-heading"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 id="signature-heading" className="font-semibold text-dark-blue text-sm">
                Tu firma
              </h2>
              {signatureFile ? (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Firma capturada
                </span>
              ) : (
                <span className="text-xs text-gray-400">Requerida</span>
              )}
            </div>
            <div className="px-5 pt-4 pb-5">
              <p className="text-xs text-gray-500 mb-3">
                Usa tu dedo o lápiz para trazar tu firma dentro del recuadro.
              </p>
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
          </section>

          {/* ── Error de envío ── */}
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            >
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm">{submitError}</p>
            </div>
          )}

        </div>

        {/* ── CTA sticky inferior ── */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={clearSignature}
                aria-label="Borrar la firma y volver a dibujar"
                className="px-4 py-3.5 rounded-xl border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50 active:scale-[0.97] transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 min-h-[48px]"
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={!signatureFile || isSubmitting}
                aria-busy={isSubmitting}
                className="flex-1 py-3.5 rounded-xl bg-primary-blue text-white font-semibold text-sm shadow-sm hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 min-h-[48px] flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                      aria-hidden="true"
                    />
                    <span>Enviando…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Confirmar recepción</span>
                  </>
                )}
              </button>
            </div>
            {!signatureFile && !isSubmitting && (
              <p className="text-center text-xs text-gray-400 mt-2" aria-live="polite">
                Dibuja tu firma arriba para habilitar este botón
              </p>
            )}
          </div>
        </div>
      </form>

    </div>
  );
};

export default PublicSignPage;
