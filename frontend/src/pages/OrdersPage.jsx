import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  IconSearch,
  IconAlertCircle,
  IconX,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useOrders, useCreateOrder } from '../hooks/useOrders';
import { useInventory } from '../hooks/useInventory';
import { formatPKR, formatDate, formatQuantity } from '../lib/format';

const PAYMENT_METHODS = ['easypaisa', 'jazzcash', 'bank', 'cash'];

function NewOrderModal({ isOpen, onClose }) {
  const { data: inventory } = useInventory();
  const createOrder = useCreateOrder();

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [items, setItems] = useState([
    { inventoryItemId: '', name: '', quantity: 1, price: 0 },
  ]);

  const inventoryMap = useMemo(() => {
    const map = new Map();
    (inventory || []).forEach((item) => map.set(item._id, item));
    return map;
  }, [inventory]);

  const updateItem = (idx, updates) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...updates };
      return next;
    });
  };

  const handleSelectItem = (idx, inventoryItemId) => {
    const item = inventoryMap.get(inventoryItemId);
    updateItem(idx, {
      inventoryItemId,
      name: item?.name || '',
      price: item?.price || 0,
    });
  };

  const addLine = () => {
    setItems((prev) => [...prev, { inventoryItemId: '', name: '', quantity: 1, price: 0 }]);
  };

  const removeLine = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const total = items.reduce((sum, i) => sum + (i.price || 0) * (Number(i.quantity) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.inventoryItemId && Number(i.quantity) > 0);
    if (!validItems.length) {
      toast.error('Add at least one item');
      return;
    }

    try {
      await createOrder.mutateAsync({
        items: validItems.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          name: i.name,
          quantity: Number(i.quantity),
          price: i.price,
        })),
        total,
        paymentMethod,
        source: 'dashboard',
      });
      toast.success('Order created');
      setItems([{ inventoryItemId: '', name: '', quantity: 1, price: 0 }]);
      setPaymentMethod('cash');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create order');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New order"
      description="Create an order directly from the dashboard."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="flex-1">
                <select
                  value={item.inventoryItemId}
                  onChange={(e) => handleSelectItem(idx, e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  <option value="" disabled>
                    Select item
                  </option>
                  {(inventory || []).map((inv) => (
                    <option key={inv._id} value={inv._id}>
                      {inv.name} ({formatQuantity(inv.quantity, inv.unit)} @ {formatPKR(inv.price)})
                    </option>
                  ))}
                </select>
              </div>
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                className="w-24"
                required
              />
              <div className="w-28 pt-2 text-sm text-ink font-tabular text-right">
                {formatPKR((item.price || 0) * (Number(item.quantity) || 0))}
              </div>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-ruby hover:text-ruby hover:bg-ruby/10 px-2"
                  onClick={() => removeLine(idx)}
                >
                  <IconTrash className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<IconPlus className="w-4 h-4" />}
          onClick={addLine}
        >
          Add item
        </Button>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-hairline">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-secondary">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-10 px-3 text-sm bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <Card padding="sm" className="bg-canvas-soft/50 flex flex-col justify-center">
            <p className="text-[11px] text-ink-mute uppercase tracking-wider">Total</p>
            <p className="text-lg font-light text-ink font-tabular">{formatPKR(total)}</p>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={createOrder.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={createOrder.isPending}>
            Create order
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders();
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: 'items',
        header: 'Items',
        cell: ({ getValue }) => {
          const items = getValue() || [];
          const summary = items.map((i) => `${i.name} x${i.quantity}`).join(', ');
          return (
            <span className="truncate max-w-[240px] block" title={summary}>
              {summary || '-'}
            </span>
          );
        },
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ getValue }) => <span className="font-tabular">{formatPKR(getValue())}</span>,
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Payment',
        cell: ({ getValue }) => (
          <span className="capitalize text-ink-secondary">{getValue()}</span>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ getValue }) => <Badge variant={getValue()}>{getValue()}</Badge>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <Badge variant={getValue()}>{getValue()}</Badge>,
      },
    ],
    []
  );

  const table = useReactTable({
    data: orders || [],
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { sorting: [{ id: 'createdAt', desc: true }] },
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-light text-ink tracking-tight">Orders</h2>
          <p className="text-xs text-ink-mute">Review transactions and order history</p>
        </div>
        <Card padding="lg" className="text-center py-12">
          <IconAlertCircle className="w-10 h-10 text-ruby mx-auto mb-3" />
          <h3 className="text-base font-medium text-ink">Failed to load orders</h3>
          <p className="text-xs text-ink-mute mt-1">{error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-light text-ink tracking-tight">Orders</h2>
          <p className="text-xs text-ink-mute">Review transactions and order history</p>
        </div>
        <Button leftIcon={<IconPlus className="w-4 h-4" />} onClick={() => setNewOrderOpen(true)}>
          New order
        </Button>
      </div>

      <Card padding="sm" className="flex items-center gap-3">
        <IconSearch className="w-4 h-4 text-ink-mute ml-2" />
        <Input
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 shadow-none focus:ring-0 h-9"
        />
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
        </div>
      ) : (
        <Table
          table={table}
          onRowClick={(order) => setSelectedOrder(order)}
          emptyText="No orders found"
        />
      )}

      <NewOrderModal isOpen={newOrderOpen} onClose={() => setNewOrderOpen(false)} />

      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order details"
        maxWidth="max-w-lg"
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Card padding="sm" className="bg-canvas-soft/50">
                <p className="text-[11px] text-ink-mute uppercase tracking-wider">Total</p>
                <p className="text-lg font-light text-ink font-tabular">{formatPKR(selectedOrder.total)}</p>
              </Card>
              <Card padding="sm" className="bg-canvas-soft/50">
                <p className="text-[11px] text-ink-mute uppercase tracking-wider">Status</p>
                <div className="mt-1">
                  <Badge variant={selectedOrder.status}>{selectedOrder.status}</Badge>
                </div>
              </Card>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-secondary">Payment method</span>
                <span className="capitalize text-ink font-medium">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-secondary">Source</span>
                <Badge variant={selectedOrder.source}>{selectedOrder.source}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-secondary">Created</span>
                <span className="text-ink font-medium">{formatDate(selectedOrder.createdAt)}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-ink-secondary mb-2">Items</p>
              <ul className="divide-y divide-hairline border border-hairline rounded-lg">
                {(selectedOrder.items || []).map((item, idx) => (
                  <li key={idx} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-ink">{item.name}</p>
                      <p className="text-[11px] text-ink-mute">
                        {formatPKR(item.price)} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-ink font-tabular">{formatQuantity(item.quantity)}</p>
                      <p className="text-[11px] text-ink-mute">
                        {formatPKR((item.price || 0) * item.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedOrder(null)} leftIcon={<IconX className="w-4 h-4" />}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
