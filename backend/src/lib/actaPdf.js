const PDFDocument = require('pdfkit');

const toText = (value) => {
  if (value === undefined || value === null) return '—';
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : '—';
};

const formatDateTime = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const appendField = (doc, label, value) => {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(toText(value));
};

const appendSectionTitle = (doc, title) => {
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).text(title);
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(10);
};

const buildEntregaActaPdfBuffer = async ({ entrega, detalles }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4',
      info: {
        Title: `Acta de entrega ${entrega.id}`,
        Subject: 'Acta de entrega',
        Author: 'Sistema EPP Alltura',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(18).text('Acta de Entrega', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).text(`ID entrega: ${entrega.id}`, { align: 'center' });
    doc.moveDown();

    appendSectionTitle(doc, 'Datos generales');
    appendField(doc, 'Trabajador', `${toText(entrega.nombres)} ${toText(entrega.apellidos)}`);
    appendField(doc, 'RUT', entrega.rut);
    appendField(doc, 'Tipo', entrega.tipo);
    appendField(doc, 'Estado', entrega.estado);
    appendField(doc, 'Ubicación origen', entrega.ubicacion_origen_nombre || entrega.ubicacion_origen_id);
    appendField(doc, 'Ubicación destino', entrega.ubicacion_destino_nombre || entrega.ubicacion_destino_id);
    appendField(doc, 'Creado en', formatDateTime(entrega.creado_en));
    appendField(doc, 'Confirmado en', formatDateTime(entrega.confirmada_en));
    appendField(doc, 'Recibido en', formatDateTime(entrega.recibido_en));
    appendField(doc, 'Fecha devolución esperada', formatDateTime(entrega.fecha_devolucion_esperada));

    appendSectionTitle(doc, 'Detalle de ítems');
    if (!Array.isArray(detalles) || detalles.length === 0) {
      doc.text('Sin detalles registrados.');
    } else {
      detalles.forEach((item, index) => {
        doc.font('Helvetica-Bold').text(`${index + 1}. ${toText(item.articulo_nombre || item.articulo_id)}`);
        doc.font('Helvetica').text(
          `Cantidad: ${toText(item.cantidad)} | Condición salida: ${toText(item.condicion_salida)}`
        );
        doc.text(`Activo/Lote: ${toText(item.activo_codigo || item.codigo_lote || item.activo_id || item.lote_id)}`);
        doc.text(`Notas: ${toText(item.notas)}`);
        doc.moveDown(0.3);
      });
    }

    appendSectionTitle(doc, 'Firma de recepción');
    appendField(doc, 'Método', entrega.firma_metodo);
    appendField(doc, 'Firmado en', formatDateTime(entrega.firmado_en));
    appendField(doc, 'Firma URL', entrega.firma_imagen_url);

    appendSectionTitle(doc, 'Integridad');
    doc.text('El hash SHA-256 del PDF se almacena en documento.archivo_hash para verificación posterior.');

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(9).fillColor('#555555').text(
      `Generado automáticamente el ${formatDateTime(new Date().toISOString())}`,
      { align: 'right' }
    );

    doc.end();
  });
};

module.exports = {
  buildEntregaActaPdfBuffer,
};
