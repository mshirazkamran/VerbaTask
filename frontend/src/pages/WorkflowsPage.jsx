import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  IconPlus,
  IconTrash,
  IconAlertCircle,
  IconBell,
  IconBolt,
  IconInfoCircle,
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
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
} from '../hooks/useWorkflows';
import { formatDate } from '../lib/format';

const emptyWorkflow = {
  trigger: 'threshold',
  quantityThreshold: '',
  actionType: 'notify',
};

function WorkflowForm({ initial = emptyWorkflow, onSubmit, onCancel, submitLabel, loading }) {
  const [form, setForm] = useState(initial);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'quantityThreshold' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      trigger: form.trigger,
      condition: { quantityThreshold: Number(form.quantityThreshold) || 0 },
      action: { type: form.actionType },
      active: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-secondary">Trigger</label>
          <select
            name="trigger"
            value={form.trigger}
            onChange={handleChange}
            className="h-10 px-3 text-[15px] bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="threshold">Stock threshold</option>
          </select>
        </div>
        <Input
          label="Threshold quantity"
          name="quantityThreshold"
          type="number"
          min="0"
          value={form.quantityThreshold}
          onChange={handleChange}
          placeholder="e.g. 5"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-ink-secondary">Action</label>
        <select
          name="actionType"
          value={form.actionType}
          onChange={handleChange}
          className="h-10 px-3 text-[15px] bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="notify">Send WhatsApp notification</option>
        </select>
      </div>

      <div className="p-3 bg-canvas-soft border border-hairline rounded-sm flex items-start gap-2 text-xs text-ink-mute">
        <IconInfoCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span>
          WhatsApp alert messages are automatically composed with the item name and remaining stock when triggered.
        </span>
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

export function WorkflowsPage() {
  const { data: workflows, isLoading, error } = useWorkflows();
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();

  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleCreate = async (payload) => {
    try {
      await createWorkflow.mutateAsync(payload);
      toast.success('Workflow created');
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to create workflow');
    }
  };

  const handleToggle = useCallback(
    async (workflow) => {
      try {
        await updateWorkflow.mutateAsync({ id: workflow._id, active: !workflow.active });
        toast.success(workflow.active ? 'Workflow paused' : 'Workflow activated');
      } catch (err) {
        toast.error(err.message || 'Failed to update workflow');
      }
    },
    [updateWorkflow]
  );

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteWorkflow.mutateAsync(deletingId);
      toast.success('Workflow deleted');
      setDeletingId(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete workflow');
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'trigger',
        header: 'Trigger',
        cell: ({ getValue }) => (
          <div className="flex items-center gap-2">
            <IconBolt className="w-4 h-4 text-amber-500" />
            <span className="capitalize text-ink">{getValue()}</span>
          </div>
        ),
      },
      {
        accessorKey: 'condition',
        header: 'Condition',
        cell: ({ getValue }) => {
          const condition = getValue() || {};
          const text =
            condition.quantityThreshold != null
              ? `Stock below ${condition.quantityThreshold}`
              : typeof condition === 'object'
              ? JSON.stringify(condition)
              : String(condition || '-');
          return <span className="text-sm text-ink-secondary">{text}</span>;
        },
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ getValue }) => {
          const action = getValue() || {};
          const label =
            action.type === 'notify'
              ? 'WhatsApp alert'
              : action.type === 'auto_reorder'
              ? 'Auto-reorder'
              : action.type || '-';
          return (
            <div className="flex items-center gap-2 max-w-[260px]">
              <IconBell className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-ink-secondary truncate" title={label}>
                {label}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant={getValue() ? 'success' : 'neutral'}>{getValue() ? 'Active' : 'Paused'}</Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(row.original)}
              disabled={updateWorkflow.isPending}
            >
              {row.original.active ? 'Pause' : 'Activate'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-ruby hover:text-ruby hover:bg-ruby/10"
              leftIcon={<IconTrash className="w-4 h-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(row.original._id);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [updateWorkflow.isPending, handleToggle]
  );

  const table = useReactTable({
    data: workflows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: 'createdAt', desc: true }] },
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-light text-ink tracking-tight">Workflows</h2>
            <p className="text-xs text-ink-mute">Automate low-stock alerts and actions</p>
          </div>
        </div>
        <Card padding="lg" className="text-center py-12">
          <IconAlertCircle className="w-10 h-10 text-ruby mx-auto mb-3" />
          <h3 className="text-base font-medium text-ink">Failed to load workflows</h3>
          <p className="text-xs text-ink-mute mt-1">{error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-light text-ink tracking-tight">Workflows</h2>
          <p className="text-xs text-ink-mute">Automate low-stock alerts and actions</p>
        </div>
        <Button leftIcon={<IconPlus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          New workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
        </div>
      ) : workflows?.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<IconBolt className="w-6 h-6" />}
            title="No workflows configured"
            description="Create an automation rule to receive WhatsApp notifications whenever stock falls below threshold."
            actionLabel="New workflow"
            actionIcon={<IconPlus className="w-4 h-4" />}
            onAction={() => setModalOpen(true)}
          />
        </Card>
      ) : (
        <Table table={table} emptyText="No workflows yet." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New workflow"
        description="Get alerted on WhatsApp when an item drops below a stock threshold."
      >
        <WorkflowForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          submitLabel="Create workflow"
          loading={createWorkflow.isPending}
        />
      </Modal>

      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete workflow"
        description="Are you sure? This workflow will stop running immediately."
        maxWidth="max-w-sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setDeletingId(null)} disabled={deleteWorkflow.isPending}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleteWorkflow.isPending} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
