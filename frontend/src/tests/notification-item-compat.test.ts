import { describe, expect, it } from 'vitest';
import {
  getNotificationItemPresentation,
  resolveNotificationItemIcon,
  resolveNotificationItemNavigationLink,
  resolveNotificationItemUnreadColorClass,
} from '../config/notificationItemCompat';

describe('notificationItemCompat', () => {
  it('returns fallback icon and color for unknown types', () => {
    expect(resolveNotificationItemIcon('unknown_type')).toBe('ℹ️');
    expect(resolveNotificationItemUnreadColorClass('unknown_type')).toBe('bg-gray-50');
  });

  it('returns known icon and color for legacy custody type', () => {
    expect(resolveNotificationItemIcon('custodia_vencida')).toBe('🚨');
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
    expect(resolveNotificationItemNavigationLink('/bodega/operaciones')).toBe(
      '/bodega/operaciones'
    );
    expect(resolveNotificationItemNavigationLink('/admin/trabajadores?perfil=123')).toBe(
      '/admin/trabajadores?perfil=123'
    );
  });

  it('builds full presentation object preserving navigation fallback', () => {
    const presentation = getNotificationItemPresentation({
      type: 'system',
      link: '/unknown/path',
    });

    expect(presentation).toEqual({
      icon: 'ℹ️',
      unreadColorClass: 'bg-gray-50 border-gray-200',
      navigationLink: '/notifications',
    });
  });
});
