import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import css from './DevPanel.module.css';
import {
  exportEntity,
  importEntity,
  readJsonFile,
  type DevEntity,
} from '../services/devService';

interface Entity {
  key: DevEntity;
  label: string;
  desc: string;
  num: string;
}

const ENTITIES: Entity[] = [
  { key: 'articulos',    label: 'artículos',    desc: 'epp · equipos · herramientas — estado, bodega, especialidades', num: '01' },
  { key: 'trabajadores', label: 'trabajadores', desc: 'entidades de personal — sin credenciales de login',             num: '02' },
  { key: 'proyectos',    label: 'proyectos',    desc: 'ubicaciones de proyecto activas e inactivas',                   num: '03' },
  { key: 'bodegas',      label: 'bodegas',      desc: 'bodegas con ciudad y estado',                                   num: '04' },
];

interface ConfirmState {
  entity: DevEntity;
  data: unknown[];
}

export default function DevPanel() {
  const navigate = useNavigate();
  const fileInputRefs = useRef<Record<DevEntity, HTMLInputElement | null>>({
    articulos: null, trabajadores: null, proyectos: null, bodegas: null,
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [status, setStatus]   = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const goBack = useCallback(() => navigate(-1), [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') goBack(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goBack]);

  const setEntityLoading = (key: string, val: boolean) =>
    setLoading(prev => ({ ...prev, [key]: val }));

  const setEntityStatus = (key: string, msg: string) =>
    setStatus(prev => ({ ...prev, [key]: msg }));

  const handleExport = async (entity: DevEntity) => {
    setEntityLoading(`exp_${entity}`, true);
    setEntityStatus(entity, '');
    try {
      await exportEntity(entity);
      setEntityStatus(entity, `✓ exportado`);
    } catch {
      setEntityStatus(entity, `✗ error al exportar`);
    } finally {
      setEntityLoading(`exp_${entity}`, false);
    }
  };

  const handleImportClick = (entity: DevEntity) => {
    fileInputRefs.current[entity]?.click();
  };

  const handleFileChange = async (entity: DevEntity, file: File | null) => {
    if (!file) return;
    setEntityStatus(entity, '');
    try {
      const rows = await readJsonFile(file);
      setConfirm({ entity, data: rows });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al leer archivo';
      setEntityStatus(entity, `✗ ${msg}`);
    }
    const input = fileInputRefs.current[entity];
    if (input) input.value = '';
  };

  const handleConfirmImport = async () => {
    if (!confirm) return;
    const { entity, data } = confirm;
    setConfirm(null);
    setEntityLoading(`imp_${entity}`, true);
    setEntityStatus(entity, '');
    try {
      const result = await importEntity(entity, data);
      const errCount = result.errors?.length ?? 0;
      const msg = `✓ insertados ${result.inserted} · actualizados ${result.updated}` +
                  (errCount > 0 ? ` · errores ${errCount}` : '');
      setEntityStatus(entity, msg);
    } catch {
      setEntityStatus(entity, '✗ error al importar');
    } finally {
      setEntityLoading(`imp_${entity}`, false);
    }
  };

  return (
    <div className={css.root}>
      {/* Confirm modal */}
      {confirm && (
        <div className={css.modalOverlay}>
          <div className={css.modalBox}>
            <div className={css.modalTitle}>Confirmar importación</div>
            <div className={css.modalBody}>
              Se importarán <strong>{confirm.data.length} registros</strong> de{' '}
              <strong>{confirm.entity}</strong> en producción.
              <br /><br />
              Esta operación modifica datos reales de forma permanente. Los registros existentes
              serán actualizados; los nuevos serán insertados.
            </div>
            <div className={css.modalActions}>
              <button className={css.btnCancel} onClick={() => setConfirm(null)}>
                Cancelar
              </button>
              <button className={css.btnConfirmImport} onClick={handleConfirmImport}>
                Confirmar importación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <header className={css.topbar}>
        <div className={css.topbarLeft}>
          <span className={css.alert}>▶ ACCESO RESTRINGIDO</span>
          <span>|</span>
          <span>epp-alltura · dev_panel · rol: admin</span>
        </div>
        <button className={css.exitBtn} onClick={goBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Volver a la app
          <span className={css.kbdHint}>ESC</span>
        </button>
      </header>

      <main className={css.main}>
        {/* ASCII title + boot log */}
        <div className={css.bootHeader}>
          <pre className={css.asciiTitle}>{`\
 ██████╗ ███████╗██╗   ██╗    ██████╗  █████╗ ███╗   ██╗███████╗██╗
 ██╔══██╗██╔════╝██║   ██║    ██╔══██╗██╔══██╗████╗  ██║██╔════╝██║
 ██║  ██║█████╗  ██║   ██║    ██████╔╝███████║██╔██╗ ██║█████╗  ██║
 ██║  ██║██╔══╝  ╚██╗ ██╔╝    ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║
 ██████╔╝███████╗ ╚████╔╝     ██║     ██║  ██║██║ ╚████║███████╗███████╗
 ╚═════╝ ╚══════╝  ╚═══╝      ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝`}</pre>

          <div>
            {[
              { ts: '0.001', type: 'ok',   txt: 'Iniciando zona de desarrollador...',                    cls: css.blTxt },
              { ts: '0.012', type: 'ok',   txt: 'Verificando rol admin — autorizado',                     cls: css.blTxt },
              { ts: '0.024', type: 'ok',   txt: 'Cargando módulos de exportación/importación',            cls: css.blTxt },
              { ts: '0.038', type: 'warn', txt: 'Entorno: PRODUCCIÓN — datos reales activos',             cls: css.blTxtWarn },
              { ts: '0.041', type: 'err',  txt: 'Importar sobreescribe datos de producción permanentemente', cls: css.blTxtErr },
              { ts: '0.055', type: 'ok',   txt: 'Sistema listo',                                          cls: css.blTxt },
            ].map((line, i) => (
              <div key={i} className={css.bootLine}>
                <span className={css.blTs}>[ {line.ts} ]</span>
                <span className={line.type === 'ok' ? css.blOk : line.type === 'warn' ? css.blWarn : css.blErr}>
                  {line.type === 'ok' ? ' OK ' : 'WARN'}
                </span>
                <span className={line.cls}>{line.txt}</span>
              </div>
            ))}
            <div className={css.bootLine} style={{ marginTop: 6 }}>
              <span className={css.blTxt}>_<span className={css.cursor} /></span>
            </div>
          </div>
        </div>

        {/* Export / Import */}
        <div className={css.divider}>
          <span className={css.dividerTxt}>$ exportar · importar datos</span>
          <span className={css.dividerLine} />
        </div>

        <div className={css.cmdPrompt}>
          <span className={css.pUser}>admin@epp-alltura</span>
          <span className={css.pSym}>:</span>
          <span className={css.pCmd}>~$ dev data-manager --list</span>
        </div>

        <table className={css.entityTable}>
          <tbody>
            {ENTITIES.map(({ key, label, desc, num }) => (
              <tr key={key} className={css.entityRow}>
                <td className={css.tdNum}>{num}</td>
                <td className={css.tdName}>
                  <span className={css.statusDot} />
                  {label}
                </td>
                <td className={css.tdMeta}>{desc}</td>
                <td className={css.tdActs}>
                  <input
                    ref={(el) => { fileInputRefs.current[key] = el; }}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(key, e.target.files?.[0] ?? null)}
                  />
                  <button
                    className={css.actBtn}
                    disabled={!!loading[`exp_${key}`]}
                    onClick={() => handleExport(key)}
                  >
                    {loading[`exp_${key}`] ? '...' : '↓ export'}
                  </button>
                  <button
                    className={`${css.actBtn} ${css.imp}`}
                    disabled={!!loading[`imp_${key}`]}
                    onClick={() => handleImportClick(key)}
                  >
                    {loading[`imp_${key}`] ? '...' : '↑ import'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Inline status per entity */}
        {ENTITIES.map(({ key }) =>
          status[key] ? (
            <div
              key={key}
              className={`${css.inlineStatus} ${
                status[key].startsWith('✗') ? css.inlineStatusErr : css.inlineStatusOk
              }`}
            >
              {status[key]}
            </div>
          ) : null
        )}

        {/* Credits */}
        <div className={css.divider} style={{ marginTop: 40 }}>
          <span className={css.dividerTxt}>$ cat about_dev.json</span>
          <span className={css.dividerLine} />
        </div>

        <div className={css.creditsBlock}>
          <div className={css.creditsInner}>
            <div className={css.avatarArt}>
              <span className={css.avatarArtHi}>{`  .-"""-.
 /        \\
|  O    O  |
|    __    |
 \\  \\__/  /
  '------'`}</span>
            </div>
            <div className={css.creditsJson}>
              {[
                <span key={0}><span className={css.jBrace}>{'{'}</span></span>,
                <span key={1}><span className={css.jIndent}/><span className={css.jKey}>"nombre"</span><span className={css.jBrace}>: </span><span className={css.jStr}>"José Rodríguez"</span><span className={css.jComma}>,</span></span>,
                <span key={2}><span className={css.jIndent}/><span className={css.jKey}>"rol"</span><span className={css.jBrace}>: </span><span className={css.jStr}>"Ingeniero Civil Informático · Full-stack developer"</span><span className={css.jComma}>,</span></span>,
                <span key={3}><span className={css.jIndent}/><span className={css.jKey}>"github"</span><span className={css.jBrace}>: </span><a href="https://github.com/JoZeuZz" target="_blank" rel="noreferrer" className={css.jUrl}>"https://github.com/JoZeuZz"</a><span className={css.jComma}>,</span></span>,
                <span key={4}><span className={css.jIndent}/><span className={css.jKey}>"email"</span><span className={css.jBrace}>: </span><a href="mailto:joserodriguez.civilinformatico@gmail.com" className={css.jUrl}>"joserodriguez.civilinformatico@gmail.com"</a><span className={css.jComma}>,</span></span>,
                <span key={5}><span className={css.jIndent}/><span className={css.jKey}>"proyecto"</span><span className={css.jBrace}>: </span><span className={css.jStr}>"epp-alltura"</span><span className={css.jComma}>,</span></span>,
                <span key={6}><span className={css.jIndent}/><span className={css.jKey}>"version"</span><span className={css.jBrace}>: </span><span className={css.jNum}>"0.1.0"</span></span>,
                <span key={7}><span className={css.jBrace}>{'}'}</span></span>,
                <span key={8}><span className={css.blTs}>admin@epp-alltura:~$ <span className={css.cursor}/></span></span>,
              ].map((content, i) => (
                <div key={i} className={css.jsonLine}>{content}</div>
              ))}
            </div>
          </div>
        </div>

        <div className={css.termFooter}>
          <span>epp-alltura · dev_panel · v0.1.0</span>
          <span>acceso: logo ×5 · TTY1 · $(whoami) = admin</span>
        </div>
      </main>
    </div>
  );
}
