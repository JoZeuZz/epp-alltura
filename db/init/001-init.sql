-- EPP Alltura - Base schema (MER source of truth)
-- NOTE: this file is idempotent and safe to execute multiple times.
-- Consolidated from migrations 001-013 on 2026-03-25.

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
  usuario_id UUID UNIQUE REFERENCES usuario(id) ON DELETE SET NULL,
  cargo VARCHAR(120),
  fecha_ingreso TIMESTAMPTZ,
  fecha_salida TIMESTAMPTZ,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(30) NOT NULL UNIQUE CHECK (nombre IN ('admin', 'supervisor', 'bodega', 'trabajador')),
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS usuario_rol (
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  rol_id UUID NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, rol_id)
);

-- ============================================================
-- CATALOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS ubicacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('bodega', 'planta', 'proyecto', 'taller_mantencion')),
  ubicacion_subtipo VARCHAR(20) CHECK (ubicacion_subtipo IN ('fija', 'transitoria')),
  cliente VARCHAR(150),
  direccion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  fecha_inicio_operacion TIMESTAMPTZ,
  fecha_cierre_operacion TIMESTAMPTZ,
  planta_padre_id UUID REFERENCES ubicacion(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ubicacion_subtipo_bodega CHECK (
    (tipo = 'bodega' AND ubicacion_subtipo IS NOT NULL)
    OR (tipo <> 'bodega' AND ubicacion_subtipo IS NULL)
  ),
  CONSTRAINT chk_ubicacion_vigencia CHECK (
    fecha_cierre_operacion IS NULL
    OR fecha_inicio_operacion IS NULL
    OR fecha_cierre_operacion >= fecha_inicio_operacion
  )
);

CREATE TABLE IF NOT EXISTS proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  rut VARCHAR(20),
  email VARCHAR(255),
  telefono VARCHAR(30),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

CREATE TABLE IF NOT EXISTS articulo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('equipo', 'herramienta')),
  grupo_principal VARCHAR(20) NOT NULL DEFAULT 'herramienta' CHECK (grupo_principal IN ('equipo', 'herramienta')),
  nombre VARCHAR(150) NOT NULL,
  marca VARCHAR(120),
  modelo VARCHAR(120),
  categoria VARCHAR(120) CHECK (categoria IN ('epp', 'medicion_ensayos', 'manual', 'electrica_cable', 'inalambrica_bateria')),
  subclasificacion VARCHAR(120) NOT NULL CHECK (subclasificacion IN ('epp', 'medicion_ensayos', 'manual', 'electrica_cable', 'inalambrica_bateria')),
  tracking_mode VARCHAR(20) NOT NULL CHECK (tracking_mode IN ('serial', 'lote')),
  retorno_mode VARCHAR(20) NOT NULL CHECK (retorno_mode IN ('retornable')),
  nivel_control VARCHAR(20) NOT NULL CHECK (nivel_control IN ('alto', 'medio', 'bajo', 'fuera_scope')),
  requiere_vencimiento BOOLEAN NOT NULL DEFAULT FALSE,
  unidad_medida VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_articulo_grupo_subclasificacion CHECK (
    (grupo_principal = 'equipo' AND subclasificacion IN ('epp', 'medicion_ensayos'))
    OR (grupo_principal = 'herramienta' AND subclasificacion IN ('manual', 'electrica_cable', 'inalambrica_bateria'))
  )
);

-- Compatibilidad idempotente para bases previas al catálogo V2.
ALTER TABLE articulo
  ADD COLUMN IF NOT EXISTS grupo_principal VARCHAR(20),
  ADD COLUMN IF NOT EXISTS subclasificacion VARCHAR(120);

ALTER TABLE articulo DROP CONSTRAINT IF EXISTS articulo_tipo_check;
ALTER TABLE articulo DROP CONSTRAINT IF EXISTS articulo_grupo_principal_check;
ALTER TABLE articulo DROP CONSTRAINT IF EXISTS articulo_categoria_check;
ALTER TABLE articulo DROP CONSTRAINT IF EXISTS articulo_subclasificacion_check;
ALTER TABLE articulo DROP CONSTRAINT IF EXISTS articulo_retorno_mode_check;
ALTER TABLE articulo DROP CONSTRAINT IF EXISTS chk_articulo_grupo_subclasificacion;

UPDATE articulo
SET tipo = CASE
  WHEN lower(tipo) = 'herramienta' THEN 'herramienta'
  ELSE 'equipo'
END;

