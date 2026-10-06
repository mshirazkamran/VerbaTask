import { useMemo, useState } from 'react';
import {
 useReactTable,
 getCoreRowModel,
 getSortedRowModel,
 getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Search,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useOrders, useCreateOrder } from '../hooks/useOrders';
import { useInventory } from '../hooks/useInventory';
import { formatPKR, formatDate, formatQuantity } from '../lib/format';

const PAYMENT_METHODS = ['easypaisa', 'jazzcash', 'bank', 'cash'];

const STATUS_TABS = [
 { id: 'all', label: 'All' },
 { id: 'completed', label: 'Completed' },
 { id: 'pending_approval', label: 'Waiting for approval' },
 { id: 'rejected', label: 'Rejected' },
];

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
 className="w-full h-10 px-3 text-[15px] bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
 className="!text-danger-ink hover:!bg-coral-tint !px-2.5"
 aria-label="Remove line"
 onClick={() => removeLine(idx)}
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 )}
 </div>
 ))}
 </div>

 <Button
 type="button"
 variant="outline"
 size="sm"
 leftIcon={<Plus className="w-4 h-4" />}
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
 className="h-11 rounded-input border border-rule-2 bg-surface px-3.5 text-[15px] text-ink hover:border-muted focus:border-ink focus:outline-none"
 >
 {PAYMENT_METHODS.map((m) => (
 <option key={m} value={m}>
 {m.charAt(0).toUpperCase() + m.slice(1)}
 </option>
 ))}
 </select>
 </div>
 <div className="flex flex-col justify-center rounded-input bg-pear-tint px-4 py-2">
 <p className="label">Total</p>
 <p className="font-mono text-lg font-semibold text-ink">{formatPKR(total)}</p>
 </div>
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
 const [statusFilter, setStatusFilter] = useState('all');
 const [selectedOrder, setSelectedOrder] = useState(null);
 const [newOrderOpen, setNewOrderOpen] = useState(false);

 const counts = useMemo(() => {
 const list = orders || [];
 return {
 all: list.length,
 completed: list.filter((o) => o.status === 'completed' || o.status === 'approved').length,
 pending_approval: list.filter((o) => o.status === 'pending_approval').length,
 rejected: list.filter((o) => o.status === 'rejected').length,
 };
 }, [orders]);

 const filteredOrders = useMemo(() => {
 if (!orders) return [];
 if (statusFilter === 'all') return orders;
 if (statusFilter === 'completed') {
 return orders.filter((o) => o.status === 'completed' || o.status === 'approved');
 }
 return orders.filter((o) => o.status === statusFilter);
 }, [orders, statusFilter]);

 const totalRevenue = useMemo(() => {
 return (orders || []).reduce((sum, o) => sum + (o.total || 0), 0);
 }, [orders]);

 const paymentDots = {
 cash: 'bg-primary',
 easypaisa: 'bg-pear-deep',
 jazzcash: 'bg-coral',
 bank: 'bg-sky',
 };

 const columns = useMemo(
 () => [
 {
 accessorKey: 'createdAt',
 header: 'Date',
 cell: ({ getValue }) => (
 <span className="whitespace-nowrap font-mono text-xs text-muted">
 {formatDate(getValue())}
 </span>
 ),
 },
 {
 accessorKey: 'items',
 header: 'Items',
 cell: ({ getValue }) => {
 const items = getValue() || [];
 const count = items.length;
 const summary = items.map((i) => `${i.name} x${i.quantity}`).join(', ');
 return (
 <div className="flex items-center gap-2 max-w-[260px]">
 <span className="shrink-0 font-mono text-[11px] text-muted">{count}×</span>
 <span className="truncate text-ink text-xs" title={summary}>
 {summary || '-'}
 </span>
 </div>
 );
 },
 },
 {
 accessorKey: 'total',
 header: 'Total',
 cell: ({ getValue }) => (
 <span className="font-mono text-sm font-semibold text-ink">
 {formatPKR(getValue())}
 </span>
 ),
 },
 {
 accessorKey: 'paymentMethod',
 header: 'Payment',
 cell: ({ getValue }) => {
 const key = (getValue() || 'cash').toLowerCase();
 return (
 <span className="inline-flex items-center gap-2 text-xs font-medium capitalize text-ink-2">
 <span className={`size-2 rounded-pill ${paymentDots[key] || 'bg-muted'}`} />
 {key}
 </span>
 );
 },
 },
 {
 accessorKey: 'source',
 header: 'Source',
 cell: ({ getValue }) => <Badge variant={getValue()} dot>{getValue()}</Badge>,
 },
 {
 accessorKey: 'status',
 header: 'Status',
 cell: ({ getValue }) => <Badge variant={getValue()} dot>{getValue()}</Badge>,
 },
 ],
 []
 );

 const table = useReactTable({
 data: filteredOrders,
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
 <p className="label">Ledger</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink">Orders</h1>
 </div>
 <Card padding="lg" className="text-center py-12">
 <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
 <h3 className="font-display text-lg font-semibold text-ink">Orders didn’t load</h3>
 <p className="mt-1 text-sm text-muted">{error.message}. Refresh to try again.</p>
 </Card>
 </div>
 );
 }

 const statusTone = {
 all: 'bg-ink',
 completed: 'bg-primary',
 pending_approval: 'bg-pear-deep',
 rejected: 'bg-coral',
 };

 return (
 <div className="space-y-5 sm:space-y-6">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
 <div>
 <p className="label">Ledger</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)]">Orders</h1>
 </div>
 <Button leftIcon={<Plus className="size-4" />} onClick={() => setNewOrderOpen(true)}>
 New order
 </Button>
 </div>

 {/* Volume slab (5) beside a status ledger that filters the table (7) */}
 <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
 <div className="flex flex-col justify-between gap-8 rounded-card bg-ink p-5 text-paper sm:p-7 lg:col-span-5">
 <p className="font-mono text-[11px] uppercase tracking-[0.1em] opacity-70">Volume recorded</p>
 <div>
 <p className="font-display text-[clamp(2.25rem,4vw+1rem,3.5rem)] font-semibold leading-none tracking-[-0.04em] font-tabular">
 {isLoading ? '—' : formatPKR(totalRevenue)}
 </p>
 <p className="mt-3 text-sm opacity-75">
 across {isLoading ? '—' : counts.all} order{counts.all === 1 ? '' : 's'}
 </p>
 </div>
 </div>

 <div className="surface-card p-2 lg:col-span-7" role="group" aria-label="Filter by status">
 {STATUS_TABS.map((tab) => {
 const active = statusFilter === tab.id;
 const n = counts[tab.id] ?? 0;
 const share = counts.all ? (n / counts.all) * 100 : 0;
 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => setStatusFilter(tab.id)}
 aria-pressed={active}
 className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-input px-4 py-3 text-left transition-colors duration-150 ${
 active ? 'bg-paper-2' : 'hover:bg-paper-2/60'
 }`}
 >
 <span className={`size-2.5 rounded-pill ${statusTone[tab.id]}`} />
 <span className="min-w-0">
 <span className={`block text-sm ${active ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>{tab.label}</span>
 {tab.id !== 'all' && (
 <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-pill bg-paper-3">
 <span className={`block h-full rounded-pill ${statusTone[tab.id]}`} style={{ width: `${share}%` }} />
 </span>
 )}
 </span>
 <span className="font-mono text-sm font-semibold text-ink">{isLoading ? '—' : n}</span>
 </button>
 );
 })}
 </div>
 </div>

 <Card padding="none" className="overflow-hidden">
 <div className="flex flex-col gap-3 px-5 pb-2 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
 <div>
 <h2 className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg">
 {STATUS_TABS.find((t) => t.id === statusFilter)?.label} orders
 </h2>
 <p className="label mt-0.5">Tap a row for the full receipt</p>
 </div>
 <div className="relative w-full sm:w-64">
 <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
 <input
 type="search"
 placeholder="Search orders…"
 aria-label="Search orders"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="h-10 w-full rounded-pill border border-rule-2 bg-paper pl-10 pr-4 text-sm text-ink transition-colors placeholder:text-muted/70 hover:border-muted focus:border-ink focus:outline-none"
 />
 </div>
 </div>

 {isLoading ? (
 <div className="space-y-2 px-5 pb-5 sm:px-6">
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 </div>
 ) : filteredOrders.length === 0 && !search ? (
 <EmptyState
 icon={<Receipt className="size-6" />}
 title={statusFilter === 'all' ? 'No orders yet' : `No ${statusFilter.replace('_', ' ')} orders`}
 description={
 statusFilter === 'all'
 ? 'Orders from WhatsApp voice notes, guided chat or this dashboard land here.'
 : 'Nothing has this status right now.'
 }
 actionLabel={statusFilter === 'all' ? 'New order' : undefined}
 actionIcon={statusFilter === 'all' ? <Plus className="size-4" /> : undefined}
 onAction={statusFilter === 'all' ? () => setNewOrderOpen(true) : undefined}
 />
 ) : (
 <div className="pb-2">
 <Table table={table} onRowClick={(order) => setSelectedOrder(order)} emptyText="No orders match that search" />
 </div>
 )}
 </Card>

 <NewOrderModal isOpen={newOrderOpen} onClose={() => setNewOrderOpen(false)} />

 <Modal
 isOpen={!!selectedOrder}
 onClose={() => setSelectedOrder(null)}
 title="Order details"
 maxWidth="max-w-lg"
 >
 {selectedOrder && (
 <div className="space-y-5">
 <div className="flex items-end justify-between gap-4 rounded-card bg-paper-2 p-4">
 <div>
 <p className="label">Total</p>
 <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink font-tabular">{formatPKR(selectedOrder.total)}</p>
 </div>
 <Badge variant={selectedOrder.status} dot>{selectedOrder.status}</Badge>
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
 <p className="label mb-2">Items</p>
 <ul className="divide-y divide-dashed divide-rule-2 border-y border-rule font-mono">
 {(selectedOrder.items || []).map((item, idx) => (
 <li key={idx} className="flex items-center justify-between gap-4 py-3">
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
 <Button variant="outline" onClick={() => setSelectedOrder(null)} leftIcon={<X className="w-4 h-4" />}>
 Close
 </Button>
 </div>
 </div>
 )}
 </Modal>
 </div>
 );
}
