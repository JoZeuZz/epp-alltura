import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotifications } from '../hooks/useNotifications';
import * as apiService from '../services/apiService';

vi.mock('../services/apiService', () => ({
  getInAppNotifications: vi.fn(),
  getUnreadNotificationsCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  deleteAllReadNotifications: vi.fn(),
  getNotificationStats: vi.fn(),
}));

const getInAppNotificationsMock = vi.mocked(apiService.getInAppNotifications);
const getUnreadNotificationsCountMock = vi.mocked(apiService.getUnreadNotificationsCount);

function setDocumentVisibility(hidden: boolean, emitEvent = false) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });

  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });

  if (emitEvent) {
    document.dispatchEvent(new Event('visibilitychange'));
  }
}

async function flushAsyncEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('useNotifications polling behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setDocumentVisibility(false);

    getInAppNotificationsMock.mockResolvedValue([]);
    getUnreadNotificationsCountMock.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("autoRefreshMode 'unread-only' consulta solo unread-count en polling", async () => {
    const { unmount } = renderHook(() =>
      useNotifications({
        autoRefresh: true,
        refreshInterval: 1000,
        autoRefreshMode: 'unread-only',
      })
    );

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getInAppNotificationsMock).toHaveBeenCalledTimes(0);
    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getInAppNotificationsMock).toHaveBeenCalledTimes(0);
    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('no ejecuta polling mientras la pestaña está oculta', async () => {
    setDocumentVisibility(true);

    const { unmount } = renderHook(() =>
      useNotifications({
        autoRefresh: true,
        refreshInterval: 1000,
        autoRefreshMode: 'unread-only',
        pauseWhenHidden: true,
      })
    );

    await act(async () => {
      await flushAsyncEffects();
    });

    const callsAfterInitialLoad = getUnreadNotificationsCountMock.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(callsAfterInitialLoad);
    unmount();
  });

  it('al volver visible dispara refresh inmediato', async () => {
    setDocumentVisibility(true);

    const { unmount } = renderHook(() =>
      useNotifications({
        autoRefresh: true,
        refreshInterval: 1000,
        autoRefreshMode: 'unread-only',
        pauseWhenHidden: true,
        refreshOnVisibilityReturn: true,
      })
    );

    await act(async () => {
      await flushAsyncEffects();
    });

    const callsAfterInitialLoad = getUnreadNotificationsCountMock.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(callsAfterInitialLoad);

    act(() => {
      setDocumentVisibility(false, true);
    });

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(callsAfterInitialLoad + 1);
    unmount();
  });

  it("autoRefreshMode 'full' consulta in-app y unread-count por tick", async () => {
    const { unmount } = renderHook(() =>
      useNotifications({
        autoRefresh: true,
        refreshInterval: 1000,
        autoRefreshMode: 'full',
      })
    );

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getInAppNotificationsMock).toHaveBeenCalledTimes(1);
    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getInAppNotificationsMock).toHaveBeenCalledTimes(2);
    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('no inicia polling periódico cuando autoRefresh está desactivado', async () => {
    const { unmount } = renderHook(() =>
      useNotifications({
        autoRefresh: false,
        refreshInterval: 1000,
        autoRefreshMode: 'unread-only',
      })
    );

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('limpia el intervalo de polling al desmontar para evitar fugas', async () => {
    const { unmount } = renderHook(() =>
      useNotifications({
        autoRefresh: true,
        refreshInterval: 1000,
        autoRefreshMode: 'unread-only',
      })
    );

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      await flushAsyncEffects();
    });

    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(2);

    unmount();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(getUnreadNotificationsCountMock).toHaveBeenCalledTimes(2);
  });
});
