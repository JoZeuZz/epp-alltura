const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '../../', p), 'utf8');

describe('API contracts current state', () => {
  it('entregas routes only expose create/list/get/confirm/anular', () => {
    const routes = read('routes/entregas.routes.js');

    expect(routes).toContain("'/:id/confirm'");
    expect(routes).toContain("'/:id/anular'");

    expect(routes).not.toContain("'/:id/recibir'");
    expect(routes).not.toContain("'/:id/deshacer'");
    expect(routes).not.toContain("'/:id/permanent'");
  });

  it('firmas routes expose stream token + events stream', () => {
    const routes = read('routes/firmas.routes.js');

    expect(routes).toContain("'/events/deliveries/token'");
    expect(routes).toContain("'/events/deliveries'");
    expect(routes).toContain("'/devoluciones/:devolucionId/token'");
  });

});
