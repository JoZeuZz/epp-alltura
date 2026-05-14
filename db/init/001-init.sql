-- EPP Alltura - Base schema (MER source of truth)
-- NOTE: this file is idempotent and safe to execute multiple times.
-- Rewritten 2026-05-14: each articulo row = one physical object (EPP, herramienta, equipo).
-- Dropped: activo, lote, stock, movimiento_stock, compra, compra_detalle, documento_compra, egreso, egreso_detalle.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- SHARED FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CORE IDENTITY
-- ============================================================

CREATE TABLE IF NOT EXISTS persona (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut VARCHAR(20) NOT NULL UNIQUE,
  nombres VARCHAR(150) NOT NULL,
  apellidos VARCHAR(150) NOT NULL,
  telefono VARCHAR(30),
  email VARCHAR(255),
  foto_url TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES persona(id) ON DELETE SET NULL,
  creado_por_admin_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  email_login VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'bloqueado')),
  ultimo_login_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trabajador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL UNIQUE REFERENCES persona(id) ON DELETE CASCADE,
  cargo VARCHAR(120),
  fecha_ingreso TIMESTAMPTZ,
  fecha_salida TIMESTAMPTZ,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(30) NOT NULL UNIQUE CHECK (nombre IN ('admin', 'supervisor')),
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS usuario_rol (
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  rol_id UUID NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, rol_id)
);

DELETE FROM usuario_rol ur
USING rol r
WHERE ur.rol_id = r.id
  AND r.nombre NOT IN ('admin', 'supervisor');

DELETE FROM rol
WHERE nombre NOT IN ('admin', 'supervisor');

ALTER TABLE rol DROP CONSTRAINT IF EXISTS rol_nombre_check;
ALTER TABLE rol ADD CONSTRAINT rol_nombre_check CHECK (nombre IN ('admin', 'supervisor'));

-- ============================================================
-- CATALOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS bodegas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  direccion TEXT,
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  cliente VARCHAR(150),
  presupuesto_clp BIGINT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'finalizado')),
  fecha_inicio DATE,
  fecha_fin DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  rut VARCHAR(20),
  email VARCHAR(255),
  telefono VARCHAR(30),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

