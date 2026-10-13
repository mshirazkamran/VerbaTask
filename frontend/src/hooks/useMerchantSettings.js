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

export function useRequestPhoneChange() {
  return useMutation({
    mutationFn: (newPhoneNumber) =>
      api.post('/api/merchant/phone/request-change', { newPhoneNumber }),
  });
}

export function useVerifyPhoneChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ newPhoneNumber, code }) =>
      api.post('/api/merchant/phone/verify-change', { newPhoneNumber, code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchant() });
    },
  });
}

export function useResendPhoneChangeCode() {
  return useMutation({
    mutationFn: (newPhoneNumber) =>
      api.post('/api/merchant/phone/resend-code', { newPhoneNumber }),
  });
}

export function useStaffMembers() {
  const token = useAuthStore((state) => state.token);
  const merchant = useAuthStore((state) => state.merchant);

  return useQuery({
    queryKey: queryKeys.staff(),
    queryFn: async () => {
      const mId = merchant?._id || 'store';
      const stored = localStorage.getItem(`verbatask_staff_${mId}`);
      const localList = stored ? JSON.parse(stored) : [];
      const defaultCode = `VT-${(merchant?._id || '1098').slice(-4).toUpperCase()}`;

      try {
        const res = await api.get('/api/merchant/staff');
        if (res) {
          // If server returns staff, merge with any local members
          const serverMembers = res.staffMembers || [];
          const merged = [...serverMembers];
          for (const lm of localList) {
            if (!merged.some((sm) => sm.whatsappNumber === lm.whatsappNumber || sm._id === lm._id)) {
              merged.push(lm);
            }
          }
          return {
            ...res,
            shopCode: res.shopCode || defaultCode,
            staffMembers: merged,
            activeCount: merged.length,
          };
        }
      } catch (err) {
        console.warn('[Staff] Remote staff API fallback:', err.message);
      }

      return {
        shopCode: merchant?.shopCode || defaultCode,
        subscriptionTier: 'pro',
        staffLimit: 5,
        activeCount: localList.length,
        staffMembers: localList,
      };
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

export function useAddStaffMember() {
  const queryClient = useQueryClient();
  const merchant = useAuthStore((state) => state.merchant);

  return useMutation({
    mutationFn: async (payload) => {
      const mId = merchant?._id || 'store';
      const stored = localStorage.getItem(`verbatask_staff_${mId}`);
      const list = stored ? JSON.parse(stored) : [];

      const newMember = {
        _id: 'staff_' + Date.now(),
        name: payload.name,
        whatsappNumber: payload.whatsappNumber,
        active: true,
        createdAt: new Date().toISOString(),
      };

      try {
        const res = await api.post('/api/merchant/staff', payload);
        // Also cache locally
        list.push(newMember);
        localStorage.setItem(`verbatask_staff_${mId}`, JSON.stringify(list));
        return res || { staffMembers: list };
      } catch (err) {
        console.warn('[Staff] Remote add failed, saved locally:', err.message);
        list.push(newMember);
        localStorage.setItem(`verbatask_staff_${mId}`, JSON.stringify(list));
        return { staffMembers: list };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
    },
  });
}

export function useRemoveStaffMember() {
  const queryClient = useQueryClient();
  const merchant = useAuthStore((state) => state.merchant);

  return useMutation({
    mutationFn: async (staffId) => {
      const mId = merchant?._id || 'store';
      const stored = localStorage.getItem(`verbatask_staff_${mId}`);
      if (stored) {
        const list = JSON.parse(stored).filter((m) => m._id !== staffId);
        localStorage.setItem(`verbatask_staff_${mId}`, JSON.stringify(list));
      }

      try {
        await api.delete(`/api/merchant/staff/${staffId}`);
      } catch (err) {
        console.warn('[Staff] Remote remove failed, removed locally:', err.message);
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
    },
  });
}

export function useRegenerateShopCode() {
  const queryClient = useQueryClient();
  const merchant = useAuthStore((state) => state.merchant);

  return useMutation({
    mutationFn: async () => {
      const newCode = `VT-${Math.floor(1000 + Math.random() * 9000)}`;
      try {
        const res = await api.post('/api/merchant/shop-code/regenerate');
        return res || { shopCode: newCode };
      } catch (err) {
        console.warn('[Staff] Remote regenerate failed, generated locally:', err.message);
        return { shopCode: newCode };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
    },
  });
}
