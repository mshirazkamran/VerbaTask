import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { useAuthStore } from '../lib/store';

function getLocalStore(mId) {
  try {
    const raw = localStorage.getItem(`verbatask_customers_${mId}`);
    return raw ? JSON.parse(raw) : { created: [], updated: {}, deleted: [] };
  } catch (_) {
    return { created: [], updated: {}, deleted: [] };
  }
}

function saveLocalStore(mId, store) {
  try {
    localStorage.setItem(`verbatask_customers_${mId}`, JSON.stringify(store));
  } catch (_) {}
}

export function useCustomers() {
  const queryClient = useQueryClient();
  const merchant = useAuthStore((state) => state.merchant);
  const mId = merchant?._id || 'store';

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
      let serverList = [];
      try {
        const res = await api.get('/api/customers');
        if (Array.isArray(res)) serverList = res;
      } catch (err) {
        console.warn('[Customers] Server GET failed, using local overlay:', err.message);
      }

      const store = getLocalStore(mId);
      // Filter out deleted
      let merged = serverList.filter((c) => !store.deleted.includes(c._id));

      // Apply updates
      merged = merged.map((c) => {
        if (store.updated[c._id]) {
          return { ...c, ...store.updated[c._id] };
        }
        return c;
      });

      // Append created
      for (const createdCust of store.created) {
        if (!store.deleted.includes(createdCust._id) && !merged.some((m) => m._id === createdCust._id)) {
          const up = store.updated[createdCust._id];
          merged.push(up ? { ...createdCust, ...up } : createdCust);
        }
      }

      return merged;
    },
  });
}

export function useSettleBalance() {
  const queryClient = useQueryClient();
  const merchant = useAuthStore((state) => state.merchant);
  const mId = merchant?._id || 'store';

  return useMutation({
    mutationFn: async ({ customerId, amount }) => {
      try {
        return await api.post(`/api/customers/${customerId}/settle`, { amount });
      } catch (err) {
        console.warn('[Customers] Settle fallback to local overlay:', err.message);
        const store = getLocalStore(mId);
        const currentUpdated = store.updated[customerId] || {};
        const oldBal = currentUpdated.balance ?? 0;
        store.updated[customerId] = {
          ...currentUpdated,
          balance: Math.max(0, oldBal - Number(amount)),
        };
        saveLocalStore(mId, store);
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const merchant = useAuthStore((state) => state.merchant);
  const mId = merchant?._id || 'store';

  return useMutation({
    mutationFn: async (payload) => {
      const localId = 'cust_' + Date.now();
      const localCustomer = {
        _id: localId,
        merchantId: mId,
        name: payload.name.trim().toLowerCase(),
        phone: payload.phone ? String(payload.phone).trim() : undefined,
        balance: Math.max(0, Number(payload.balance) || 0),
        createdAt: new Date().toISOString(),
      };

      try {
        const res = await api.post('/api/customers', payload);
        return res || localCustomer;
      } catch (err) {
        console.warn('[Customers] Server POST failed, saved to local overlay:', err.message);
        const store = getLocalStore(mId);
        store.created.push(localCustomer);
        saveLocalStore(mId, store);
        return localCustomer;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const merchant = useAuthStore((state) => state.merchant);
  const mId = merchant?._id || 'store';

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      try {
        return await api.patch(`/api/customers/${id}`, payload);
      } catch (err) {
        console.warn('[Customers] Server PATCH failed, updated in local overlay:', err.message);
        const store = getLocalStore(mId);
        store.updated[id] = {
          ...(store.updated[id] || {}),
          ...payload,
        };
        saveLocalStore(mId, store);
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const merchant = useAuthStore((state) => state.merchant);
  const mId = merchant?._id || 'store';

  return useMutation({
    mutationFn: async (id) => {
      try {
        return await api.delete(`/api/customers/${id}`);
      } catch (err) {
        console.warn('[Customers] Server DELETE failed, marked deleted locally:', err.message);
        const store = getLocalStore(mId);
        if (!store.deleted.includes(id)) {
          store.deleted.push(id);
        }
        store.created = store.created.filter((c) => c._id !== id);
        saveLocalStore(mId, store);
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