-- articulo = physical object (EPP, herramienta, or equipo); one row per physical unit
CREATE TABLE IF NOT EXISTS articulo (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                  VARCHAR(20) NOT NULL CHECK (tipo IN ('epp', 'herramienta', 'equipo')),
  nombre                VARCHAR(150) NOT NULL,
  marca                 VARCHAR(120),
  modelo                VARCHAR(120),
  descripcion           TEXT,
  nro_serie             VARCHAR(120) NOT NULL UNIQUE,
  codigo                VARCHAR(20)  NOT NULL UNIQUE,
  valor                 INTEGER      NOT NULL DEFAULT 0 CHECK (valor >= 0),
  foto_url              TEXT,
  estado                VARCHAR(30)  NOT NULL DEFAULT 'en_stock'
                          CHECK (estado IN ('en_stock', 'asignado', 'mantencion', 'dado_de_baja', 'perdido')),
  bodega_actual_id      UUID REFERENCES bodegas(id),
  proyecto_actual_id    UUID REFERENCES proyectos(id),
  fecha_vencimiento     TIMESTAMPTZ,
  creado_por_usuario_id UUID REFERENCES usuario(id),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_articulo_ubicacion CHECK (
    NOT (bodega_actual_id IS NOT NULL AND proyecto_actual_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS articulo_especialidad (
  articulo_id  UUID NOT NULL REFERENCES articulo(id) ON DELETE CASCADE,
  especialidad VARCHAR(80) NOT NULL
    CHECK (especialidad IN ('oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida')),
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (articulo_id, especialidad)
);

-- ============================================================
-- DELIVERY / CUSTODY
-- ============================================================

CREATE TABLE IF NOT EXISTS entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  trabajador_id UUID NOT NULL REFERENCES trabajador(id),
  bodega_origen_id UUID NOT NULL REFERENCES bodegas(id),
  proyecto_destino_id UUID NOT NULL REFERENCES proyectos(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrega')),
  estado VARCHAR(25) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente_firma', 'confirmada', 'anulada', 'revertida_admin')),
  nota_destino TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmada_en TIMESTAMPTZ,
  motivo_anulacion TEXT,
  deshecha_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  deshecha_en TIMESTAMPTZ,
  fecha_devolucion_esperada TIMESTAMPTZ,
  evidencia_foto_url TEXT,
  CONSTRAINT chk_entrega_motivo_anulacion CHECK (
    estado <> 'anulada'
    OR (motivo_anulacion IS NOT NULL AND length(btrim(motivo_anulacion)) >= 5)
  )
);

CREATE TABLE IF NOT EXISTS entrega_detalle (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id       UUID NOT NULL REFERENCES entrega(id) ON DELETE CASCADE,
  articulo_id      UUID NOT NULL REFERENCES articulo(id),
  condicion_salida VARCHAR(20) NOT NULL CHECK (condicion_salida IN ('ok', 'usado', 'danado')),
  notas            TEXT
);

CREATE TABLE IF NOT EXISTS firma_entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL UNIQUE REFERENCES entrega(id) ON DELETE CASCADE,
  trabajador_id UUID NOT NULL REFERENCES trabajador(id),
  metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('en_dispositivo', 'qr_link')),
  texto_aceptacion TEXT NOT NULL,
  texto_hash VARCHAR(255) NOT NULL,
  firma_imagen_url TEXT NOT NULL,
  ip VARCHAR(64),
  user_agent TEXT,
  firmado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS firma_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES entrega(id) ON DELETE CASCADE,
  trabajador_id UUID NOT NULL REFERENCES trabajador(id),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  token_publico VARCHAR(255),
  expira_en TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ,
  usado_ip VARCHAR(64),
  usado_user_agent TEXT
);

CREATE TABLE IF NOT EXISTS custodia_activo (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id               UUID NOT NULL REFERENCES articulo(id),
  trabajador_id             UUID NOT NULL REFERENCES trabajador(id),
  proyecto_id               UUID NOT NULL REFERENCES proyectos(id),
  entrega_id                UUID NOT NULL REFERENCES entrega(id),
  desde_en                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hasta_en                  TIMESTAMPTZ,
  fecha_devolucion_esperada TIMESTAMPTZ,
  estado                    VARCHAR(20) NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'devuelta', 'perdida', 'baja', 'mantencion'))
);

-- ============================================================
-- RETURNS
-- ============================================================

CREATE TABLE IF NOT EXISTS devolucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id UUID NOT NULL REFERENCES trabajador(id),
  recibido_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  bodega_recepcion_id UUID NOT NULL REFERENCES bodegas(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente_firma', 'confirmada', 'anulada')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmada_en TIMESTAMPTZ,
  notas TEXT,
  motivo_anulacion TEXT,
  evidencia_foto_url TEXT,
  es_reversa_admin BOOLEAN NOT NULL DEFAULT FALSE,
  entrega_revertida_id UUID REFERENCES entrega(id) ON DELETE SET NULL,
  motivo_reversa TEXT,
  CONSTRAINT chk_devolucion_motivo_anulacion CHECK (
    estado <> 'anulada'
    OR (motivo_anulacion IS NOT NULL AND length(btrim(motivo_anulacion)) >= 5)
  ),
  CONSTRAINT chk_devolucion_motivo_reversa CHECK (
    es_reversa_admin = FALSE
    OR (motivo_reversa IS NOT NULL AND length(btrim(motivo_reversa)) >= 5)
  )
);

