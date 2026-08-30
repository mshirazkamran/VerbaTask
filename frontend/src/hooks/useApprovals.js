import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useApprovals(status = 'pending') {
  return useQuery({
    queryKey: queryKeys.approvals(status),
    queryFn: () => api.get(`/api/approvals?status=${status}`),
    staleTime: 30 * 1000,
  });
}

export function useRespondApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision }) =>
      api.patch(`/api/approvals/${id}/respond`, { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
    },
  });
}
