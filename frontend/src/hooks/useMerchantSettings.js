import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../lib/store';
import { normalizePhone } from '../lib/format';

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
      const stored =
        localStorage.getItem(`verbatask_staff_${mId}`) ||
        localStorage.getItem(`boldukan_staff_${mId}`);
      const rawLocalList = stored ? JSON.parse(stored) : [];
      // Deduplicate local fallback list by normalized phone
      const localList = rawLocalList.filter((item, idx, arr) => {
        const norm = normalizePhone(item.whatsappNumber);
        return idx === arr.findIndex((x) => (norm && normalizePhone(x.whatsappNumber) === norm) || x._id === item._id);
      });

      const defaultCode = `VT-${(merchant?._id || '1098').slice(-4).toUpperCase()}`;

      try {
        const res = await api.get('/api/merchant/staff');
        const staffData = res?.data || res;
        if (staffData && Array.isArray(staffData.staffMembers)) {
          // Deduplicate server list by normalized phone
          const serverMembers = staffData.staffMembers.filter((item, idx, arr) => {
            const norm = normalizePhone(item.whatsappNumber);
            return idx === arr.findIndex((x) => (norm && normalizePhone(x.whatsappNumber) === norm) || x._id === item._id);
          });

          // Server is single source of truth — sync local storage directly
          localStorage.setItem(`verbatask_staff_${mId}`, JSON.stringify(serverMembers));
          localStorage.removeItem(`boldukan_staff_${mId}`);

          return {
            ...staffData,
            shopCode: staffData.shopCode || defaultCode,
            staffMembers: serverMembers,
            activeCount: serverMembers.filter((s) => s.active).length,
          };
        }
      } catch (err) {
        console.warn('[Staff] Remote staff API fallback:', err.message);
      }

      return {
        shopCode: merchant?.shopCode || defaultCode,
        subscriptionTier: 'pro',
        staffLimit: 5,
        activeCount: localList.filter((s) => s.active).length,
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
      const normPhone = normalizePhone(payload.whatsappNumber);

      try {
        const res = await api.post('/api/merchant/staff', {
          name: payload.name.trim(),
          whatsappNumber: normPhone,
        });

        // Server returned updated staff list: sync with localStorage directly
        const serverList = res?.staffMembers || res?.data?.staffMembers;
        if (Array.isArray(serverList)) {
          localStorage.setItem(`verbatask_staff_${mId}`, JSON.stringify(serverList));
          localStorage.removeItem(`boldukan_staff_${mId}`);
        }
        return res;
      } catch (err) {
        console.warn('[Staff] Remote add failed, saved locally:', err.message);
        const stored =
          localStorage.getItem(`verbatask_staff_${mId}`) ||
          localStorage.getItem(`boldukan_staff_${mId}`);
        const list = stored ? JSON.parse(stored) : [];

        const existingIdx = list.findIndex(
          (m) => normalizePhone(m.whatsappNumber) === normPhone
        );
        if (existingIdx >= 0) {
          list[existingIdx] = {
            ...list[existingIdx],
            name: payload.name.trim(),
            active: true,
          };
        } else {
          list.push({
            _id: 'staff_' + Date.now(),
            name: payload.name.trim(),
            whatsappNumber: normPhone,
            active: true,
            createdAt: new Date().toISOString(),
          });
        }
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
      const stored =
        localStorage.getItem(`verbatask_staff_${mId}`) ||
        localStorage.getItem(`boldukan_staff_${mId}`);
      if (stored) {
        const list = JSON.parse(stored).filter(
          (m) => m._id !== staffId && m.whatsappNumber !== staffId && normalizePhone(m.whatsappNumber) !== normalizePhone(staffId)
        );
        localStorage.setItem(`verbatask_staff_${mId}`, JSON.stringify(list));
      }

      try {
        const res = await api.delete(`/api/merchant/staff/${staffId}`);
        const serverList = res?.staffMembers || res?.data?.staffMembers;
        if (Array.isArray(serverList)) {
          localStorage.setItem(`verbatask_staff_${mId}`, JSON.stringify(serverList));
        }
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
