import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  refreshAccessToken,
  storeTokens,
} from '../services/authRefresh';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('authRefresh token contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('storeTokens guarda accessToken y refreshToken', () => {
    storeTokens('access-1', 'refresh-1');

    expect(getStoredAccessToken()).toBe('access-1');
    expect(getStoredRefreshToken()).toBe('refresh-1');
  });

  it('storeTokens actualiza accessToken sin sobreescribir refreshToken cuando no se entrega', () => {
    localStorage.setItem('refreshToken', 'refresh-previo');

    storeTokens('access-nuevo');

    expect(getStoredAccessToken()).toBe('access-nuevo');
    expect(getStoredRefreshToken()).toBe('refresh-previo');
  });

  it('clearStoredTokens elimina ambas keys de sesión', () => {
    localStorage.setItem('accessToken', 'access-x');
    localStorage.setItem('refreshToken', 'refresh-x');

    clearStoredTokens();

    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('refreshAccessToken usa singleton promise para evitar refresh concurrente duplicado', async () => {
    localStorage.setItem('refreshToken', 'refresh-1');

    const deferred = createDeferred<{ ok: boolean; json: () => Promise<unknown> }>();
    const fetchMock = vi.fn().mockReturnValue(deferred.promise);
    vi.stubGlobal('fetch', fetchMock);

    const p1 = refreshAccessToken();
    const p2 = refreshAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    deferred.resolve({
      ok: true,
      json: async () => ({ data: { accessToken: 'access-refrescado', refreshToken: 'refresh-2' } }),
    });

    await expect(p1).resolves.toBe('access-refrescado');
    await expect(p2).resolves.toBe('access-refrescado');

    expect(getStoredAccessToken()).toBe('access-refrescado');
    expect(getStoredRefreshToken()).toBe('refresh-2');
  });

  it('refreshAccessToken retorna null si no existe refreshToken almacenado', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
