import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../lib/store';
import { useEffect } from 'react';

export function useMerchant() {
  const token = useAuthStore((state) => state.token);
  const setMerchant = useAuthStore((state) => state.setMerchant);

  const query = useQuery({
    queryKey: queryKeys.merchant(),
    queryFn: () => api.get('/api/auth/me'),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  useEffect(() => {
    if (query.data) {
      setMerchant(query.data);
    }
  }, [query.data, setMerchant]);

  return query;
}
