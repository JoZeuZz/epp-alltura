import { expect, test, type Page } from '@playwright/test';

type Role = 'admin' | 'supervisor';

const envelope = (data: unknown) => ({
  success: true,
  message: 'ok',
  data,
  errors: [],
});

const buildUser = (role: Role) => ({
  id:
    role === 'admin'
      ? 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
      : 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  email: `${role}@test.local`,
  first_name: role,
  last_name: 'smoke',
  role,
});

const buildToken = (role: Role) => {
  const user = buildUser(role);

  const payload = {
    user,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };

  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
};

const setupApiMocks = async (page: Page) => {
  const entregas: Array<{ id: string; estado: string; tipo: string; cantidad_items: number }> = [];
  const devoluciones: Array<{ id: string; estado: string }> = [];

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

    if (path === '/api/auth/login' && method === 'POST') {
      const payload = request.postDataJSON() as { email?: string };
      const email = String(payload?.email || '').toLowerCase();
      const role: Role = email.includes('admin') ? 'admin' : 'supervisor';

      return json(
        envelope({
          accessToken: buildToken(role),
          refreshToken: 'refresh-token-smoke',
          user: buildUser(role),
        })
      );
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

    if (path.startsWith('/api/inventario/activos-paged')) {
      return json(
        envelope({
          items: [
            {
              id: 'activo-1',
              codigo: 'ACT-001',
              articulo_nombre: 'Taladro',
              estado: 'en_stock',
              ubicacion_nombre: 'Bodega Central',
              valor: 120000,
            },
            {
              id: 'activo-2',
              codigo: 'ACT-002',
              articulo_nombre: 'Esmeril Angular',
              estado: 'asignado',
              ubicacion_nombre: 'Faena Norte',
              custodio_nombres: 'Ana',
              custodio_apellidos: 'Rojas',
              valor: 98000,
            },
          ],
          total: 2,
          hasMore: false,
          nextCursor: null,
        })
      );
    }

    if (path.startsWith('/api/inventario/activos-disponibles')) {
      const articuloId = url.searchParams.get('articulo_id');
      const ubicacionId = url.searchParams.get('ubicacion_id');

      if (articuloId === 'articulo-1' && ubicacionId === 'ubicacion-1') {
        return json(
          envelope([
            {
              id: 'activo-1',
              codigo: 'ACT-001',
              nro_serie: 'SN-001',
              estado: 'en_stock',
              articulo_id: 'articulo-1',
              articulo_nombre: 'Taladro',
              ubicacion_id: 'ubicacion-1',
              ubicacion_nombre: 'Bodega Central',
            },
          ])
        );
      }

      return json(envelope([]));
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
        return json(envelope(entregas));
      }

      const created = {
        id: 'abcd1234-1234-4234-8234-1234567890ab',
        estado: 'borrador',
        tipo: 'entrega',
        cantidad_items: 1,
      };
      entregas.unshift(created);

      return json(envelope(created));
    }

    if (path === '/api/devoluciones') {
      if (method === 'GET') {
        return json(envelope(devoluciones));
      }

      const created = { id: 'devolucion-1', estado: 'borrador' };
      devoluciones.unshift(created);
      return json(envelope(created));
    }

    if (path.startsWith('/api/devoluciones/activos-elegibles')) {
      return json(
        envelope([
          {
            custodia_activo_id: 'custodia-1',
            trabajador_id: 'trabajador-1',
            desde_en: new Date().toISOString(),
            activo_id: 'activo-1',
            codigo: 'ACT-001',
            nro_serie: 'SN-001',
            articulo_id: 'articulo-1',
            articulo_nombre: 'Taladro',
            ubicacion_actual_id: 'ubicacion-2',
            ubicacion_actual_nombre: 'Faena Norte',
          },
        ])
      );
    }

    if (path === '/api/proveedores') {
      return json(envelope([{ id: 'proveedor-1', nombre: 'Proveedor Test' }]));
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

    const tourKeys = [
      'tour:admin:v2',
      'tour:supervisor:v2',
    ];

    for (const key of tourKeys) {
      localStorage.setItem(key, 'skipped');
    }
  }, token);

  await setupApiMocks(page);
};

test('admin dashboard smoke', async ({ page }) => {
  await setupRoleSession(page, 'admin');
  await page.goto('/admin/dashboard');

  await expect(page.getByRole('heading', { name: /Panel de Equipos y Herramientas/i })).toBeVisible();
  await expect(page.getByText('Activos Totales')).toBeVisible();
  await expect(page.getByText('Movimientos de Stock Recientes')).toBeVisible();
});

test('admin herramientas page smoke', async ({ page }) => {
  await setupRoleSession(page, 'admin');
  await page.goto('/admin/inventario/herramientas');

  await expect(page.getByRole('heading', { name: /Gestión de Herramientas/i })).toBeVisible();
  await expect(page.getByText('ACT-001')).toBeVisible();
  await expect(page.getByText('Taladro')).toBeVisible();
});

test('supervisor operations smoke', async ({ page }) => {
  await setupRoleSession(page, 'supervisor');
  await page.goto('/supervisor/operaciones');

  await expect(page.getByRole('heading', { name: /Operación Supervisora/i })).toBeVisible();
  await expect(page.getByText('Solo se permiten activos serializados en este flujo.')).toBeVisible();
  await expect(page.getByTestId('delivery-create-submit')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar firma local' })).toBeVisible();
});

test('supervisor create return draft smoke', async ({ page }) => {
  await setupRoleSession(page, 'supervisor');
  await page.goto('/supervisor/operaciones');

  const returnSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: /Registrar devolución/i }) });

  await returnSection.locator('select').nth(0).selectOption('trabajador-1');
  await returnSection.locator('select').nth(1).selectOption('ubicacion-1');
  await returnSection.locator('select').nth(2).selectOption('articulo-1');
  await returnSection.getByRole('button', { name: /ACT-001/i }).click();
  await returnSection.getByRole('button', { name: 'Crear borrador' }).click();

  await expect(returnSection.getByText(/Firma requerida/i).first()).toBeVisible();
});

test('ui visible mantiene naming operativo', async ({ page }) => {
  await setupRoleSession(page, 'admin');
  await page.goto('/admin/dashboard');

  await expect(page.getByRole('heading', { name: /Panel de Equipos y Herramientas/i })).toBeVisible();
  await expect(page.getByText(/EPP Control/i)).toHaveCount(0);
});

test('supervisor login and create delivery draft smoke', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tour:supervisor:v2', 'skipped');
  });

  await setupApiMocks(page);

  await page.goto('/login');
  await page.fill('#email', 'supervisor@test.local');
  await page.fill('#password', 'Dev12345!');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/supervisor\/dashboard/);
  await page.goto('/supervisor/operaciones');
  await expect(page.getByRole('heading', { name: /Operación Supervisora/i })).toBeVisible();

  await page.getByTestId('delivery-worker-select').selectOption('trabajador-1');
  await page.getByTestId('delivery-origin-select').selectOption('ubicacion-1');
  await page.getByTestId('delivery-destination-select').selectOption('ubicacion-2');
  await page.getByTestId('delivery-article-select-0').selectOption('articulo-1');
  await expect(page.getByRole('button', { name: /ACT-001/i })).toBeVisible();
  await page.getByRole('button', { name: /ACT-001/i }).click();
  await page.getByTestId('delivery-create-submit').click();

  await expect(page.getByRole('cell', { name: 'abcd1234' })).toBeVisible();
});
