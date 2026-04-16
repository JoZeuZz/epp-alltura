import { extractErrorMetadata } from './httpClient';

type LogLevel = 'error' | 'warn' | 'info';

const log = (level: LogLevel, message: string, error?: unknown) => {
  const meta = extractErrorMetadata(error);
  const payload = {
    requestId: meta.requestId,
    reason: meta.message,
  };

  if (level === 'error') {
    console.error(message, payload);
    return;
  }

  if (level === 'warn') {
    console.warn(message, payload);
    return;
  }

  console.info(message, payload);
};

export const frontendLogger = {
  error: (message: string, error?: unknown) => log('error', message, error),
  warn: (message: string, error?: unknown) => log('warn', message, error),
  info: (message: string, error?: unknown) => log('info', message, error),
};
