import { useMemo, useState } from 'react';
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
} from '@tabler/icons-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'name' || name === 'unit' ? value : value === '' ? '' : Number(value),
    }));
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Item name"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="e.g. Daal channa"
        required
      />
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Quantity"
          name="quantity"
          type="number"
          min="0"
          value={form.quantity}
          onChange={handleChange}
          placeholder="0"
          required
        />
        <Input
          label="Price (Rs.)"
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          placeholder="0"
        />
        <Input
          label="Unit"
          name="unit"
          value={form.unit}
          onChange={handleChange}
          placeholder="kg"
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

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
        cell: ({ getValue, row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">{getValue()}</p>
            <p className="text-[11px] text-ink-mute truncate">
              {formatPKR(row.original.price)} / {row.original.unit || 'unit'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Stock',
        cell: ({ getValue, row }) => {
          const qty = getValue();
          const variant = qty === 0 ? 'danger' : qty < 10 ? 'warning' : 'success';
          return <Badge variant={variant}>{formatQuantity(qty, row.original.unit)}</Badge>;
        },
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ getValue }) => formatPKR(getValue()),
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ getValue }) => getValue() || '-',
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
    data: items || [],
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
          <h2 className="text-xl font-light text-ink tracking-tight">Inventory</h2>
          <p className="text-xs text-ink-mute">Manage stock, pricing, and units</p>
        </div>
        <Button leftIcon={<IconPlus className="w-4 h-4" />} onClick={handleAdd}>
          Add item
        </Button>
      </div>

      <Card padding="sm" className="flex items-center gap-3">
        <IconSearch className="w-4 h-4 text-ink-mute ml-2" />
        <Input
          placeholder="Search items..."
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
        <Table table={table} emptyText="No inventory items found" />
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
                  price: editingItem.price,
                  unit: editingItem.unit,
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
