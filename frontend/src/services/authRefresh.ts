type RefreshResponse = {
  accessToken?: string;
  refreshToken?: string;
};

let refreshPromise: Promise<string | null> | null = null;

export const getStoredAccessToken = () => localStorage.getItem('accessToken');

export const getStoredRefreshToken = () => localStorage.getItem('refreshToken');

export const storeTokens = (accessToken?: string, refreshToken?: string) => {
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
  }
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export const clearStoredTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

const runRefresh = async (): Promise<string | null> => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as RefreshResponse;
    if (!data?.accessToken) {
      return null;
    }

    storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch (_error) {
    return null;
  }
};

export const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};
