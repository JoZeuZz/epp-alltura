import { describe, expect, it } from 'vitest';
import {
  getNotificationItemPresentation,
  resolveNotificationItemIcon,
  resolveNotificationItemNavigationLink,
  resolveNotificationItemUnreadColorClass,
} from '../config/notificationItemCompat';

describe('notificationItemCompat', () => {
  it('returns fallback icon and color for unknown types', () => {
    expect(resolveNotificationItemIcon('unknown_type')).toBe('');
    expect(resolveNotificationItemUnreadColorClass('unknown_type')).toBe('bg-gray-50');
  });

  it('returns known icon and color for legacy custody type', () => {
    expect(resolveNotificationItemIcon('custodia_vencida')).toBe('');
    expect(resolveNotificationItemUnreadColorClass('custodia_vencida')).toBe(
      'bg-red-50 border-red-200'
    );
  });

  it('falls back to /notifications when link is missing or invalid', () => {
    expect(resolveNotificationItemNavigationLink(null)).toBe('/notifications');
    expect(resolveNotificationItemNavigationLink('admin/dashboard')).toBe('/notifications');
    expect(resolveNotificationItemNavigationLink('/admin/assets?project=12')).toBe(
      '/notifications'
    );
  });

  it('keeps allowed EPP links', () => {
    expect(resolveNotificationItemNavigationLink('/supervisor/dashboard')).toBe(
      '/supervisor/dashboard'
    );
    expect(resolveNotificationItemNavigationLink('/admin/trabajadores?perfil=123')).toBe(
      '/admin/trabajadores?perfil=123'
    );
  });

  it('rejects legacy authenticated bodega and worker links', () => {
    expect(resolveNotificationItemNavigationLink('/bodega/operaciones')).toBe('/notifications');
    expect(resolveNotificationItemNavigationLink('/worker/dashboard')).toBe('/notifications');
  });

  it('builds full presentation object preserving navigation fallback', () => {
    const presentation = getNotificationItemPresentation({
      type: 'system',
      link: '/unknown/path',
    });

    expect(presentation).toEqual({
      icon: '',
      unreadColorClass: 'bg-gray-50 border-gray-200',
      navigationLink: '/notifications',
    });
  });

  it('retorna color naranja para proyecto_finalizado_con_articulos', () => {
    expect(resolveNotificationItemUnreadColorClass('proyecto_finalizado_con_articulos')).toBe(
      'bg-orange-50 border-orange-200'
    );
  });

  it('permite path dinámico /ubicacion/proyectos/:id en navigation link', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(resolveNotificationItemNavigationLink(`/ubicacion/proyectos/${uuid}`)).toBe(
      `/ubicacion/proyectos/${uuid}`
    );
  });

  it('sigue rechazando paths no permitidos bajo /ubicacion/proyectos/', () => {
    expect(resolveNotificationItemNavigationLink('/ubicacion/proyectos')).toBe(
      '/ubicacion/proyectos'
    );
    expect(resolveNotificationItemNavigationLink('/ubicacion/proyectos/../admin')).toBe(
      '/notifications'
    );
  });
});
