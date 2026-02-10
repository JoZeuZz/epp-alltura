type RefreshTokens = {
  accessToken?: string;
  refreshToken?: string;
};

type RefreshResponse = RefreshTokens & {
  success?: boolean;
  data?: RefreshTokens;
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

    const responsePayload = (await response.json()) as RefreshResponse;
    const tokens =
      responsePayload?.data && typeof responsePayload.data === 'object'
        ? responsePayload.data
        : responsePayload;

    if (!tokens?.accessToken) {
      return null;
    }

    storeTokens(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  } catch {
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