CREATE TABLE IF NOT EXISTS devolucion_detalle (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucion_id     UUID NOT NULL REFERENCES devolucion(id) ON DELETE CASCADE,
  custodia_id       UUID REFERENCES custodia_activo(id) ON DELETE SET NULL,
  articulo_id       UUID REFERENCES articulo(id) ON DELETE SET NULL,
  condicion_entrada VARCHAR(20) NOT NULL CHECK (condicion_entrada IN ('ok', 'usado', 'danado', 'perdido')),
  disposicion       VARCHAR(20) NOT NULL CHECK (disposicion IN ('devuelto', 'perdido', 'baja', 'mantencion')),
  notas             TEXT
);

CREATE TABLE IF NOT EXISTS firma_devolucion (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucion_id        UUID NOT NULL UNIQUE REFERENCES devolucion(id) ON DELETE CASCADE,
  receptor_usuario_id  UUID NOT NULL REFERENCES usuario(id),
  metodo               VARCHAR(20) NOT NULL CHECK (metodo IN ('en_dispositivo', 'qr_link')),
  texto_aceptacion     TEXT NOT NULL,
  texto_hash           VARCHAR(255) NOT NULL,
  firma_imagen_url     TEXT NOT NULL,
  ip                   VARCHAR(64),
  user_agent           TEXT,
  firmado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS firma_token_devolucion (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucion_id         UUID NOT NULL REFERENCES devolucion(id) ON DELETE CASCADE,
  trabajador_id         UUID NOT NULL REFERENCES trabajador(id),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  token_hash            VARCHAR(255) NOT NULL UNIQUE,
  token_publico         VARCHAR(255),
  expira_en             TIMESTAMPTZ NOT NULL,
  usado_en              TIMESTAMPTZ,
  usado_ip              VARCHAR(64),
  usado_user_agent      TEXT
);

-- Circular FK: entrega.devolucion_reversa_id -> devolucion (resolved after both tables exist)
ALTER TABLE entrega
  ADD COLUMN IF NOT EXISTS devolucion_reversa_id UUID REFERENCES devolucion(id) ON DELETE SET NULL;

-- ============================================================
-- MOVEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS movimiento_activo (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id            UUID NOT NULL REFERENCES articulo(id),
  fecha_movimiento       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo                   VARCHAR(20) NOT NULL
    CHECK (tipo IN ('entrada', 'entrega', 'devolucion', 'ajuste', 'baja', 'mantencion', 'reubicacion')),
  bodega_origen_id       UUID REFERENCES bodegas(id) ON DELETE SET NULL,
  proyecto_origen_id     UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  bodega_destino_id      UUID REFERENCES bodegas(id) ON DELETE SET NULL,
  proyecto_destino_id    UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  responsable_usuario_id UUID NOT NULL REFERENCES usuario(id),
  entrega_id             UUID REFERENCES entrega(id) ON DELETE SET NULL,
  devolucion_id          UUID REFERENCES devolucion(id) ON DELETE SET NULL,
  notas                  TEXT,
  CONSTRAINT chk_ma_origen  CHECK (bodega_origen_id IS NULL OR proyecto_origen_id IS NULL),
  CONSTRAINT chk_ma_destino CHECK (bodega_destino_id IS NULL OR proyecto_destino_id IS NULL)
);

-- ============================================================
-- QUALITY / DOCUMENTS / AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS inspeccion_activo (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id            UUID NOT NULL REFERENCES articulo(id),
  fecha_inspeccion       TIMESTAMPTZ NOT NULL,
  tipo                   VARCHAR(20) NOT NULL CHECK (tipo IN ('inspeccion', 'calibracion')),
  estado_resultado       VARCHAR(20) NOT NULL CHECK (estado_resultado IN ('bueno', 'malo', 'baja')),
  fecha_proxima          TIMESTAMPTZ,
  responsable_usuario_id UUID NOT NULL REFERENCES usuario(id),
  notas                  TEXT,
  evidencia_url          TEXT
);

CREATE TABLE IF NOT EXISTS documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(25) NOT NULL CHECK (tipo IN ('acta_entrega', 'acta_devolucion', 'informe')),
  archivo_url TEXT NOT NULL,
  archivo_hash VARCHAR(255),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS documento_referencia (
  documento_id UUID NOT NULL REFERENCES documento(id) ON DELETE CASCADE,
  entidad_tipo VARCHAR(20) NOT NULL CHECK (entidad_tipo IN ('entrega', 'devolucion', 'articulo', 'trabajador')),
  entidad_id UUID NOT NULL,
  PRIMARY KEY (documento_id, entidad_tipo, entidad_id)
);

CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id UUID NOT NULL,
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('crear', 'actualizar', 'eliminar', 'firmar', 'devolver', 'ajustar')),
  diff_json JSONB,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  ip VARCHAR(64),
  user_agent TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Core identity