UPDATE articulo
SET grupo_principal = CASE
  WHEN lower(tipo) = 'herramienta' THEN 'herramienta'
  WHEN lower(COALESCE(grupo_principal, '')) = 'herramienta' THEN 'herramienta'
  ELSE 'equipo'
END;

UPDATE articulo
SET subclasificacion = CASE
  WHEN lower(COALESCE(subclasificacion, '')) IN ('epp', 'medicion_ensayos', 'manual', 'electrica_cable', 'inalambrica_bateria')
    THEN lower(subclasificacion)
  WHEN lower(COALESCE(categoria, '')) IN ('epp', 'medicion_ensayos', 'manual', 'electrica_cable', 'inalambrica_bateria')
    THEN lower(categoria)
  WHEN lower(tipo) = 'herramienta' THEN 'manual'
  ELSE 'epp'
END;

UPDATE articulo
SET categoria = subclasificacion
WHERE categoria IS NULL
  OR lower(COALESCE(categoria, '')) NOT IN ('epp', 'medicion_ensayos', 'manual', 'electrica_cable', 'inalambrica_bateria');

UPDATE articulo
SET retorno_mode = 'retornable';

ALTER TABLE articulo ALTER COLUMN grupo_principal SET DEFAULT 'herramienta';
ALTER TABLE articulo ALTER COLUMN grupo_principal SET NOT NULL;
ALTER TABLE articulo ALTER COLUMN subclasificacion SET NOT NULL;

ALTER TABLE articulo
  ADD CONSTRAINT articulo_tipo_check
    CHECK (tipo IN ('equipo', 'herramienta'));

ALTER TABLE articulo
  ADD CONSTRAINT articulo_grupo_principal_check
    CHECK (grupo_principal IN ('equipo', 'herramienta'));

ALTER TABLE articulo
  ADD CONSTRAINT articulo_categoria_check
    CHECK (categoria IN ('epp', 'medicion_ensayos', 'manual', 'electrica_cable', 'inalambrica_bateria'));

ALTER TABLE articulo
  ADD CONSTRAINT articulo_subclasificacion_check
    CHECK (subclasificacion IN ('epp', 'medicion_ensayos', 'manual', 'electrica_cable', 'inalambrica_bateria'));

ALTER TABLE articulo
  ADD CONSTRAINT articulo_retorno_mode_check
    CHECK (retorno_mode IN ('retornable'));

ALTER TABLE articulo
  ADD CONSTRAINT chk_articulo_grupo_subclasificacion
    CHECK (
      (grupo_principal = 'equipo' AND subclasificacion IN ('epp', 'medicion_ensayos'))
      OR (grupo_principal = 'herramienta' AND subclasificacion IN ('manual', 'electrica_cable', 'inalambrica_bateria'))
    );

CREATE TABLE IF NOT EXISTS articulo_especialidad (
  articulo_id UUID NOT NULL REFERENCES articulo(id) ON DELETE CASCADE,
  especialidad VARCHAR(80) NOT NULL CHECK (especialidad IN ('oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (articulo_id, especialidad)
);

-- ============================================================
-- PURCHASES
-- ============================================================

CREATE TABLE IF NOT EXISTS documento_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedor(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('factura', 'boleta', 'guia')),
  numero VARCHAR(80) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL,
  archivo_url TEXT,
  UNIQUE (tipo, numero)
);

CREATE TABLE IF NOT EXISTS compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_compra_id UUID REFERENCES documento_compra(id) ON DELETE SET NULL,
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT
);

