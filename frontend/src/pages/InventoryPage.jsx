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
 <label className="text-xs font-medium text-ink">Expiry Reminders (YYYY-MM)</label>
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
 <button type="button" onClick={() => handleRemoveExpiry(date)} className="hover:text-ruby">×</button>
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
 <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-heading font-semibold text-sm shrink-0 shadow-xs">
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
 <span className="font-tabular font-medium text-emerald-600 dark:text-emerald-400">
 {formatPKR(getValue())}
 </span>
 ),
 },
 {
 accessorKey: 'unit',
 header: 'Unit',
 cell: ({ getValue }) => (
 <span className="text-xs px-2 py-0.5 rounded-md bg-canvas-soft border border-hairline text-ink-secondary">
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
 className="text-ruby hover:text-ruby hover:bg-ruby/10"
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
 <h2 className="text-xl font-light text-ink tracking-tight">Inventory</h2>
 <p className="text-xs text-ink-mute">Manage stock, pricing, and units</p>
 </div>
 </div>
 <Card padding="lg" className="text-center py-12">
 <AlertCircle className="w-10 h-10 text-ruby mx-auto mb-3" />
 <h3 className="text-base font-medium text-ink">Failed to load inventory</h3>
 <p className="text-xs text-ink-mute mt-1">{error.message}</p>
 </Card>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h2 className="font-heading text-2xl font-light tracking-[-0.5px] text-ink">Inventory</h2>
 <p className="font-body text-sm text-ink-mute">Manage stock, pricing, and catalog</p>
 </div>
 <div className="flex items-center gap-2">
 <ReportDropdown />
 <Button
 leftIcon={<Plus className="w-4 h-4" />}
 onClick={handleAdd}
 className="shadow-sm shadow-primary/25 text-xs py-1"
 >
 Add item
 </Button>
 </div>
 </div>

 {/* KPI Cards for Inventory - Solid Colors, Glassmorphism & High Contrast */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 flex items-center justify-between shadow-card hover:shadow-md transition-all duration-200">
 <div>
 <p className="text-xs uppercase tracking-wider font-medium text-emerald-700 dark:text-emerald-300">Total Items</p>
 <p className="text-2xl font-light text-emerald-950 dark:text-emerald-50 font-tabular mt-1">{counts.all}</p>
 </div>
 <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center ">
 <Package className="w-5 h-5" />
 </div>
 </div>
 <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 flex items-center justify-between shadow-card hover:shadow-md transition-all duration-200">
 <div>
 <p className="text-xs uppercase tracking-wider font-medium text-emerald-700 dark:text-emerald-300">Healthy Stock</p>
 <p className="text-2xl font-light font-tabular mt-1 text-emerald-950 dark:text-emerald-50">{counts.healthy}</p>
 </div>
 <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center ">
 <Package className="w-5 h-5" />
 </div>
 </div>
 <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 flex items-center justify-between shadow-card hover:shadow-md transition-all duration-200">
 <div>
 <p className="text-xs uppercase tracking-wider font-medium text-amber-800 dark:text-amber-300">Low Stock (&lt;10)</p>
 <p className="text-2xl font-light font-tabular mt-1 text-amber-950 dark:text-amber-50">{counts.low}</p>
 </div>
 <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700 flex items-center justify-center ">
 <AlertCircle className="w-5 h-5" />
 </div>
 </div>
 <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 flex items-center justify-between shadow-card hover:shadow-md transition-all duration-200">
 <div>
 <p className="text-xs uppercase tracking-wider font-medium text-red-800 dark:text-red-300">Out of Stock</p>
 <p className="text-2xl font-light font-tabular mt-1 text-red-950 dark:text-red-50">{counts.out}</p>
 </div>
 <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700 flex items-center justify-center ">
 <AlertCircle className="w-5 h-5" />
 </div>
 </div>
 </div>

 {/* Stock Health Distribution Bar */}
 {counts.all > 0 && (
 <div className="p-3.5 bg-canvas dark:bg-canvas border border-hairline dark:border-hairline rounded-xl shadow-card">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-ink-mute gap-2 mb-2">
 <span className="font-medium text-ink">Catalog Stock Health</span>
 <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px]">
 <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
 <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
 Healthy ({counts.healthy})
 </span>
 <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
 <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
 Low Stock ({counts.low})
 </span>
 <span className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-400">
 <span className="w-2.5 h-2.5 rounded-xs bg-red-500" />
 Out of Stock ({counts.out})
 </span>
 </div>
 </div>
 <div className="w-full h-2 rounded-xs bg-canvas-soft overflow-hidden flex gap-0.5">
 <div style={{ width: `${(counts.healthy / counts.all) * 100}%` }} className="bg-emerald-500 transition-all duration-300" title={`Healthy: ${counts.healthy}`} />
 <div style={{ width: `${(counts.low / counts.all) * 100}%` }} className="bg-amber-500 transition-all duration-300" title={`Low: ${counts.low}`} />
 <div style={{ width: `${(counts.out / counts.all) * 100}%` }} className="bg-red-500 transition-all duration-300" title={`Out: ${counts.out}`} />
 </div>
 </div>
 )}

 {/* Filter Tabs & Search */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 <div className="flex items-center gap-1.5 p-1 bg-canvas-soft dark:bg-canvas-soft border border-hairline rounded-lg overflow-x-auto">
 <button
 type="button"
 onClick={() => setStockFilter('all')}
 className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
 stockFilter === 'all'
 ? 'bg-emerald-600 text-white shadow-xs'
 : 'text-ink-secondary hover:text-ink hover:bg-canvas'
 }`}
 >
 All Items ({counts.all})
 </button>
 <button
 type="button"
 onClick={() => setStockFilter('healthy')}
 className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
 stockFilter === 'healthy'
 ? 'bg-emerald-600 text-white shadow-xs'
 : 'text-ink-secondary hover:text-emerald-600 hover:bg-canvas'
 }`}
 >
 Healthy ({counts.healthy})
 </button>
 <button
 type="button"
 onClick={() => setStockFilter('low')}
 className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
 stockFilter === 'low'
 ? 'bg-amber-600 text-white shadow-xs'
 : 'text-ink-secondary hover:text-amber-600 hover:bg-canvas'
 }`}
 >
 Low Stock ({counts.low})
 </button>
 <button
 type="button"
 onClick={() => setStockFilter('out')}
 className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
 stockFilter === 'out'
 ? 'bg-red-600 text-white shadow-xs'
 : 'text-ink-secondary hover:text-red-600 hover:bg-canvas'
 }`}
 >
 Out of Stock ({counts.out})
 </button>
 </div>

 <div className="relative w-full sm:w-auto sm:min-w-[220px]">
 <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
 <input
 type="text"
 placeholder="Search items..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-canvas dark:bg-canvas border border-hairline rounded-lg pl-9 pr-3 text-xs text-ink placeholder:text-ink-mute/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-9 transition-colors"
 />
 </div>
 </div>

 {isLoading ? (
 <div className="space-y-2">
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 </div>
 ) : items?.length === 0 && !search ? (
 <Card padding="lg">
 <EmptyState
 icon={<Package className="w-6 h-6" />}
 title="No inventory items yet"
 description="Start tracking your inventory by adding your first product."
 actionLabel="Add item"
 actionIcon={<Plus className="w-4 h-4" />}
 onAction={handleAdd}
 />
 </Card>
 ) : (
 <Table
 table={table}
 emptyText="No inventory items found"
 getRowClassName={(row) => (row.original.quantity < 10 ? 'border-l-2 border-ruby' : '')}
 />
 )}

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
 description={`Are you sure you want to delete "${deletingItem?.name}"? This cannot be undone.`}
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
