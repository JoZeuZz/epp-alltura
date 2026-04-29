import { expect, test, type Page } from '@playwright/test';

type Role = 'admin' | 'supervisor';

const credentialsByRole: Record<Role, { email?: string; password?: string }> = {
  admin: {
    email: process.env.PLAYWRIGHT_ADMIN_EMAIL,
    password: process.env.PLAYWRIGHT_ADMIN_PASSWORD,
  },
  supervisor: {
    email: process.env.PLAYWRIGHT_SUPERVISOR_EMAIL,
    password: process.env.PLAYWRIGHT_SUPERVISOR_PASSWORD,
  },
};

const hasCredentials = (role: Role) => {
  const creds = credentialsByRole[role];
  return Boolean(creds.email && creds.password);
};

const loginAs = async (page: Page, role: Role) => {
  const creds = credentialsByRole[role];
  if (!creds.email || !creds.password) {
    test.skip(true, `Missing credentials for role ${role}`);
    return;
  }

  await page.goto('/login');
  await page.fill('#email', creds.email);
  await page.fill('#password', creds.password);
  await page.getByRole('button', { name: 'Login' }).click();
};

test.describe('Operación real smoke by role', () => {
  test('frontend login page loads against real backend proxy', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible();
    await expect(page.getByLabel('Correo Electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
  });

  test('admin can open entregas and egresos forms', async ({ page }) => {
    test.skip(!hasCredentials('admin'), 'Missing PLAYWRIGHT_ADMIN_EMAIL/PASSWORD');

    await loginAs(page, 'admin');

    await page.goto('/admin/entregas');
    await expect(page.getByRole('heading', { name: 'Entregas y Confirmaciones' })).toBeVisible();

    await page.getByRole('button', { name: 'Nueva entrega' }).click();
    await expect(page.getByRole('heading', { name: 'Nueva entrega' })).toBeVisible();

    await page.goto('/admin/inventario/egresos');
    await expect(page.getByRole('heading', { name: 'Egresos' })).toBeVisible();

    await page.getByRole('button', { name: 'Registrar Egreso' }).click();
    await expect(page.getByRole('heading', { name: 'Registrar Egreso' })).toBeVisible();
  });

  test('supervisor can open operaciones section and see visual asset selector', async ({ page }) => {
    test.skip(!hasCredentials('supervisor'), 'Missing PLAYWRIGHT_SUPERVISOR_EMAIL/PASSWORD');

    await loginAs(page, 'supervisor');

    await page.goto('/supervisor/operaciones');
    await expect(page.getByRole('heading', { name: /Operación Supervisora/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /Registrar devolución/i })).toBeVisible();
    await expect(page.getByText('Seleccionar activo').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear borrador' }).last()).toBeVisible();
  });
});
