import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { socket } from '../lib/socket';

export function useCustomers() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdate = (data) => {
      if (!data || data.type === 'customer' || data.type === 'order') {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      }
    };
    socket.on('dashboard_update', handleUpdate);
    return () => {
      socket.off('dashboard_update', handleUpdate);
    };
  }, [queryClient]);

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
