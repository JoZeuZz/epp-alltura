// filepath: src/hooks/useGet.ts
import { useQuery } from '@tanstack/react-query';
import { get } from '../services/apiService';

export const useGet = <T>(key: string, url: string, params?: unknown) => {
  return useQuery<T>({ queryKey: [key, params], queryFn: () => get<T>(url, params) });
};
