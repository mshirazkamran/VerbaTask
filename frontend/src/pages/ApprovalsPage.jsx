import { useMemo, useState, useCallback } from 'react';
import {
 useReactTable,
 getCoreRowModel,
 getSortedRowModel,
} from '@tanstack/react-table';
import {
  Check,
  X,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useApprovals, useRespondApproval } from '../hooks/useApprovals';
import { formatDate } from '../lib/format';

export function ApprovalsPage() {
 const { data: approvals, isLoading, error } = useApprovals();
 const respond = useRespondApproval();
 const [acting, setActing] = useState({ id: null, decision: null });

 const handleRespond = useCallback(
 async (id, decision) => {
 setActing({ id, decision });
 try {
 await respond.mutateAsync({ id, decision });
 toast.success(decision === 'approved' ? 'Order approved' : 'Order rejected');
 } catch (err) {
 toast.error(err.message || 'Failed to respond');
 } finally {
 setActing({ id: null, decision: null });
 }
 },
 [respond]
 );

 const columns = useMemo(
 () => [
 {
 accessorKey: 'type',
 header: 'Type',
 cell: ({ getValue }) => (
 <Badge variant="neutral">{getValue()}</Badge>
 ),
 },
 {
 accessorKey: 'summary',
 header: 'Order Details',
 cell: ({ getValue }) => (
 <div className="min-w-0 py-1">
 <span className="text-sm font-medium text-ink block truncate max-w-[340px]" title={getValue()}>
 {getValue() || '-'}
 </span>
 <span className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-danger-ink">
 <AlertCircle className="size-3.5" />
 Over your Rs. 10,000 limit
 </span>
 </div>
 ),
 },
 {
 accessorKey: 'status',
 header: 'Status',
 cell: ({ getValue }) => <Badge variant={getValue()} dot>{getValue()}</Badge>,
 },
 {
 accessorKey: 'createdAt',
 header: 'Requested',
 cell: ({ getValue }) => (
 <span className="text-xs text-ink-secondary whitespace-nowrap">
 {formatDate(getValue())}
 </span>
 ),
 },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => {
 const id = row.original._id;
 const isActing = acting.id === id;
 const disabled = respond.isPending && acting.id !== null;

 return (
 <div className="flex items-center justify-end gap-2">
 <Button
 variant="teal"
 size="sm"
 disabled={disabled}
 loading={isActing && acting.decision === 'approved'}
 leftIcon={<Check className="w-4 h-4" />}
 onClick={() => handleRespond(id, 'approved')}
 >
 Approve
 </Button>
 <Button
 variant="secondary"
 size="sm"
 disabled={disabled}
 loading={isActing && acting.decision === 'rejected'}
 leftIcon={<X className="w-4 h-4" />}
 onClick={() => handleRespond(id, 'rejected')}
 >
 Reject
 </Button>
 </div>
 );
 },
 },
 ],
 [acting, respond.isPending, handleRespond]
 );

 const table = useReactTable({
 data: approvals || [],
 columns,
 getCoreRowModel: getCoreRowModel(),
 getSortedRowModel: getSortedRowModel(),
 initialState: { sorting: [{ id: 'createdAt', desc: true }] },
 });

 if (error) {
 return (
 <div className="space-y-6">
 <div>
 <p className="label">Held for you</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink">Approvals</h1>
 </div>
 <Card padding="lg" className="text-center py-12">
 <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
 <h3 className="text-base font-medium text-ink">Failed to load approvals</h3>
 <p className="text-xs text-ink-mute mt-1">{error.message}</p>
 </Card>
 </div>
 );
 }

 const pendingCount = approvals?.length || 0;

 return (
 <div className="space-y-5 sm:space-y-6">
 <div>
 <p className="label">Held for you</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)]">Approvals</h1>
 </div>

 {/* 4/8 — the rule on the left, the queue on the right */}
 <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
 <aside className="lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
 <div className={`rounded-card p-5 sm:p-6 ${pendingCount ? 'bg-coral-tint' : 'bg-paper-2'}`}>
 <p className="label">Waiting on you</p>
 <p className={`mt-2 font-display text-6xl font-semibold leading-none tracking-[-0.04em] font-tabular ${pendingCount ? 'text-danger-ink' : 'text-ink'}`}>
 {isLoading ? '—' : pendingCount}
 </p>
 <p className="mt-6 border-t border-current/15 pt-4 text-sm leading-relaxed text-ink-2">
 Sales of <span className="font-mono font-semibold text-ink">Rs. 10,000</span> or more wait here before
 any stock comes off the shelf. Rejecting one leaves your stock exactly as it was.
 </p>
 </div>
 </aside>

 <Card padding="none" className="min-w-0 overflow-hidden lg:col-span-8">
 <div className="px-5 pb-2 pt-5 sm:px-6">
 <h2 className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg">Queue</h2>
 <p className="label mt-0.5">Newest first</p>
 </div>
 {isLoading ? (
 <div className="space-y-2 px-5 pb-5 sm:px-6">
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 </div>
 ) : pendingCount === 0 ? (
 <EmptyState
 icon={<ClipboardCheck className="size-6" />}
 title="Nothing to approve"
 description="Big sales and automated actions that need your say will show up here."
 />
 ) : (
 <div className="pb-2">
 <Table table={table} emptyText="Nothing to approve" />
 </div>
 )}
 </Card>
 </div>
 </div>
 );
}
