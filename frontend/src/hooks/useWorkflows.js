import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useWorkflows() {
  return useQuery({
    queryKey: queryKeys.workflows(),
    queryFn: () => api.get('/api/workflows'),
    staleTime: 60 * 1000,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => api.post('/api/workflows', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/api/workflows/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.del(`/api/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}