CREATE TABLE IF NOT EXISTS compra_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES compra(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulo(id),
  cantidad NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  costo_unitario INTEGER NOT NULL CHECK (costo_unitario >= 0),
  notas TEXT,
  CONSTRAINT chk_compra_detalle_cantidad_entera CHECK (cantidad = trunc(cantidad))
);

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id UUID NOT NULL REFERENCES articulo(id),
  compra_detalle_id UUID REFERENCES compra_detalle(id) ON DELETE SET NULL,
  codigo_lote VARCHAR(100),
  fecha_fabricacion TIMESTAMPTZ,
  fecha_vencimiento TIMESTAMPTZ,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'agotado', 'vencido')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id UUID NOT NULL REFERENCES articulo(id),
  compra_detalle_id UUID REFERENCES compra_detalle(id) ON DELETE SET NULL,
  nro_serie VARCHAR(120) UNIQUE,
  codigo VARCHAR(120) NOT NULL UNIQUE,
  valor INTEGER,
  estado VARCHAR(30) NOT NULL DEFAULT 'en_stock' CHECK (estado IN ('en_stock', 'asignado', 'mantencion', 'dado_de_baja', 'perdido')),
  ubicacion_actual_id UUID NOT NULL REFERENCES ubicacion(id),
  fecha_compra TIMESTAMPTZ,
  fecha_vencimiento TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ubicacion_id UUID NOT NULL REFERENCES ubicacion(id),
  articulo_id UUID NOT NULL REFERENCES articulo(id),
  lote_id UUID REFERENCES lote(id) ON DELETE SET NULL,
  cantidad_disponible NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
  cantidad_reservada NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (cantidad_reservada >= 0),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_stock_cantidad_disponible_entera CHECK (cantidad_disponible = trunc(cantidad_disponible)),
  CONSTRAINT chk_stock_cantidad_reservada_entera CHECK (cantidad_reservada = trunc(cantidad_reservada))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_ubicacion_articulo_lote
  ON stock (ubicacion_id, articulo_id, lote_id)
  WHERE lote_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_ubicacion_articulo_sin_lote
  ON stock (ubicacion_id, articulo_id)
  WHERE lote_id IS NULL;

-- ============================================================
-- DELIVERY / CUSTODY
-- ============================================================

CREATE TABLE IF NOT EXISTS entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  trabajador_id UUID NOT NULL REFERENCES trabajador(id),
  ubicacion_origen_id UUID NOT NULL REFERENCES ubicacion(id),
  ubicacion_destino_id UUID NOT NULL REFERENCES ubicacion(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrega')),
  estado VARCHAR(25) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente_firma', 'confirmada', 'anulada', 'revertida_admin')),
  nota_destino TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmada_en TIMESTAMPTZ,
  motivo_anulacion TEXT,
  deshecha_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  deshecha_en TIMESTAMPTZ,
  fecha_devolucion_esperada TIMESTAMPTZ,
  CONSTRAINT chk_entrega_motivo_anulacion CHECK (
    estado <> 'anulada'
    OR (motivo_anulacion IS NOT NULL AND length(btrim(motivo_anulacion)) >= 5)
  )
);

CREATE TABLE IF NOT EXISTS entrega_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES entrega(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulo(id),
  activo_id UUID REFERENCES activo(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lote(id) ON DELETE SET NULL,
  cantidad NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  tipo_item_entrega VARCHAR(20) NOT NULL CHECK (tipo_item_entrega IN ('retornable', 'asignacion')),
  condicion_salida VARCHAR(20) NOT NULL CHECK (condicion_salida IN ('ok', 'usado', 'danado')),
  notas TEXT,
  CONSTRAINT chk_entrega_detalle_cantidad_entera CHECK (cantidad = trunc(cantidad))
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id UUID NOT NULL REFERENCES activo(id),
  trabajador_id UUID NOT NULL REFERENCES trabajador(id),
  ubicacion_destino_id UUID NOT NULL REFERENCES ubicacion(id),
  entrega_id UUID NOT NULL REFERENCES entrega(id),
  desde_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hasta_en TIMESTAMPTZ,
  fecha_devolucion_esperada TIMESTAMPTZ,
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('activa', 'devuelta', 'perdida', 'baja', 'mantencion'))
);

-- ============================================================
-- RETURNS
-- ============================================================

CREATE TABLE IF NOT EXISTS devolucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id UUID NOT NULL REFERENCES trabajador(id),
  recibido_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  ubicacion_recepcion_id UUID NOT NULL REFERENCES ubicacion(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente_firma', 'confirmada', 'anulada')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmada_en TIMESTAMPTZ,
  notas TEXT,
  motivo_anulacion TEXT,
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucion_id UUID NOT NULL REFERENCES devolucion(id) ON DELETE CASCADE,
  custodia_activo_id UUID REFERENCES custodia_activo(id) ON DELETE SET NULL,
  articulo_id UUID REFERENCES articulo(id) ON DELETE SET NULL,
  activo_id UUID REFERENCES activo(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lote(id) ON DELETE SET NULL,
  cantidad NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  condicion_entrada VARCHAR(20) NOT NULL CHECK (condicion_entrada IN ('ok', 'usado', 'danado', 'perdido')),
  disposicion VARCHAR(20) NOT NULL CHECK (disposicion IN ('devuelto', 'perdido', 'baja', 'mantencion')),
  notas TEXT,
  CONSTRAINT chk_devolucion_detalle_cantidad_entera CHECK (cantidad = trunc(cantidad))
);

CREATE TABLE IF NOT EXISTS firma_devolucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucion_id UUID NOT NULL UNIQUE REFERENCES devolucion(id) ON DELETE CASCADE,
  receptor_usuario_id UUID NOT NULL REFERENCES usuario(id),
  metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('en_dispositivo')),
  texto_aceptacion TEXT NOT NULL,
  texto_hash VARCHAR(255) NOT NULL,
  firma_imagen_url TEXT NOT NULL,
  ip VARCHAR(64),
  user_agent TEXT,
  firmado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circular FK: entrega.devolucion_reversa_id -> devolucion (resolved after both tables exist)
