import { useMemo, useState, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
 useInventory,
 useCreateInventoryItem,
 useUpdateInventoryItem,
 useDeleteInventoryItem,
} from '../hooks/useInventory';
import { useAuthStore } from '../lib/store';
import { formatPKR, formatQuantity } from '../lib/format';
import { ReportDropdown } from '../components/ReportDropdown';

const emptyItem = { name: '', quantity: '', price: '', unit: '', expiryDates: [] };

function InventoryForm({ initial = emptyItem, onSubmit, onCancel, submitLabel, loading }) {
 const [form, setForm] = useState(initial);

 const nameRef = useRef(null);
 const quantityRef = useRef(null);
 const priceRef = useRef(null);
 const unitRef = useRef(null);

 const fieldOrder = ['name', 'quantity', 'price', 'unit'];
 const fieldRefs = { name: nameRef, quantity: quantityRef, price: priceRef, unit: unitRef };

 const [newExpiry, setNewExpiry] = useState('');

 const handleChange = (e) => {
 const { name, value } = e.target;
 setForm((prev) => ({
 ...prev,
 [name]: name === 'name' || name === 'unit' ? value : value === '' ? '' : Number(value),
 }));
 };

 const handleAddExpiry = () => {
 if (newExpiry && !form.expiryDates.includes(newExpiry)) {
 setForm(prev => ({ ...prev, expiryDates: [...prev.expiryDates, newExpiry] }));
 setNewExpiry('');
 }
 };

 const handleRemoveExpiry = (dateToRemove) => {
 setForm(prev => ({ ...prev, expiryDates: prev.expiryDates.filter(d => d !== dateToRemove) }));
 };

 const isFieldEmpty = useCallback((fieldName) => {
 const val = form[fieldName];
 return val === '' || val === null || val === undefined;
 }, [form]);

 const handleKeyDown = (e) => {
 if (e.key !== 'Enter') return;
 e.preventDefault();

 const currentField = e.target.name;
 const currentIndex = fieldOrder.indexOf(currentField);

 // Find the next empty field after the current one
 for (let i = currentIndex + 1; i < fieldOrder.length; i++) {
 if (isFieldEmpty(fieldOrder[i])) {
 fieldRefs[fieldOrder[i]].current?.focus();
 return;
 }
 }

 // Also check fields before the current one (wrap around)
 for (let i = 0; i < currentIndex; i++) {
 if (isFieldEmpty(fieldOrder[i])) {
 fieldRefs[fieldOrder[i]].current?.focus();
 return;
 }
 }

 // All fields filled — submit
 if (!form.name.trim()) return;
 onSubmit({
 name: form.name.trim(),
 quantity: Number(form.quantity) || 0,
 price: Number(form.price) || 0,
 unit: form.unit.trim() || undefined,
 expiryDates: form.expiryDates || []
 });
 };

 const handleSubmit = (e) => {
 e.preventDefault();
 if (!form.name.trim()) return;
 onSubmit({
 name: form.name.trim(),
 quantity: Number(form.quantity) || 0,
 price: Number(form.price) || 0,
 unit: form.unit.trim() || undefined,
 expiryDates: form.expiryDates || []
 });
 };

 const fieldKeyDown = (fieldName) => ({
 name: fieldName,
 ref: fieldRefs[fieldName],
 onKeyDown: handleKeyDown,
 });

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <Input
 label="Item name"
 value={form.name}
 onChange={handleChange}
 placeholder="e.g. Daal channa"
 required
 {...fieldKeyDown('name')}
 />
 <div className="grid grid-cols-3 gap-3">
 <Input
 label="Quantity"
 type="number"
 min="0"
 value={form.quantity}
 onChange={handleChange}
 placeholder="0"
 required
 {...fieldKeyDown('quantity')}
 />
 <Input
 label="Price (Rs.)"
 type="number"
 min="0"
 step="0.01"
 value={form.price}
 onChange={handleChange}
 placeholder="0"
 {...fieldKeyDown('price')}
 />
 <Input
 label="Unit"
 value={form.unit}
 onChange={handleChange}
 placeholder="e.g. kg, 250g, litre"
 {...fieldKeyDown('unit')}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs font-semibold text-ink-2">Expiry reminders (month)</label>
 <div className="flex gap-2">
 <Input 
 type="month"
 value={newExpiry}
 onChange={(e) => setNewExpiry(e.target.value)}
 className="flex-1"
 />
 <Button type="button" variant="secondary" onClick={handleAddExpiry}>Add</Button>
 </div>
 {form.expiryDates?.length > 0 && (
 <div className="flex flex-wrap gap-2 mt-2">
 {form.expiryDates.map(date => (
 <Badge key={date} variant="warning" className="flex items-center gap-1">
 {date}
 <button type="button" onClick={() => handleRemoveExpiry(date)} className="hover:text-danger-ink" aria-label={`Remove ${date}`}>×</button>
 </Badge>
 ))}
 </div>
 )}
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
 Cancel
 </Button>
 <Button type="submit" loading={loading}>
 {submitLabel}
 </Button>
 </div>
 </form>
 );
}

