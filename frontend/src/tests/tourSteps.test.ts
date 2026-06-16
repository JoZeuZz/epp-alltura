import { describe, expect, it } from 'vitest';
import { matchTourRoute } from '@jozeuzz/alltura-ui';
import type { TourStep } from '@jozeuzz/alltura-ui';
import { onboardingStepsByRole, contextualStepsByRole } from '../utils/tourSteps';

// Rutas reales declaradas en router/index.tsx (sin '*').
const REAL_ROUTES = [
  '/dashboard', '/trabajadores', '/ubicacion/proyectos', '/ubicacion/proyectos/:id',
  '/ubicacion/bodegas', '/inventario/epp', '/inventario/equipos', '/inventario/herramientas',
  '/admin/users', '/notifications', '/profile',
];

const all = [
  ...onboardingStepsByRole.admin, ...onboardingStepsByRole.supervisor,
  ...contextualStepsByRole.admin, ...contextualStepsByRole.supervisor,
];

describe('matchTourRoute', () => {
  it('wildcard and undefined match anything', () => {
    expect(matchTourRoute('/x', '*')).toBe(true);
    expect(matchTourRoute('/x', undefined)).toBe(true);
  });
  it('matches dynamic segments', () => {
    expect(matchTourRoute('/ubicacion/proyectos/abc', '/ubicacion/proyectos/:id')).toBe(true);
    expect(matchTourRoute('/ubicacion/proyectos', '/ubicacion/proyectos/:id')).toBe(false);
  });
});

describe('tour steps integrity', () => {
  it('every step has id, title, body', () => {
    for (const s of all) {
      expect(s.id, `${s.id} id`).toBeTruthy();
      expect(s.title, `${s.id} title`).toBeTruthy();
      expect(s.body, `${s.id} body`).toBeTruthy();
    }
  });

  it('step ids are unique per group', () => {
    for (const group of [onboardingStepsByRole.admin, onboardingStepsByRole.supervisor, contextualStepsByRole.admin, contextualStepsByRole.supervisor]) {
      const ids = group.map((s: TourStep) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('every concrete route exists in the router', () => {
    for (const s of all) {
      if (s.route && s.route !== '*') {
        expect(REAL_ROUTES, `${s.id} → ${s.route}`).toContain(s.route);
      }
    }
  });

  it('no step references a legacy /admin/ inventory or supervisor route', () => {
    for (const s of all) {
      if (!s.route || s.route === '*') continue;
      expect(s.route.startsWith('/admin/inventario'), `${s.id}`).toBe(false);
      expect(s.route.startsWith('/supervisor/'), `${s.id}`).toBe(false);
      expect(s.route, `${s.id}`).not.toBe('/admin/trazabilidad');
    }
  });

  it('onboarding is shortened', () => {
    expect(onboardingStepsByRole.admin.length).toBeLessThanOrEqual(8);
    expect(onboardingStepsByRole.supervisor).toHaveLength(5);
  });

  it('admin onboarding keeps demo actions', () => {
    const da = onboardingStepsByRole.admin.filter((s) => s.demoAction).map((s) => s.demoAction);
    expect(da).toContain('switch-tab:inventario');
    expect(da).toContain('open-modal:activo-first');
  });

  it('contextual has at least one step per real route (admin)', () => {
    const adminRoutes = ['/dashboard', '/admin/users', '/trabajadores', '/ubicacion/proyectos', '/ubicacion/proyectos/:id', '/ubicacion/bodegas', '/inventario/epp', '/inventario/equipos', '/inventario/herramientas', '/notifications', '/profile'];
    for (const r of adminRoutes) {
      const matched = contextualStepsByRole.admin.filter((s) => matchTourRoute(r.replace(':id', 'x'), s.route));
      expect(matched.length, `admin ${r}`).toBeGreaterThanOrEqual(1);
    }
  });
});
