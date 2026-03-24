-- Fase 12: normalización de cantidades físicas a enteros positivos.

-- 1) Normalizar datos históricos: truncar fracciones en columnas de cantidad.
UPDATE compra_detalle SET cantidad = trunc(cantidad) WHERE cantidad <> trunc(cantidad);
UPDATE entrega_detalle SET cantidad = trunc(cantidad) WHERE cantidad <> trunc(cantidad);
UPDATE devolucion_detalle SET cantidad = trunc(cantidad) WHERE cantidad <> trunc(cantidad);
UPDATE egreso_detalle SET cantidad = trunc(cantidad) WHERE cantidad <> trunc(cantidad);
UPDATE movimiento_stock SET cantidad = trunc(cantidad) WHERE cantidad <> trunc(cantidad);
UPDATE stock SET cantidad_disponible = trunc(cantidad_disponible) WHERE cantidad_disponible <> trunc(cantidad_disponible);
UPDATE stock SET cantidad_reservada = trunc(cantidad_reservada) WHERE cantidad_reservada <> trunc(cantidad_reservada);

-- 2) Reforzar integridad: cantidades físicas solo admiten enteros.
ALTER TABLE compra_detalle
  DROP CONSTRAINT IF EXISTS chk_compra_detalle_cantidad_entera;
ALTER TABLE compra_detalle
  ADD CONSTRAINT chk_compra_detalle_cantidad_entera
  CHECK (cantidad = trunc(cantidad));

ALTER TABLE entrega_detalle
  DROP CONSTRAINT IF EXISTS chk_entrega_detalle_cantidad_entera;
ALTER TABLE entrega_detalle
  ADD CONSTRAINT chk_entrega_detalle_cantidad_entera
  CHECK (cantidad = trunc(cantidad));

ALTER TABLE devolucion_detalle
  DROP CONSTRAINT IF EXISTS chk_devolucion_detalle_cantidad_entera;
ALTER TABLE devolucion_detalle
  ADD CONSTRAINT chk_devolucion_detalle_cantidad_entera
  CHECK (cantidad = trunc(cantidad));

ALTER TABLE egreso_detalle
  DROP CONSTRAINT IF EXISTS chk_egreso_detalle_cantidad_entera;
ALTER TABLE egreso_detalle
  ADD CONSTRAINT chk_egreso_detalle_cantidad_entera
  CHECK (cantidad = trunc(cantidad));

ALTER TABLE movimiento_stock
  DROP CONSTRAINT IF EXISTS chk_movimiento_stock_cantidad_entera;
ALTER TABLE movimiento_stock
  ADD CONSTRAINT chk_movimiento_stock_cantidad_entera
  CHECK (cantidad = trunc(cantidad));

ALTER TABLE stock
  DROP CONSTRAINT IF EXISTS chk_stock_cantidad_disponible_entera;
ALTER TABLE stock
  ADD CONSTRAINT chk_stock_cantidad_disponible_entera
  CHECK (cantidad_disponible = trunc(cantidad_disponible));

ALTER TABLE stock
  DROP CONSTRAINT IF EXISTS chk_stock_cantidad_reservada_entera;
ALTER TABLE stock
  ADD CONSTRAINT chk_stock_cantidad_reservada_entera
  CHECK (cantidad_reservada = trunc(cantidad_reservada));
