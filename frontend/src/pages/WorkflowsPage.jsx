import { useMemo, useState, useCallback } from 'react';
import {
 useReactTable,
 getCoreRowModel,
 getSortedRowModel,
} from '@tanstack/react-table';
import {
  Plus,
  Trash2,
  AlertCircle,
  Bell,
  Zap,
  Info,
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
 useWorkflows,
 useCreateWorkflow,
 useUpdateWorkflow,
 useDeleteWorkflow,
} from '../hooks/useWorkflows';
import { formatDate } from '../lib/format';

const emptyWorkflow = {
 trigger: 'threshold',
 quantityThreshold: '',
 keyword: '',
 intervalMinutes: 1440,
 actionMessage: '',
 actionType: 'notify',
 };

function WorkflowForm({ initial = emptyWorkflow, onSubmit, onCancel, submitLabel, loading }) {
 const [form, setForm] = useState(initial);

 const handleChange = (e) => {
 const { name, value } = e.target;
 setForm((prev) => ({
 ...prev,
 [name]: ['quantityThreshold', 'intervalMinutes'].includes(name) ? (value === '' ? '' : Number(value)) : value,
 }));
 };

 const handleSubmit = (e) => {
 e.preventDefault();
 
 let condition = {};
 if (form.trigger === 'threshold') {
 condition = { quantityThreshold: Number(form.quantityThreshold) || 0 };
 } else if (form.trigger === 'message') {
 condition = { keyword: form.keyword };
 } else if (form.trigger === 'schedule') {
 condition = { intervalMinutes: Number(form.intervalMinutes) || 1440 };
 }

 onSubmit({
 trigger: form.trigger,
 condition,
 action: { type: form.actionType, message: form.actionMessage || undefined },
 active: true,
 });
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-medium text-ink-secondary">Trigger</label>
 <select
 name="trigger"
 value={form.trigger}
 onChange={handleChange}
 className="h-10 px-3 text-[15px] bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
 >
 <option value="threshold">Stock threshold</option>
 <option value="message">Incoming message (Keyword)</option>
 <option value="schedule">Recurring schedule</option>
 </select>
 </div>

 {form.trigger === 'threshold' && (
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
 )}

 {form.trigger === 'message' && (
 <Input
 label="Trigger keyword"
 name="keyword"
 type="text"
 value={form.keyword}
 onChange={handleChange}
 placeholder="e.g. status"
 required
 />
 )}

 {form.trigger === 'schedule' && (
 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-medium text-ink-secondary">Frequency</label>
 <select
 name="intervalMinutes"
 value={form.intervalMinutes}
 onChange={handleChange}
 className="h-10 px-3 text-[15px] bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
 >
 <option value="60">Hourly</option>
 <option value="1440">Daily (24h)</option>
 <option value="10080">Weekly</option>
 </select>
 </div>
 )}
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

 <div className="flex flex-col gap-1.5 mt-2">
 <Input
 label="Custom notification message (optional)"
 name="actionMessage"
 type="text"
 value={form.actionMessage}
 onChange={handleChange}
 placeholder="e.g. Workflow triggered!"
 />
 </div>

 <div className="p-3 mt-4 bg-canvas-soft border border-hairline rounded-sm flex items-start gap-2 text-xs text-ink-mute">
 <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
 <span>
 {form.trigger === 'threshold'
 ? 'WhatsApp alert messages are automatically composed with the item name and remaining stock.'
 : 'Provide a custom message to be sent when the trigger occurs.'}
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
 <Zap className="size-4 shrink-0 text-warn-ink" />
 <span className="text-sm font-medium capitalize text-ink">{getValue()}</span>
 </div>
 ),
 },
 {
 accessorKey: 'condition',
 header: 'Condition',
 cell: ({ getValue }) => {
 const condition = getValue() || {};
 let text = '-';
 if (condition.quantityThreshold != null) {
 text = `Stock below ${condition.quantityThreshold}`;
 } else if (condition.keyword) {
 text = `Message has "${condition.keyword}"`;
 } else if (condition.intervalMinutes) {
 text = `Every ${condition.intervalMinutes >= 1440 ? `${condition.intervalMinutes / 1440} day(s)` : `${condition.intervalMinutes / 60} hour(s)`}`;
 }
 return (
 <span className="font-mono text-xs text-ink-2">{text}</span>
 );
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
 <Bell className="size-4 shrink-0 text-sky-ink" />
 <span className="truncate text-sm font-medium text-ink" title={label}>
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
 <Badge variant={getValue() ? 'success' : 'neutral'} dot>
 {getValue() ? 'Active' : 'Paused'}
 </Badge>
 ),
 },
 {
 accessorKey: 'createdAt',
 header: 'Created',
 cell: ({ getValue }) => (
 <span className="whitespace-nowrap font-mono text-xs text-muted">
 {formatDate(getValue())}
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
 className={row.original.active ? '' : '!text-success-ink'}
 onClick={() => handleToggle(row.original)}
 disabled={updateWorkflow.isPending}
 >
 {row.original.active ? 'Pause' : 'Activate'}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="!text-danger-ink hover:!bg-coral-tint"
 leftIcon={<Trash2 className="size-4" />}
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
 <p className="label">Automations</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink">Workflows</h1>
 </div>
 </div>
 <Card padding="lg" className="text-center py-12">
 <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
 <h3 className="text-base font-medium text-ink">Failed to load workflows</h3>
 <p className="text-xs text-ink-mute mt-1">{error.message}</p>
 </Card>
 </div>
 );
 }

 const activeCount = workflows?.filter((w) => w.active)?.length || 0;

 return (
 <div className="space-y-5 sm:space-y-6">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
 <div>
 <p className="label">Automations</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)]">Workflows</h1>
 </div>
 <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalOpen(true)}>
 New workflow
 </Button>
 </div>

 {/* 8/4 — rules on the left, the explainer rides the right (mirrors Approvals) */}
 <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
 <Card padding="none" className="min-w-0 overflow-hidden lg:col-span-8">
 <div className="px-5 pb-2 pt-5 sm:px-6">
 <h2 className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg">Rules</h2>
 <p className="label mt-0.5">{workflows?.length || 0} total</p>
 </div>
 {isLoading ? (
 <div className="space-y-2 px-5 pb-5 sm:px-6">
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 </div>
 ) : workflows?.length === 0 ? (
 <EmptyState
 icon={<Zap className="size-6" />}
 title="No workflows yet"
 description="Set a stock level and get a WhatsApp message the moment an item drops below it."
 actionLabel="New workflow"
 actionIcon={<Plus className="size-4" />}
 onAction={() => setModalOpen(true)}
 />
 ) : (
 <div className="pb-2">
 <Table table={table} emptyText="No workflows yet" />
 </div>
 )}
 </Card>

 <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
 <div className="rounded-card bg-sky-tint p-5 sm:p-6">
 <div className="flex items-end justify-between gap-4">
 <div>
 <p className="label">Running now</p>
 <p className="mt-2 font-display text-6xl font-semibold leading-none tracking-[-0.04em] text-sky-ink font-tabular">
 {isLoading ? '—' : activeCount}
 </p>
 </div>
 <Bell className="mb-1 size-6 text-sky-ink" />
 </div>
 <p className="mt-6 border-t border-current/15 pt-4 text-sm leading-relaxed text-ink-2">
 When a sale takes an item below its level, VerbaTask messages you on WhatsApp straight away.
 Pause a rule any time without deleting it.
 </p>
 </div>
 </aside>
 </div>

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
 description="The rule stops immediately and can’t be restored. Pause it instead if you might want it back."
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
