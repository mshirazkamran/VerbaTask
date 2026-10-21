import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

/** Revenue analytics for the selected range ('7d' | '30d' | '90d' | '12m'). Live updates come from useRealtimeSync. */
export function useAnalytics(range = '30d') {
  return useQuery({
    queryKey: queryKeys.analytics(range),
    queryFn: () => api.get(`/api/analytics?range=${range}`),
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData,
  });
}
