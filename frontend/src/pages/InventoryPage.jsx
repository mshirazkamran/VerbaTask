import { useMemo, useState, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  IconPlus,
  IconSearch,
  IconPencil,
  IconTrash,
  IconAlertCircle,
  IconBoxSeam,
} from '@tabler/icons-react';
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
import { formatPKR, formatQuantity } from '../lib/format';

const emptyItem = { name: '', quantity: '', price: '', unit: '' };

function InventoryForm({ initial = emptyItem, onSubmit, onCancel, submitLabel, loading }) {
  const [form, setForm] = useState(initial);

  const nameRef = useRef(null);
  const quantityRef = useRef(null);
  const priceRef = useRef(null);
  const unitRef = useRef(null);

  const fieldOrder = ['name', 'quantity', 'price', 'unit'];
  const fieldRefs = { name: nameRef, quantity: quantityRef, price: priceRef, unit: unitRef };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'name' || name === 'unit' ? value : value === '' ? '' : Number(value),
    }));
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
          placeholder="kg"
          {...fieldKeyDown('unit')}
        />
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
    () => [
      {
        accessorKey: 'name',
        header: 'Item',
        cell: ({ getValue, row }) => {
          const name = getValue();
          const firstLetter = (name || '?').charAt(0).toUpperCase();
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-heading font-semibold text-sm shrink-0 shadow-xs">
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
          const variant = qty === 0 ? 'danger' : qty < 10 ? 'warning' : 'success';
          return <Badge variant={variant} dot>{formatQuantity(qty, row.original.unit)}</Badge>;
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
              leftIcon={<IconPencil className="w-4 h-4" />}
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
              leftIcon={<IconTrash className="w-4 h-4" />}
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
    ],
    []
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
          <IconAlertCircle className="w-10 h-10 text-ruby mx-auto mb-3" />
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
        <Button
          leftIcon={<IconPlus className="w-4 h-4" />}
          onClick={handleAdd}
          className="shadow-sm shadow-primary/25"
        >
          Add item
        </Button>
      </div>

      {/* KPI Cards for Inventory */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-canvas flex items-center justify-between shadow-card">
          <div>
            <p className="text-xs text-ink-mute uppercase tracking-wider font-medium">Total Items</p>
            <p className="text-2xl font-light text-ink font-tabular mt-1">{counts.all}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <IconBoxSeam className="w-5 h-5" />
          </div>
        </div>
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-canvas flex items-center justify-between shadow-card">
          <div>
            <p className="text-xs text-ink-mute uppercase tracking-wider font-medium">Healthy Stock</p>
            <p className="text-2xl font-light text-ink font-tabular mt-1 text-emerald-600 dark:text-emerald-400">{counts.healthy}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <IconBoxSeam className="w-5 h-5" />
          </div>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-canvas flex items-center justify-between shadow-card">
          <div>
            <p className="text-xs text-ink-mute uppercase tracking-wider font-medium">Low Stock (&lt;10)</p>
            <p className="text-2xl font-light text-ink font-tabular mt-1 text-amber-600 dark:text-amber-400">{counts.low}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <IconAlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-ruby/5 to-canvas flex items-center justify-between shadow-card">
          <div>
            <p className="text-xs text-ink-mute uppercase tracking-wider font-medium">Out of Stock</p>
            <p className="text-2xl font-light text-ink font-tabular mt-1 text-rose-600 dark:text-rose-400">{counts.out}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <IconAlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-canvas-soft border border-hairline rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              stockFilter === 'all'
                ? 'bg-canvas text-ink shadow-xs'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            All Items ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('healthy')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              stockFilter === 'healthy'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                : 'text-ink-secondary hover:text-emerald-600'
            }`}
          >
            Healthy ({counts.healthy})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              stockFilter === 'low'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold shadow-xs'
                : 'text-ink-secondary hover:text-amber-600'
            }`}
          >
            Low Stock ({counts.low})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              stockFilter === 'out'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold shadow-xs'
                : 'text-ink-secondary hover:text-rose-600'
            }`}
          >
            Out of Stock ({counts.out})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <IconSearch className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-canvas border border-hairline rounded-lg pl-9 pr-3 text-xs text-ink placeholder:text-ink-mute/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-9 transition-colors"
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
            icon={<IconBoxSeam className="w-6 h-6" />}
            title="No inventory items yet"
            description="Start tracking your store stock by adding your first product."
            actionLabel="Add item"
            actionIcon={<IconPlus className="w-4 h-4" />}
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
