import { expect, test, type Page } from '@playwright/test';

type Role = 'admin' | 'bodega' | 'worker';

const envelope = (data: unknown) => ({
  success: true,
  message: 'ok',
  data,
  errors: [],
});

const buildToken = (role: Role) => {
  const user = {
    id:
      role === 'admin'
        ? 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
        : role === 'bodega'
          ? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
          : 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    email: `${role}@test.local`,
    first_name: role,
    last_name: 'smoke',
    role,
  };

  const payload = {
    user,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };

  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
};

const setupApiMocks = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    if (path === '/api/notifications/in-app') {
      return json(envelope({ data: [], total: 0, pagination: { limit: 20, offset: 0 } }));
    }

    if (path === '/api/notifications/in-app/unread-count') {
      return json(envelope({ count: 0 }));
    }

    if (path === '/api/notifications/in-app/stats') {
      return json(envelope({ data: { total: 0, read: 0, unread: 0, types_count: 0 } }));
    }

    if (path === '/api/dashboard/summary') {
      return json(
        envelope({
          activos: { total: 10, asignado: 4 },
          entregas: { pendiente_firma: 1 },
          devoluciones: { borrador: 1 },
          firmas: { firmadas_30d: 2 },
          stock: { total_disponible: 25, total_reservado: 3, registros_agotados: 0 },
        })
      );
    }

    if (path === '/api/inventario/stock') {
      return json(
        envelope([
          {
            articulo_nombre: 'Guante Nitrilo',
            ubicacion_nombre: 'Bodega Central',
            cantidad_disponible: 20,
            cantidad_reservada: 2,
            codigo_lote: null,
          },
        ])
      );
    }

    if (path.startsWith('/api/inventario/movimientos-stock')) {
      return json(
        envelope([
          {
            fecha_movimiento: new Date().toISOString(),
            tipo: 'entrada',
            articulo_nombre: 'Guante Nitrilo',
            cantidad: 5,
            ubicacion_destino_nombre: 'Bodega Central',
          },
        ])
      );
    }

    if (path.startsWith('/api/inventario/movimientos-activo')) {
      return json(
        envelope([
          {
            fecha_movimiento: new Date().toISOString(),
            tipo: 'entrega',
            activo_codigo: 'ACT-001',
            articulo_nombre: 'Taladro',
            ubicacion_destino_nombre: 'Faena Norte',
          },
        ])
      );
    }

    if (path.startsWith('/api/inventario/auditoria')) {
      return json(
        envelope([
          {
            creado_en: new Date().toISOString(),
            entidad_tipo: 'entrega',
            entidad_id: 'entrega-1',
            accion: 'crear',
            usuario_email: 'admin@test.local',
          },
        ])
      );
    }

    if (path === '/api/trabajadores') {
      return json(envelope([{ id: 'trabajador-1', nombres: 'Ana', apellidos: 'Rojas' }]));
    }

    if (path === '/api/ubicaciones') {
      return json(
        envelope([
          { id: 'ubicacion-1', nombre: 'Bodega Central' },
          { id: 'ubicacion-2', nombre: 'Faena Norte' },
        ])
      );
    }

    if (path === '/api/articulos') {
      return json(
        envelope([
          { id: 'articulo-1', nombre: 'Taladro', tracking_mode: 'serial' },
          { id: 'articulo-2', nombre: 'Guante', tracking_mode: 'lote' },
        ])
      );
    }

    if (path === '/api/entregas') {
      if (method === 'GET') {
        return json(
          envelope([
            {
              id: 'entrega-1',
              estado: 'pendiente_firma',
            },
          ])
        );
      }

      return json(envelope({ id: 'entrega-2', estado: 'borrador' }));
    }

    if (path === '/api/devoluciones') {
      if (method === 'GET') {
        return json(envelope([]));
      }

      return json(envelope({ id: 'devolucion-1', estado: 'borrador' }));
    }

    if (path === '/api/proveedores') {
      return json(envelope([{ id: 'proveedor-1', nombre: 'Proveedor Test' }]));
    }

    if (path === '/api/firmas/pendientes/me') {
      return json(
        envelope({
          trabajador_id: 'trabajador-1',
          entregas: [
            {
              id: 'entrega-1',
              tipo: 'entrega',
              estado: 'pendiente_firma',
              cantidad_items: 2,
            },
          ],
        })
      );
    }

    if (path === '/api/devoluciones/mis-custodias/activos') {
      return json(
        envelope({
          trabajador_id: 'trabajador-1',
          custodias: [
            {
              id: 'custodia-1',
              activo_codigo: 'ACT-001',
              articulo_nombre: 'Taladro',
              ubicacion_destino_nombre: 'Faena Norte',
              desde_en: new Date().toISOString(),
            },
          ],
        })
      );
    }

    if (path.startsWith('/api/firmas/')) {
      return json(envelope({ id: 'firma-1' }));
    }

    if (path.startsWith('/api/compras')) {
      return json(envelope({ id: 'compra-1' }));
    }

    return json(envelope([]));
  });
};

const setupRoleSession = async (page: Page, role: Role) => {
  const token = buildToken(role);

  await page.addInitScript((value) => {
    localStorage.setItem('accessToken', value);
    localStorage.setItem('refreshToken', 'refresh-token-smoke');
  }, token);

  await setupApiMocks(page);
};

test('admin dashboard smoke', async ({ page }) => {
  await setupRoleSession(page, 'admin');
  await page.goto('/admin/dashboard');

  await expect(page.getByRole('heading', { name: /Panel Administrativo EPP/i })).toBeVisible();
  await expect(page.getByText('Activos Totales')).toBeVisible();
  await expect(page.getByText('Movimientos de Stock Recientes')).toBeVisible();
});

test('bodega dashboard smoke', async ({ page }) => {
  await setupRoleSession(page, 'bodega');
  await page.goto('/bodega/dashboard');

  await expect(page.getByRole('heading', { name: /Módulo Bodega EPP\/Herramientas/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear Entrega Borrador' })).toBeVisible();
  await expect(page.getByText('Firma manuscrita de recepción')).toBeVisible();
});

test('trabajador dashboard smoke', async ({ page }) => {
  await setupRoleSession(page, 'worker');
  await page.goto('/worker/firmas');

  await expect(page.getByRole('heading', { name: /Portal Trabajador EPP/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Firmar Recepción' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Firmar con Token' })).toBeVisible();
});
