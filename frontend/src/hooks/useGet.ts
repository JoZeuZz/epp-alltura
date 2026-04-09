// filepath: src/hooks/useGet.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { get } from '../services/apiService';

type QueryKey = string | readonly unknown[];

export const useGet = <T>(key: QueryKey, url: string, params?: unknown, options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>) => {
  const queryKey = Array.isArray(key)
    ? (params === undefined ? key : [...key, params])
    : [key, params];

  return useQuery<T>({
    queryKey,
    queryFn: () => get<T>(url, params),
    ...options,
  });
};
