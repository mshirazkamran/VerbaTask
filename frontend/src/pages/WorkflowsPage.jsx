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
 <span className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
 <Zap className="w-3.5 h-3.5" />
 </span>
 <span className="capitalize text-ink font-medium text-xs">{getValue()}</span>
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
 <span className="px-2 py-0.5 rounded-md bg-canvas-soft border border-hairline text-xs font-medium text-ink-secondary">
 {text}
 </span>
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
 <span className="w-7 h-7 rounded-md bg-fuchsia-50 dark:bg-fuchsia-950 border border-fuchsia-200 dark:border-fuchsia-800 text-fuchsia-800 dark:text-fuchsia-300 flex items-center justify-center shrink-0">
 <Bell className="w-3.5 h-3.5" />
 </span>
 <span className="text-xs font-medium text-ink truncate" title={label}>
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
 <span className="text-xs text-ink-secondary whitespace-nowrap">
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
 className={row.original.active ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'}
 onClick={() => handleToggle(row.original)}
 disabled={updateWorkflow.isPending}
 >
 {row.original.active ? 'Pause' : 'Activate'}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="text-ruby hover:text-ruby hover:bg-ruby/10 border border-ruby/20"
 leftIcon={<Trash2 className="w-4 h-4" />}
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
 <AlertCircle className="w-10 h-10 text-ruby mx-auto mb-3" />
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
 <h2 className="font-heading text-2xl font-light tracking-[-0.5px] text-ink">Workflows</h2>
 <p className="font-body text-sm text-ink-mute">Automate threshold warnings and WhatsApp alerts</p>
 </div>
 <Button
 leftIcon={<Plus className="w-4 h-4" />}
 onClick={() => setModalOpen(true)}
 className="shadow-sm shadow-primary/25 w-full sm:w-auto"
 >
 New workflow
 </Button>
 </div>

 {/* Automation Hub Banner - Solid Accent & Glassmorphism */}
 <div className="p-4 rounded-xl border-l-4 border-l-emerald-500 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card hover:shadow-md transition-all duration-200">
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center shrink-0 shadow-xs ">
 <Zap className="w-5 h-5" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-medium text-ink">Autonomous Inventory Watcher</h3>
 <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-medium ">
 Live
 </span>
 </div>
 <p className="text-xs text-ink-mute mt-0.5">
 Whenever a sale deducts stock below your configured threshold, VerbaTask automatically dispatches an instant WhatsApp notification.
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 text-xs text-ink-secondary bg-canvas dark:bg-canvas px-3 py-1.5 rounded-md border border-hairline shrink-0 font-tabular">
 <span className="font-semibold text-emerald-800 dark:text-emerald-300">
 {workflows?.filter((w) => w.active)?.length || 0}
 </span>
 <span>active triggers</span>
 </div>
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
 icon={<Zap className="w-6 h-6" />}
 title="No workflows configured"
 description="Create an automation rule to receive WhatsApp notifications whenever stock falls below threshold."
 actionLabel="New workflow"
 actionIcon={<Plus className="w-4 h-4" />}
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