ALTER TABLE entrega
  ADD COLUMN IF NOT EXISTS devolucion_reversa_id UUID REFERENCES devolucion(id) ON DELETE SET NULL;

-- ============================================================
-- EGRESOS
-- ============================================================

CREATE TABLE IF NOT EXISTS egreso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  tipo_motivo VARCHAR(20) NOT NULL CHECK (tipo_motivo IN ('salida', 'baja', 'consumo', 'ajuste')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT
);

CREATE TABLE IF NOT EXISTS egreso_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  egreso_id UUID NOT NULL REFERENCES egreso(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulo(id),
  ubicacion_id UUID NOT NULL REFERENCES ubicacion(id),
  lote_id UUID REFERENCES lote(id) ON DELETE SET NULL,
  cantidad NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  notas TEXT,
  activo_id UUID REFERENCES activo(id) ON DELETE SET NULL,
  CONSTRAINT chk_egreso_detalle_cantidad_entera CHECK (cantidad = trunc(cantidad))
);

-- ============================================================
-- MOVEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS movimiento_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id UUID NOT NULL REFERENCES articulo(id),
  lote_id UUID REFERENCES lote(id) ON DELETE SET NULL,
  fecha_movimiento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'baja', 'consumo', 'entrega', 'devolucion')),
  ubicacion_origen_id UUID REFERENCES ubicacion(id) ON DELETE SET NULL,
  ubicacion_destino_id UUID REFERENCES ubicacion(id) ON DELETE SET NULL,
  cantidad NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  responsable_usuario_id UUID NOT NULL REFERENCES usuario(id),
  compra_id UUID REFERENCES compra(id) ON DELETE SET NULL,
  entrega_id UUID REFERENCES entrega(id) ON DELETE SET NULL,
  devolucion_id UUID REFERENCES devolucion(id) ON DELETE SET NULL,
  egreso_id UUID REFERENCES egreso(id) ON DELETE SET NULL,
  notas TEXT,
  CONSTRAINT chk_movimiento_stock_cantidad_entera CHECK (cantidad = trunc(cantidad))
);

CREATE TABLE IF NOT EXISTS movimiento_activo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id UUID NOT NULL REFERENCES activo(id),
  fecha_movimiento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'entrega', 'devolucion', 'ajuste', 'baja', 'mantencion')),
  ubicacion_origen_id UUID REFERENCES ubicacion(id) ON DELETE SET NULL,
  ubicacion_destino_id UUID REFERENCES ubicacion(id) ON DELETE SET NULL,
  responsable_usuario_id UUID NOT NULL REFERENCES usuario(id),
  entrega_id UUID REFERENCES entrega(id) ON DELETE SET NULL,
  devolucion_id UUID REFERENCES devolucion(id) ON DELETE SET NULL,
  egreso_id UUID REFERENCES egreso(id) ON DELETE SET NULL,
  notas TEXT
);

-- ============================================================
-- QUALITY / DOCUMENTS / AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS inspeccion_activo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id UUID NOT NULL REFERENCES activo(id),
  fecha_inspeccion TIMESTAMPTZ NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('inspeccion', 'calibracion')),
  estado_resultado VARCHAR(20) NOT NULL CHECK (estado_resultado IN ('bueno', 'malo', 'baja')),
  fecha_proxima TIMESTAMPTZ,
  responsable_usuario_id UUID NOT NULL REFERENCES usuario(id),
  notas TEXT,
  evidencia_url TEXT
);

