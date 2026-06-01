import { describe, expect, it } from 'vitest';
import {
  getContextualStepsForRoute,
  matchTourRoute,
} from '@jozeuzz/alltura-ui';
import { onboardingStepsByRole } from '../utils/tourSteps';
import type { TourStep } from '@jozeuzz/alltura-ui';

describe('matchTourRoute', () => {
  it('returns true when no route specified', () => {
    expect(matchTourRoute('/any/path', undefined)).toBe(true);
  });

  it('returns true for wildcard', () => {
    expect(matchTourRoute('/any/path', '*')).toBe(true);
  });

  it('matches exact path', () => {
    expect(matchTourRoute('/admin/dashboard', '/admin/dashboard')).toBe(true);
    expect(matchTourRoute('/admin/dashboard', '/admin/trazabilidad')).toBe(false);
  });

  it('matches dynamic segments', () => {
    expect(matchTourRoute('/admin/proyectos/abc123', '/admin/proyectos/:id')).toBe(true);
    expect(matchTourRoute('/admin/proyectos', '/admin/proyectos/:id')).toBe(false);
  });

  it('ignores trailing slashes', () => {
    expect(matchTourRoute('/admin/dashboard/', '/admin/dashboard')).toBe(true);
  });
});

describe('onboardingStepsByRole', () => {
  it('admin has 16 onboarding steps', () => {
    expect(onboardingStepsByRole.admin).toHaveLength(16);
  });

  it('supervisor has 5 onboarding steps', () => {
    expect(onboardingStepsByRole.supervisor).toHaveLength(5);
  });

  it('all steps have required fields', () => {
    const allSteps = [
      ...onboardingStepsByRole.admin,
      ...onboardingStepsByRole.supervisor,
    ];
    for (const step of allSteps) {
      expect(step.id, `step ${step.id} missing id`).toBeTruthy();
      expect(step.title, `step ${step.id} missing title`).toBeTruthy();
      expect(step.body, `step ${step.id} missing body`).toBeTruthy();
    }
  });

  it('step ids are unique within role', () => {
    const adminIds = onboardingStepsByRole.admin.map((s: TourStep) => s.id);
    expect(new Set(adminIds).size).toBe(adminIds.length);

    const supervIds = onboardingStepsByRole.supervisor.map((s: TourStep) => s.id);
    expect(new Set(supervIds).size).toBe(supervIds.length);
  });

  it('no onboarding step references non-existent routes', () => {
    const invalidRoutes = [
      '/admin/inventario/stock',
      '/admin/inventario/movimientos',
      '/admin/inventario/ingresos',
    ];
    const allSteps = [
      ...onboardingStepsByRole.admin,
      ...onboardingStepsByRole.supervisor,
    ];
    for (const step of allSteps) {
      if (step.route && step.route !== '*') {
        expect(invalidRoutes).not.toContain(step.route);
      }
    }
  });

  it('admin onboarding has tab-switch and modal-open demoActions for EPP', () => {
    const adminSteps = onboardingStepsByRole.admin;
    const demoActions = adminSteps
      .filter((s: TourStep) => s.demoAction)
      .map((s: TourStep) => s.demoAction);
    expect(demoActions).toContain('switch-tab:inventario');
    expect(demoActions).toContain('open-modal:activo-first');
  });

  it('no onboarding step uses deprecated open-activo-demo action', () => {
    const allSteps = [
      ...onboardingStepsByRole.admin,
      ...onboardingStepsByRole.supervisor,
    ];
    const deprecated = allSteps.filter(
      (s: TourStep) => s.demoAction === 'open-activo-demo'
    );
    expect(deprecated).toHaveLength(0);
  });
});

describe('getContextualStepsForRoute', () => {
  const adminRoutes = [
    '/admin/dashboard',
    '/admin/trazabilidad',
    '/admin/users',
    '/admin/trabajadores',
    '/admin/ubicacion/bodegas',
    '/admin/ubicacion/proyectos',
    '/admin/inventario/articulos',
    '/admin/inventario/epp',
    '/admin/inventario/equipos',
    '/admin/inventario/herramientas',
    '/notifications',
    '/profile',
  ];

  for (const route of adminRoutes) {
    it(`admin has at least one contextual step for ${route}`, () => {
      const steps = getContextualStepsForRoute('admin', route);
      expect(steps.length).toBeGreaterThanOrEqual(1);
    });
  }

  const supervisorRoutes = [
    '/supervisor/dashboard',
    '/supervisor/trazabilidad',
    '/notifications',
    '/profile',
  ];

  for (const route of supervisorRoutes) {
    it(`supervisor has at least one contextual step for ${route}`, () => {
      const steps = getContextualStepsForRoute('supervisor', route);
      expect(steps.length).toBeGreaterThanOrEqual(1);
    });
  }

  it('returns empty for unknown route', () => {
    expect(getContextualStepsForRoute('admin', '/admin/unknown')).toHaveLength(0);
  });
});