export function InventoryPage() {
 const merchant = useAuthStore(state => state.merchant);
 const showExpiry = ['medical', 'kiryana', 'general'].includes(merchant?.businessType);

 const { data: items, isLoading, error } = useInventory();
 const createItem = useCreateInventoryItem();
 const updateItem = useUpdateInventoryItem();
 const deleteItem = useDeleteInventoryItem();

 const [search, setSearch] = useState('');
 const [stockFilter, setStockFilter] = useState('all');
 const [modalOpen, setModalOpen] = useState(false);
 const [editingItem, setEditingItem] = useState(null);
 const [deletingItem, setDeletingItem] = useState(null);

 const counts = useMemo(() => {
 const list = items || [];
 return {
 all: list.length,
 healthy: list.filter((i) => i.quantity >= 10).length,
 low: list.filter((i) => i.quantity > 0 && i.quantity < 10).length,
 out: list.filter((i) => i.quantity === 0).length,
 };
 }, [items]);

 const filteredItems = useMemo(() => {
 if (!items) return [];
 if (stockFilter === 'healthy') return items.filter((i) => i.quantity >= 10);
 if (stockFilter === 'low') return items.filter((i) => i.quantity > 0 && i.quantity < 10);
 if (stockFilter === 'out') return items.filter((i) => i.quantity === 0);
 return items;
 }, [items, stockFilter]);

 const handleAdd = () => {
 setEditingItem(null);
 setModalOpen(true);
 };

 const handleEdit = (item) => {
 setEditingItem(item);
 setModalOpen(true);
 };

 const handleCloseModal = () => {
 setModalOpen(false);
 setEditingItem(null);
 };

 const handleSave = async (payload) => {
 try {
 if (editingItem) {
 await updateItem.mutateAsync({ id: editingItem._id, ...payload });
 toast.success('Item updated');
 } else {
 await createItem.mutateAsync(payload);
 toast.success('Item added');
 }
 handleCloseModal();
 } catch (err) {
 toast.error(err.message || 'Something went wrong');
 }
 };

 const handleDelete = async () => {
 if (!deletingItem) return;
 try {
 await deleteItem.mutateAsync(deletingItem._id);
 toast.success('Item deleted');
 setDeletingItem(null);
 } catch (err) {
 toast.error(err.message || 'Failed to delete item');
 }
 };

 const columns = useMemo(
 () => {
 const baseCols = [
 {
 accessorKey: 'name',
 header: 'Item',
 cell: ({ getValue, row }) => {
 const name = getValue();
 const firstLetter = (name || '?').charAt(0).toUpperCase();
 return (
 <div className="flex items-center gap-3 min-w-0">
 <div className="grid size-9 shrink-0 place-items-center rounded-pill bg-paper-3 font-display text-sm font-semibold text-ink">
 {firstLetter}
 </div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-ink truncate">{name}</p>
 <p className="text-[11px] text-ink-mute font-tabular">
 {formatPKR(row.original.price)} / {row.original.unit || 'unit'}
 </p>
 </div>
 </div>
 );
 },
 },
 {
 accessorKey: 'quantity',
 header: 'Stock',
 cell: ({ getValue, row }) => {
 const qty = getValue();
 const unit = (row.original.unit || '').trim();
 const variant = qty === 0 ? 'danger' : qty < 10 ? 'warning' : 'success';
 const isPackSize = /\d/.test(unit);

 return (
 <div className="flex flex-col items-start gap-0.5 py-0.5">
 <Badge variant={variant} dot className="font-tabular font-medium">
 {formatQuantity(qty, unit)}
 </Badge>
 {isPackSize && (
 <span className="text-[10px] text-ink-mute font-tabular">
 {qty === 0 ? 'Out of stock' : `${qty} in stock`}
 </span>
 )}
 </div>
 );
 },
 },
 {
 accessorKey: 'price',
 header: 'Price',
 cell: ({ getValue }) => (
 <span className="font-mono text-sm font-semibold text-ink">
 {formatPKR(getValue())}
 </span>
 ),
 },
 {
 accessorKey: 'unit',
 header: 'Unit',
 cell: ({ getValue }) => (
 <span className="font-mono text-xs text-muted">
 {getValue() || '-'}
 </span>
 ),
 },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => (
 <div className="flex items-center justify-end gap-2">
 <Button
 variant="ghost"
 size="sm"
 leftIcon={<Pencil className="w-4 h-4" />}
 onClick={(e) => {
 e.stopPropagation();
 handleEdit(row.original);
 }}
 >
 Edit
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="!text-danger-ink hover:!bg-coral-tint"
 leftIcon={<Trash2 className="w-4 h-4" />}
 onClick={(e) => {
 e.stopPropagation();
 setDeletingItem(row.original);
 }}
 >
 Delete
 </Button>
 </div>
 ),
 },
 ];

 if (showExpiry) {
 baseCols.splice(baseCols.length - 1, 0, {
 accessorKey: 'expiryDates',
 header: 'Reminders',
 cell: ({ getValue }) => {
 const dates = getValue() || [];
 if (dates.length === 0) return <span className="text-xs text-ink-mute">-</span>;
 return (
 <div className="flex flex-wrap gap-1">
 {dates.map(d => (
 <Badge key={d} variant="warning" className="text-[10px] py-0 px-1.5">{d}</Badge>
 ))}
 </div>
 );
 }
 });
 }

 return baseCols;
 },
 [showExpiry]
 );

 const table = useReactTable({
 data: filteredItems,
 columns,
 state: { globalFilter: search },
 onGlobalFilterChange: setSearch,
 getCoreRowModel: getCoreRowModel(),
 getSortedRowModel: getSortedRowModel(),
 getFilteredRowModel: getFilteredRowModel(),
 });

 if (error) {
 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="label">Catalog</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink">Inventory</h1>
 </div>
 </div>
 <Card padding="lg" className="text-center py-12">
 <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
 <h3 className="font-display text-lg font-semibold text-ink">Inventory didn’t load</h3>
 <p className="mt-1 text-sm text-muted">{error.message}. Refresh to try again.</p>
 </Card>
 </div>
 );
 }

 const filters = [
 { id: 'healthy', label: 'Healthy', hint: '10 or more', count: counts.healthy, tone: 'bg-success-tint text-success-ink', bar: 'bg-primary' },
 { id: 'low', label: 'Running low', hint: 'Under 10', count: counts.low, tone: 'bg-pear-tint text-warn-ink', bar: 'bg-pear-deep' },
 { id: 'out', label: 'Out of stock', hint: 'Zero left', count: counts.out, tone: 'bg-coral-tint text-danger-ink', bar: 'bg-coral' },
 ];

 return (
 <div className="space-y-5 sm:space-y-6">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
 <div>
 <p className="label">Catalog</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)]">Inventory</h1>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <ReportDropdown />
 <Button leftIcon={<Plus className="size-4" />} onClick={handleAdd}>
 Add item
 </Button>
 </div>
 </div>

 {/* Stock instrument — total + health bar on the left, the three counts double as filters */}
 <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
 <button
 type="button"
 onClick={() => setStockFilter('all')}
 aria-pressed={stockFilter === 'all'}
 className={`surface-card flex flex-col justify-between gap-6 p-5 text-left transition-colors sm:p-6 lg:col-span-5 ${stockFilter === 'all' ? '!border-ink' : ''}`}
 >
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className="label">Items on the shelf</p>
 <p className="mt-2 font-display text-5xl font-semibold leading-none tracking-[-0.04em] text-ink font-tabular">
 {isLoading ? '—' : counts.all}
 </p>
 </div>
 <span className="label">{stockFilter === 'all' ? 'Showing all' : 'Show all'}</span>
 </div>
 {counts.all > 0 ? (
 <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-pill bg-paper-3" role="img" aria-label={`${counts.healthy} healthy, ${counts.low} low, ${counts.out} out of stock`}>
 {filters.map((f) => (
 <span key={f.id} className={f.bar} style={{ width: `${(f.count / counts.all) * 100}%` }} />
 ))}
 </div>
 ) : (
 <div className="h-2.5 w-full rounded-pill bg-paper-3" />
 )}
 </button>

 <div className="grid grid-cols-3 gap-3 lg:col-span-7">
 {filters.map((f) => {
 const on = stockFilter === f.id;
 return (
 <button
 key={f.id}
 type="button"
 onClick={() => setStockFilter(on ? 'all' : f.id)}
 aria-pressed={on}
 className={`flex min-w-0 flex-col justify-between gap-4 rounded-card p-4 text-left ring-ink transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:p-5 ${f.tone} ${on ? 'ring-2' : ''}`}
 >
 <span className="min-w-0">
 <span className="block truncate font-display text-sm font-semibold tracking-tight sm:text-base">{f.label}</span>
 <span className="block truncate text-[11px] opacity-75 sm:text-xs">{f.hint}</span>
 </span>
 <span className="font-display text-3xl font-semibold leading-none tracking-tight font-tabular sm:text-4xl">
 {isLoading ? '—' : f.count}
 </span>
 </button>
 );
 })}
 </div>
 </div>

 <Card padding="none" className="overflow-hidden">
 <div className="flex flex-col gap-3 px-5 pb-2 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
 <div>
 <h2 className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg">
 {stockFilter === 'all' ? 'Every item' : filters.find((f) => f.id === stockFilter)?.label}
 </h2>
 <p className="label mt-0.5">{filteredItems.length} shown</p>
 </div>
 <div className="relative w-full sm:w-64">
 <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
 <input
 type="search"
 placeholder="Search items…"
 aria-label="Search items"
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
 ) : items?.length === 0 && !search ? (
 <EmptyState
 icon={<Package className="size-6" />}
 title="No items yet"
 description="Add your first product, or send a voice note on WhatsApp and it will appear here."
 actionLabel="Add item"
 actionIcon={<Plus className="size-4" />}
 onAction={handleAdd}
 />
 ) : (
 <div className="pb-2">
 <Table
 table={table}
 emptyText="No items match that search"
 getRowClassName={(row) =>
 row.original.quantity === 0 ? 'bg-coral-tint/45' : row.original.quantity < 10 ? 'bg-pear-tint/45' : ''
 }
 />
 </div>
 )}
 </Card>

 <Modal
 isOpen={modalOpen}
 onClose={handleCloseModal}
 title={editingItem ? 'Edit item' : 'Add item'}
 description={editingItem ? 'Update stock, price, or unit.' : 'Add a new product to your inventory.'}
 >
 <InventoryForm
 key={editingItem ? editingItem._id : 'new'}
 initial={
 editingItem
 ? {
 name: editingItem.name,
 quantity: editingItem.quantity,
 price: editingItem.price ?? 0,
 unit: editingItem.unit ?? '',
 expiryDates: editingItem.expiryDates ?? [],
 }
 : emptyItem
 }
 onSubmit={handleSave}
 onCancel={handleCloseModal}
 submitLabel={editingItem ? 'Save changes' : 'Add item'}
 loading={createItem.isPending || updateItem.isPending}
 />
 </Modal>

 <Modal
 isOpen={!!deletingItem}
 onClose={() => setDeletingItem(null)}
 title="Delete item"
 description={`“${deletingItem?.name}” and its stock count will be removed. This can’t be undone.`}
 maxWidth="max-w-sm"
 >
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="ghost" onClick={() => setDeletingItem(null)} disabled={deleteItem.isPending}>
 Cancel
 </Button>
 <Button variant="danger" loading={deleteItem.isPending} onClick={handleDelete}>
 Delete
 </Button>
 </div>
 </Modal>
 </div>
 );
}
