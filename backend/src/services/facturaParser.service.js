'use strict';

const pdfParse = require('pdf-parse');
const db = require('../db');
const { logger } = require('../lib/logger');

const MESES = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRut(raw) {
  return raw.replace(/\s+/g, '').toUpperCase();
}

function parseChileanNumber(str) {
  if (!str) return null;
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function extractText(filePath) {
  const fs = require('fs');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
}

function extractProveedorNombre(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines[0] || null;
}

function extractProveedorRut(text) {
  const senorPos = text.toUpperCase().indexOf('SEÑOR');
  const searchText = senorPos > 0 ? text.slice(0, senorPos) : text;
  const match = searchText.match(/R\.U\.T\.?\s*:?\s*(\d{1,2}\.\d{3}\.\d{3}-\s*[\dKk])/i);
  if (!match) return null;
  return normalizeRut(match[1]);
}

function extractFechaCompra(text) {
  const match = text.match(
    /Fecha\s+Emisi[oó]n\s*:?\s*(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})/i
  );
  if (!match) return null;
  const [, day, monthStr, year] = match;
  const month = MESES[monthStr.toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

function extractItems(text) {
  const headerMatch = text.search(/Descripci[oó]n\s+Cantidad\s+Precio/i);
  if (headerMatch < 0) return [];

  const afterHeader = text.slice(headerMatch);
  const endMatch = afterHeader.search(/Forma de Pago|MONTO NETO/i);
  const tableText = endMatch > 0 ? afterHeader.slice(0, endMatch) : afterHeader;

  const itemRegex = /^(.+?)\s+(\d+(?:\.\d{3})*)\s+(\d+(?:\.\d{3})*)(?:\s+(\d+(?:\.\d{3})*))?$/;
  const items = [];

  for (const rawLine of tableText.split('\n')) {
    const line = rawLine.trim();
    if (!line || /Descripci[oó]n|Cantidad|Precio|Codigo/i.test(line)) continue;

    const m = line.match(itemRegex);
    if (!m) continue;

    const precioUnitario = parseChileanNumber(m[3] ? m[2] : null);
    const descripcion = m[1].replace(/^[-\s]+/, '').trim();

    if (descripcion && precioUnitario !== null) {
      items.push({ descripcion, precioUnitario });
    }
  }

  return items;
}

function hasIva(text) {
  return /I\.V\.A\.?\s*19\s*%/i.test(text);
}

function aplicarIva(precioNeto) {
  return Math.round(precioNeto * 1.19);
}

function matchPrecio(items, articuloNombre, tieneIva) {
  if (!items.length) return null;

  const applyIva = (p) => tieneIva ? aplicarIva(p) : p;

  if (items.length === 1) {
    return applyIva(items[0].precioUnitario);
  }

  const normalizedNombre = normalize(articuloNombre);
  const matches = items.filter(item =>
    normalize(item.descripcion).includes(normalizedNombre) ||
    normalizedNombre.includes(normalize(item.descripcion))
  );

  if (matches.length === 1) {
    return applyIva(matches[0].precioUnitario);
  }

  return null;
}

async function resolveProveedor(nombre, rut) {
  if (!nombre) return null;

  if (rut) {
    const { rows: byRut } = await db.query(
      `SELECT id, nombre FROM proveedor WHERE rut = $1 AND estado = 'activo' LIMIT 1`,
      [rut]
    );
    if (byRut.length) {
      return { id: byRut[0].id, nombre: byRut[0].nombre, creado: false };
    }
  }

  const { rows: byNombre } = await db.query(
    `SELECT id, nombre FROM proveedor WHERE nombre ILIKE $1 AND estado = 'activo' LIMIT 1`,
    [`%${nombre}%`]
  );
  if (byNombre.length) {
    return { id: byNombre[0].id, nombre: byNombre[0].nombre, creado: false };
  }

  const { rows: created } = await db.query(
    `INSERT INTO proveedor (nombre, rut, estado) VALUES ($1, $2, 'activo') RETURNING id, nombre`,
    [nombre.slice(0, 150), rut || null]
  );
  logger.info('[facturaParser] Proveedor creado desde factura', { nombre, rut });
  return { id: created[0].id, nombre: created[0].nombre, creado: true };
}

async function parseFactura(filePath, articuloNombre) {
  const text = await extractText(filePath);

  const proveedorNombre = extractProveedorNombre(text);
  const proveedorRut    = extractProveedorRut(text);
  const fechaCompra     = extractFechaCompra(text);
  const items           = extractItems(text);
  const tieneIva        = hasIva(text);
  const valor           = matchPrecio(items, articuloNombre || '', tieneIva);

  const proveedorResult = await resolveProveedor(proveedorNombre, proveedorRut);

  return {
    proveedor_id:      proveedorResult?.id   ?? null,
    proveedor_nombre:  proveedorResult?.nombre ?? proveedorNombre,
    proveedor_creado:  proveedorResult?.creado ?? false,
    fecha_compra:      fechaCompra,
    valor,
    extractado_ok: !!(proveedorNombre || fechaCompra || valor),
  };
}

module.exports = { parseFactura, extractProveedorNombre, extractProveedorRut, extractFechaCompra, extractItems, matchPrecio, normalizeRut };