CREATE INDEX IF NOT EXISTS idx_usuario_persona_id ON usuario(persona_id);
CREATE INDEX IF NOT EXISTS idx_usuario_email_login ON usuario(email_login);
CREATE INDEX IF NOT EXISTS idx_usuario_estado ON usuario(estado);
CREATE INDEX IF NOT EXISTS idx_usuario_creado_por_admin_id ON usuario(creado_por_admin_id) WHERE creado_por_admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trabajador_estado ON trabajador(estado);

-- Catalogs
CREATE INDEX IF NOT EXISTS idx_bodegas_estado ON bodegas(estado);
CREATE INDEX IF NOT EXISTS idx_proyectos_estado ON proyectos(estado);
CREATE INDEX IF NOT EXISTS idx_proyectos_fecha_inicio ON proyectos(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_proyectos_fecha_fin ON proyectos(fecha_fin);

CREATE INDEX IF NOT EXISTS idx_articulo_tipo ON articulo(tipo);
CREATE INDEX IF NOT EXISTS idx_articulo_estado ON articulo(estado);
CREATE INDEX IF NOT EXISTS idx_articulo_bodega_actual_id ON articulo(bodega_actual_id) WHERE bodega_actual_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articulo_proyecto_actual_id ON articulo(proyecto_actual_id) WHERE proyecto_actual_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articulo_especialidad_especialidad ON articulo_especialidad(especialidad);

-- Delivery / custody
CREATE INDEX IF NOT EXISTS idx_entrega_trabajador_id ON entrega(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_entrega_creado_por_usuario_id ON entrega(creado_por_usuario_id);
CREATE INDEX IF NOT EXISTS idx_entrega_estado ON entrega(estado);
CREATE INDEX IF NOT EXISTS idx_entrega_tipo ON entrega(tipo);
CREATE INDEX IF NOT EXISTS idx_entrega_estado_motivo_anulacion ON entrega(estado, creado_en DESC) WHERE estado = 'anulada';
CREATE INDEX IF NOT EXISTS idx_entrega_estado_revertida ON entrega(estado, deshecha_en DESC) WHERE estado = 'revertida_admin';
CREATE INDEX IF NOT EXISTS idx_entrega_detalle_entrega_id ON entrega_detalle(entrega_id);
CREATE INDEX IF NOT EXISTS idx_entrega_detalle_articulo_id ON entrega_detalle(articulo_id);

CREATE INDEX IF NOT EXISTS idx_firma_token_entrega_id ON firma_token(entrega_id);
CREATE INDEX IF NOT EXISTS idx_firma_token_trabajador_id ON firma_token(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_firma_token_expira_en ON firma_token(expira_en);
CREATE INDEX IF NOT EXISTS idx_firma_token_usado_en ON firma_token(usado_en);
CREATE UNIQUE INDEX IF NOT EXISTS ux_firma_token_token_publico ON firma_token(token_publico) WHERE token_publico IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_custodia_activo_articulo_estado_desde ON custodia_activo(articulo_id, estado, desde_en DESC);
CREATE INDEX IF NOT EXISTS idx_custodia_activo_trabajador_id ON custodia_activo(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_custodia_activo_estado ON custodia_activo(estado);
CREATE INDEX IF NOT EXISTS idx_custodia_activo_entrega_id ON custodia_activo(entrega_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_custodia_activo_activa_por_articulo ON custodia_activo(articulo_id) WHERE estado = 'activa';

-- Returns
CREATE INDEX IF NOT EXISTS idx_devolucion_trabajador_id ON devolucion(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_recibido_por_usuario_id ON devolucion(recibido_por_usuario_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_estado ON devolucion(estado);
CREATE INDEX IF NOT EXISTS idx_devolucion_estado_motivo_anulacion ON devolucion(estado, creado_en DESC) WHERE estado = 'anulada';
CREATE INDEX IF NOT EXISTS idx_devolucion_entrega_revertida_id ON devolucion(entrega_revertida_id) WHERE entrega_revertida_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devolucion_detalle_devolucion_id ON devolucion_detalle(devolucion_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_detalle_custodia_id ON devolucion_detalle(custodia_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_detalle_articulo_id ON devolucion_detalle(articulo_id);

CREATE INDEX IF NOT EXISTS idx_firma_token_devolucion_devolucion_id ON firma_token_devolucion(devolucion_id);
CREATE INDEX IF NOT EXISTS idx_firma_token_devolucion_trabajador_id ON firma_token_devolucion(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_firma_token_devolucion_expira_en ON firma_token_devolucion(expira_en);
CREATE UNIQUE INDEX IF NOT EXISTS ux_firma_token_devolucion_token_publico ON firma_token_devolucion(token_publico) WHERE token_publico IS NOT NULL;

-- Movements
CREATE INDEX IF NOT EXISTS idx_movimiento_activo_articulo_id ON movimiento_activo(articulo_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_activo_fecha ON movimiento_activo(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_movimiento_activo_tipo ON movimiento_activo(tipo);
CREATE INDEX IF NOT EXISTS idx_movimiento_activo_responsable ON movimiento_activo(responsable_usuario_id);

-- Quality / documents / audit
CREATE INDEX IF NOT EXISTS idx_inspeccion_activo_articulo_id ON inspeccion_activo(articulo_id);
CREATE INDEX IF NOT EXISTS idx_inspeccion_activo_fecha ON inspeccion_activo(fecha_inspeccion DESC);
CREATE INDEX IF NOT EXISTS idx_inspeccion_activo_responsable ON inspeccion_activo(responsable_usuario_id);

CREATE INDEX IF NOT EXISTS idx_documento_tipo ON documento(tipo);
CREATE INDEX IF NOT EXISTS idx_documento_creado_por ON documento(creado_por_usuario_id);
CREATE INDEX IF NOT EXISTS idx_documento_referencia_tipo_entidad ON documento_referencia(entidad_tipo, entidad_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_creado_en ON auditoria(creado_en DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_persona_actualizado_en') THEN
    CREATE TRIGGER trg_persona_actualizado_en
      BEFORE UPDATE ON persona
      FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_usuario_actualizado_en') THEN
    CREATE TRIGGER trg_usuario_actualizado_en
      BEFORE UPDATE ON usuario
      FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_trabajador_actualizado_en') THEN
    CREATE TRIGGER trg_trabajador_actualizado_en
      BEFORE UPDATE ON trabajador
      FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bodegas_actualizado_en') THEN
    CREATE TRIGGER trg_bodegas_actualizado_en
      BEFORE UPDATE ON bodegas
      FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_proyectos_actualizado_en') THEN
    CREATE TRIGGER trg_proyectos_actualizado_en
      BEFORE UPDATE ON proyectos
      FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
  END IF;
END $$;

-- ============================================================
-- SEED BASE ROLES
-- ============================================================

INSERT INTO rol (nombre, descripcion)
VALUES
  ('admin', 'Administracion global del sistema'),
  ('supervisor', 'Supervision operacional y gestion de inventario, entrega y devolucion')
ON CONFLICT (nombre) DO NOTHING;
