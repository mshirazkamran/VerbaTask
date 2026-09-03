import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../lib/store';

export function useMerchantProfile() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => api.get('/api/merchant/profile'),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useUpdateMerchantProfile() {
  const queryClient = useQueryClient();
  const setMerchant = useAuthStore((state) => state.setMerchant);

  return useMutation({
    mutationFn: (updates) => api.patch('/api/merchant/profile', updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchant() });
      if (data) {
        setMerchant(data);
      }
    },
  });
}

export function usePaymentMethods() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: queryKeys.paymentMethods(),
    queryFn: () => api.get('/api/merchant/payment-methods'),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useUpdatePaymentMethods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => api.put('/api/merchant/payment-methods', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchant() });
    },
  });
}
