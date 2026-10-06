import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/api/customers');
      return res; // res is already the data array
    },
  });
}

export function useSettleBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, amount }) => {
      const res = await api.post(`/api/customers/${customerId}/settle`, { amount });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
