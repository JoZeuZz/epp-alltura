import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStoredTokens,
  getStoredAccessToken,
  refreshAccessToken,
} from '../shell/services/authRefresh';
import { createHttpClient, HttpAuthError } from '../shell/services/httpClient';

vi.mock('../shell/services/authRefresh', () => ({
  clearStoredTokens: vi.fn(),
  getStoredAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

vi.mock('axios', () => {
  const mockInstance = Object.assign(vi.fn(), {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  });

  const create = vi.fn(() => mockInstance);

  return {
    default: {
      create,
      __mockInstance: mockInstance,
    },
    create,
    __mockInstance: mockInstance,
  };
});

type MockAxiosModule = {
  create: ReturnType<typeof vi.fn>;
  __mockInstance: ReturnType<typeof vi.fn> & {
    interceptors: {
      request: { use: ReturnType<typeof vi.fn> };
      response: { use: ReturnType<typeof vi.fn> };
    };
  };
};

const mockedAxios = axios as unknown as MockAxiosModule;
const clearStoredTokensMock = vi.mocked(clearStoredTokens);
const getStoredAccessTokenMock = vi.mocked(getStoredAccessToken);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);

function getRequestInterceptor() {
  const calls = mockedAxios.__mockInstance.interceptors.request.use.mock.calls;
  const interceptor = calls[0]?.[0];
  if (typeof interceptor !== 'function') {
    throw new Error('Request interceptor no registrado');
  }
  return interceptor as (config: { headers?: Record<string, string> }) => {
    headers?: Record<string, string>;
  };
}

function getResponseErrorInterceptor() {
  const calls = mockedAxios.__mockInstance.interceptors.response.use.mock.calls;
  const interceptor = calls[0]?.[1];
  if (typeof interceptor !== 'function') {
    throw new Error('Response error interceptor no registrado');
  }
  return interceptor as (error: unknown) => Promise<unknown>;
}

describe('httpClient retry contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockedAxios.__mockInstance.mockReset();
    mockedAxios.__mockInstance.interceptors.request.use.mockReset();
    mockedAxios.__mockInstance.interceptors.response.use.mockReset();

    getStoredAccessTokenMock.mockImplementation(() => localStorage.getItem('accessToken'));
  });

  it('request interceptor agrega Authorization usando el access token almacenado', () => {
    localStorage.setItem('accessToken', 'token-inicial');

    createHttpClient();
    const requestInterceptor = getRequestInterceptor();

    const config = requestInterceptor({ headers: {} });

    expect(config.headers?.Authorization).toBe('Bearer token-inicial');
  });

  it('ante 401 intenta refresh y reintenta el request original con nuevo token', async () => {
    refreshAccessTokenMock.mockResolvedValue('token-refrescado');
    mockedAxios.__mockInstance.mockResolvedValue({ data: { ok: true } });

    createHttpClient({ authFailureMode: 'throw' });
    const responseErrorInterceptor = getResponseErrorInterceptor();

    const result = await responseErrorInterceptor({
      response: { status: 401 },
      config: {
        url: '/inventario/stock',
        headers: {},
      },
    });

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(mockedAxios.__mockInstance).toHaveBeenCalledTimes(1);

    const retriedConfig = mockedAxios.__mockInstance.mock.calls[0][0] as {
      _retry?: boolean;
      headers?: Record<string, string>;
    };

    expect(retriedConfig._retry).toBe(true);
    expect(retriedConfig.headers?.Authorization).toBe('Bearer token-refrescado');
    expect(clearStoredTokensMock).not.toHaveBeenCalled();
    expect(result).toEqual({ data: { ok: true } });
  });

  it('si refresh falla, limpia tokens y rechaza con HttpAuthError', async () => {
    refreshAccessTokenMock.mockResolvedValue(null);

    createHttpClient({ authFailureMode: 'throw' });
    const responseErrorInterceptor = getResponseErrorInterceptor();

    await expect(
      responseErrorInterceptor({
        response: { status: 401 },
        config: {
          url: '/inventario/stock',
          headers: {},
          authFailureMode: 'throw',
        },
      })
    ).rejects.toBeInstanceOf(HttpAuthError);

    expect(clearStoredTokensMock).toHaveBeenCalledTimes(1);
  });

  it('no aplica retry para errores distintos a 401', async () => {
    createHttpClient({ authFailureMode: 'throw' });
    const responseErrorInterceptor = getResponseErrorInterceptor();

    const nonAuthError = { response: { status: 500 } };

    await expect(responseErrorInterceptor(nonAuthError)).rejects.toBe(nonAuthError);
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(clearStoredTokensMock).not.toHaveBeenCalled();
  });
});
