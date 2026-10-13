import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { socket, connectSocket } from '../lib/socket';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../lib/store';

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const merchantId = useAuthStore((state) => state.merchantId);
  const [connectionStatus, setConnectionStatus] = useState(
    socket.connected ? 'connected' : 'connecting'
  );
  const [lastSync, setLastSync] = useState(Date.now());
  const lastToastTimeRef = useRef(0);

  const invalidateAll = useCallback(
    (meta = {}) => {
      // Invalidate all core queries so every dashboard view stays updated
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows() });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchant() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff() });
      setLastSync(Date.now());

      // Debounce notifications slightly (min 1.5s between toasts)
      const now = Date.now();
      if (now - lastToastTimeRef.current > 1500) {
        lastToastTimeRef.current = now;

        if (meta?.type === 'order') {
          const totalStr = meta.total ? `Rs. ${Number(meta.total).toLocaleString()}` : '';
          const staffTag = meta.staffName ? ` (Staff: ${meta.staffName})` : '';
          toast.success(`⚡ Live: New sale recorded via WhatsApp!${staffTag}`, {
            id: 'realtime-order',
            description: totalStr ? `Amount: ${totalStr} — Dashboard updated.` : 'Stock and metrics updated.',
            duration: 4000,
          });
        } else if (meta?.type === 'customer') {
          toast.info('⚡ Live: Customer ledger updated', {
            id: 'realtime-customer',
            description: meta.customerName ? `${meta.customerName}'s balance updated.` : 'Khata ledger updated.',
            duration: 3500,
          });
        } else if (meta?.type === 'staff') {
          toast.success('⚡ Live: Store staff team updated', {
            id: 'realtime-staff',
            description: meta.staffMember?.name ? `${meta.staffMember.name} joined via Shop Code!` : 'Team members updated.',
            duration: 3500,
          });
        } else if (meta?.type === 'approval') {
          toast.info('⚡ Live: Approval decision processed', {
            id: 'realtime-approval',
            description: 'Orders and approvals updated.',
            duration: 3500,
          });
        } else if (meta?.type === 'inventory') {
          toast.info('⚡ Live: Inventory stock updated', {
            id: 'realtime-inventory',
            description: meta.itemName ? `Updated ${meta.itemName}` : 'Stock records updated.',
            duration: 3000,
          });
        } else if (meta?.type === 'workflow') {
          toast.info('⚡ Live: Workflow automation updated', {
            id: 'realtime-workflow',
            duration: 3000,
          });
        }
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!merchantId) return;

    connectSocket();

    const handleConnect = () => setConnectionStatus('connected');
    const handleDisconnect = () => setConnectionStatus('disconnected');
    const handleConnectError = () => setConnectionStatus('disconnected');

    const handleUpdate = (data) => {
      console.log('[Realtime] dashboard_update event:', data);
      invalidateAll(data);
    };

    const handleMerchantUpdate = (data) => {
      if (!data?.merchantId || String(data.merchantId) === String(merchantId)) {
        console.log('[Realtime] merchant_update event:', data);
        invalidateAll(data);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('dashboard_update', handleUpdate);
    socket.on('merchant_update', handleMerchantUpdate);

    if (socket.connected) {
      setConnectionStatus('connected');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('dashboard_update', handleUpdate);
      socket.off('merchant_update', handleMerchantUpdate);
    };
  }, [merchantId, invalidateAll]);

  const forceSync = useCallback(() => {
    connectSocket();
    invalidateAll();
    toast.success('Synced with server', { duration: 2000 });
  }, [invalidateAll]);

  return {
    connectionStatus,
    lastSync,
    forceSync,
  };
}
