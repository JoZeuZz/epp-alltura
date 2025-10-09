// filepath: src/hooks/usePost.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/apiService';

export const usePost = <T, U>(key: string, url: string) => {
  const queryClient = useQueryClient();
  return useMutation<T, Error, U>({
    mutationFn: (data: U) => api.post<T>(url, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
};

export const usePut = <T, U extends { id: number }>(
  key: string,
  url: string,
) => {
  const queryClient = useQueryClient();
  return useMutation<T, Error, U>({
    mutationFn: (data) => {
      const { id, ...payload } = data;
      return api.put<T>(`${url}/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
};

export const useDelete = <T>(key: string, url: string) => {
  const queryClient = useQueryClient();
  return useMutation<T, Error, number>({
    mutationFn: (id: number) => api.del<T>(`${url}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
};