CREATE TABLE IF NOT EXISTS documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(25) NOT NULL CHECK (tipo IN ('acta_entrega', 'acta_devolucion', 'informe', 'compra')),
  archivo_url TEXT NOT NULL,
  archivo_hash VARCHAR(255),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS documento_referencia (
  documento_id UUID NOT NULL REFERENCES documento(id) ON DELETE CASCADE,
  entidad_tipo VARCHAR(20) NOT NULL CHECK (entidad_tipo IN ('entrega', 'devolucion', 'compra', 'activo', 'trabajador')),
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

CREATE INDEX IF NOT EXISTS idx_trabajador_usuario_id ON trabajador(usuario_id);
CREATE INDEX IF NOT EXISTS idx_trabajador_estado ON trabajador(estado);

-- Catalogs
CREATE INDEX IF NOT EXISTS idx_ubicacion_tipo ON ubicacion(tipo);
CREATE INDEX IF NOT EXISTS idx_ubicacion_estado ON ubicacion(estado);
CREATE INDEX IF NOT EXISTS idx_ubicacion_subtipo ON ubicacion(ubicacion_subtipo);
CREATE INDEX IF NOT EXISTS idx_ubicacion_planta_padre_id ON ubicacion(planta_padre_id);
CREATE INDEX IF NOT EXISTS idx_ubicacion_inicio_operacion ON ubicacion(fecha_inicio_operacion);
CREATE INDEX IF NOT EXISTS idx_ubicacion_cierre_operacion ON ubicacion(fecha_cierre_operacion);

CREATE INDEX IF NOT EXISTS idx_articulo_tipo ON articulo(tipo);
CREATE INDEX IF NOT EXISTS idx_articulo_grupo_principal ON articulo(grupo_principal);
CREATE INDEX IF NOT EXISTS idx_articulo_tracking_mode ON articulo(tracking_mode);
CREATE INDEX IF NOT EXISTS idx_articulo_estado ON articulo(estado);
CREATE INDEX IF NOT EXISTS idx_articulo_subclasificacion ON articulo(subclasificacion);
CREATE INDEX IF NOT EXISTS idx_articulo_especialidad_especialidad ON articulo_especialidad(especialidad);

-- Purchases
CREATE INDEX IF NOT EXISTS idx_documento_compra_proveedor_id ON documento_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compra_documento_compra_id ON compra(documento_compra_id);
CREATE INDEX IF NOT EXISTS idx_compra_creado_por_usuario_id ON compra(creado_por_usuario_id);
CREATE INDEX IF NOT EXISTS idx_compra_detalle_compra_id ON compra_detalle(compra_id);
CREATE INDEX IF NOT EXISTS idx_compra_detalle_articulo_id ON compra_detalle(articulo_id);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_lote_articulo_id ON lote(articulo_id);
CREATE INDEX IF NOT EXISTS idx_lote_compra_detalle_id ON lote(compra_detalle_id);
CREATE INDEX IF NOT EXISTS idx_lote_estado ON lote(estado);
CREATE INDEX IF NOT EXISTS idx_lote_fecha_vencimiento ON lote(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_activo_articulo_id ON activo(articulo_id);
CREATE INDEX IF NOT EXISTS idx_activo_compra_detalle_id ON activo(compra_detalle_id);
CREATE INDEX IF NOT EXISTS idx_activo_ubicacion_actual_id ON activo(ubicacion_actual_id);
CREATE INDEX IF NOT EXISTS idx_activo_estado ON activo(estado);
CREATE INDEX IF NOT EXISTS idx_activo_codigo ON activo(codigo);
CREATE INDEX IF NOT EXISTS idx_activo_nro_serie ON activo(nro_serie);

-- Delivery / custody
CREATE INDEX IF NOT EXISTS idx_entrega_trabajador_id ON entrega(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_entrega_creado_por_usuario_id ON entrega(creado_por_usuario_id);
CREATE INDEX IF NOT EXISTS idx_entrega_estado ON entrega(estado);
CREATE INDEX IF NOT EXISTS idx_entrega_tipo ON entrega(tipo);
CREATE INDEX IF NOT EXISTS idx_entrega_estado_motivo_anulacion ON entrega(estado, creado_en DESC) WHERE estado = 'anulada';
CREATE INDEX IF NOT EXISTS idx_entrega_estado_revertida ON entrega(estado, deshecha_en DESC) WHERE estado = 'revertida_admin';
CREATE INDEX IF NOT EXISTS idx_entrega_detalle_entrega_id ON entrega_detalle(entrega_id);
CREATE INDEX IF NOT EXISTS idx_entrega_detalle_articulo_id ON entrega_detalle(articulo_id);
CREATE INDEX IF NOT EXISTS idx_entrega_detalle_activo_id ON entrega_detalle(activo_id);
CREATE INDEX IF NOT EXISTS idx_entrega_detalle_lote_id ON entrega_detalle(lote_id);
CREATE INDEX IF NOT EXISTS idx_entrega_detalle_tipo_item_entrega ON entrega_detalle(tipo_item_entrega);

CREATE INDEX IF NOT EXISTS idx_firma_token_entrega_id ON firma_token(entrega_id);
CREATE INDEX IF NOT EXISTS idx_firma_token_trabajador_id ON firma_token(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_firma_token_expira_en ON firma_token(expira_en);
CREATE INDEX IF NOT EXISTS idx_firma_token_usado_en ON firma_token(usado_en);
CREATE UNIQUE INDEX IF NOT EXISTS ux_firma_token_token_publico ON firma_token(token_publico) WHERE token_publico IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_custodia_activo_activo_id ON custodia_activo(activo_id);
CREATE INDEX IF NOT EXISTS idx_custodia_activo_trabajador_id ON custodia_activo(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_custodia_activo_estado ON custodia_activo(estado);
CREATE INDEX IF NOT EXISTS idx_custodia_activo_entrega_id ON custodia_activo(entrega_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_custodia_activo_activa_por_activo ON custodia_activo(activo_id) WHERE estado = 'activa';
CREATE INDEX IF NOT EXISTS idx_custodia_activo_activo_estado ON custodia_activo(activo_id, estado, desde_en DESC);

-- Returns
CREATE INDEX IF NOT EXISTS idx_devolucion_trabajador_id ON devolucion(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_recibido_por_usuario_id ON devolucion(recibido_por_usuario_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_estado ON devolucion(estado);
CREATE INDEX IF NOT EXISTS idx_devolucion_estado_motivo_anulacion ON devolucion(estado, creado_en DESC) WHERE estado = 'anulada';
CREATE INDEX IF NOT EXISTS idx_devolucion_entrega_revertida_id ON devolucion(entrega_revertida_id) WHERE entrega_revertida_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devolucion_detalle_devolucion_id ON devolucion_detalle(devolucion_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_detalle_custodia_activo_id ON devolucion_detalle(custodia_activo_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_detalle_activo_id ON devolucion_detalle(activo_id);

-- Egresos
CREATE INDEX IF NOT EXISTS idx_egreso_creado_por ON egreso(creado_por_usuario_id);
CREATE INDEX IF NOT EXISTS idx_egreso_tipo ON egreso(tipo_motivo);
CREATE INDEX IF NOT EXISTS idx_egreso_creado_en ON egreso(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_egreso_detalle_egreso_id ON egreso_detalle(egreso_id);
CREATE INDEX IF NOT EXISTS idx_egreso_detalle_articulo_id ON egreso_detalle(articulo_id);
CREATE INDEX IF NOT EXISTS idx_egreso_detalle_activo_id ON egreso_detalle(activo_id) WHERE activo_id IS NOT NULL;

-- Movements
CREATE INDEX IF NOT EXISTS idx_movimiento_stock_articulo_id ON movimiento_stock(articulo_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_stock_lote_id ON movimiento_stock(lote_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_stock_fecha ON movimiento_stock(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_movimiento_stock_tipo ON movimiento_stock(tipo);
CREATE INDEX IF NOT EXISTS idx_movimiento_stock_responsable ON movimiento_stock(responsable_usuario_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_stock_egreso_id ON movimiento_stock(egreso_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_activo_activo_id ON movimiento_activo(activo_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_activo_fecha ON movimiento_activo(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_movimiento_activo_tipo ON movimiento_activo(tipo);
CREATE INDEX IF NOT EXISTS idx_movimiento_activo_responsable ON movimiento_activo(responsable_usuario_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_activo_egreso_id ON movimiento_activo(egreso_id) WHERE egreso_id IS NOT NULL;

-- Quality / documents / audit
CREATE INDEX IF NOT EXISTS idx_inspeccion_activo_activo_id ON inspeccion_activo(activo_id);
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

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stock_actualizado_en') THEN
    CREATE TRIGGER trg_stock_actualizado_en
      BEFORE UPDATE ON stock
      FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
  END IF;
END $$;

-- ============================================================
-- SEED BASE ROLES
-- ============================================================

INSERT INTO rol (nombre, descripcion)
VALUES
  ('admin', 'Administracion global del sistema'),
  ('supervisor', 'Supervision operacional'),
  ('bodega', 'Gestion de inventario, entrega y devolucion'),
  ('trabajador', 'Colaborador receptor de herramientas y EPP')
ON CONFLICT (nombre) DO NOTHING;
