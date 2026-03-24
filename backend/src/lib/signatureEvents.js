const crypto = require('crypto');

const clients = new Map();

const buildClientId = () => crypto.randomUUID();

const safeWrite = (res, chunk) => {
  try {
    res.write(chunk);
    return true;
  } catch (_error) {
    return false;
  }
};

const addClient = ({ res, userId = null }) => {
  const clientId = buildClientId();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  safeWrite(res, 'retry: 3000\n');
  safeWrite(res, 'event: connected\n');
  safeWrite(
    res,
    `data: ${JSON.stringify({ client_id: clientId, connected_at: new Date().toISOString() })}\n\n`
  );

  const keepAliveInterval = setInterval(() => {
    safeWrite(res, ': ping\n\n');
  }, 25000);

  clients.set(clientId, {
    id: clientId,
    userId,
    res,
    keepAliveInterval,
  });

  return clientId;
};

const removeClient = (clientId) => {
  const client = clients.get(clientId);
  if (!client) {
    return;
  }

  clearInterval(client.keepAliveInterval);
  clients.delete(clientId);
};

const publishDeliverySigned = ({
  signatureId,
  entregaId,
  metodo,
  firmadoEn,
  trabajadorId,
}) => {
  const payload = {
    signature_id: signatureId,
    entrega_id: entregaId,
    metodo,
    firmado_en: firmadoEn || new Date().toISOString(),
    trabajador_id: trabajadorId,
  };

  const deadClients = [];

  clients.forEach((client, clientId) => {
    const okEvent = safeWrite(client.res, 'event: delivery-signed\n');
    const okId = safeWrite(client.res, `id: ${signatureId}\n`);
    const okData = safeWrite(client.res, `data: ${JSON.stringify(payload)}\n\n`);
    if (!okEvent || !okId || !okData) {
      deadClients.push(clientId);
    }
  });

  deadClients.forEach(removeClient);
};

module.exports = {
  addClient,
  removeClient,
  publishDeliverySigned,
};
