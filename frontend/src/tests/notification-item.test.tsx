import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import NotificationItem from '../components/NotificationItem';
import type { InAppNotification } from '../types/clientNotes';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const baseNotification: InAppNotification = {
  id: 1,
  user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  type: 'system',
  title: 'Notificación de prueba',
  message: 'Mensaje de prueba',
  metadata: null,
  link: null,
  is_read: true,
  read_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('NotificationItem navigation', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('falls back to /notifications when link is legacy or invalid', async () => {
    const user = userEvent.setup();
    render(
      <NotificationItem
        notification={{ ...baseNotification, link: '/admin/assets?project=12' }}
        onMarkAsRead={vi.fn(async () => {})}
        onDelete={vi.fn(async () => {})}
      />
    );

    await user.click(screen.getByText('Notificación de prueba'));
    expect(navigateMock).toHaveBeenCalledWith('/notifications');
  });

  it('keeps navigation for allowed EPP route links', async () => {
    const user = userEvent.setup();
    render(
      <NotificationItem
        notification={{ ...baseNotification, link: '/bodega/operaciones' }}
        onMarkAsRead={vi.fn(async () => {})}
        onDelete={vi.fn(async () => {})}
      />
    );

    await user.click(screen.getByText('Notificación de prueba'));
    expect(navigateMock).toHaveBeenCalledWith('/bodega/operaciones');
  });
});
