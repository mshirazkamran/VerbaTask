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
 <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium text-xs capitalize">
 {getValue()}
 </span>
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
 <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1 mt-0.5">
 <AlertCircle className="w-3.5 h-3.5" />
 Exceeds Rs. 10,000 threshold
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
 variant="primary"
 size="sm"
 className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600 shadow-xs shadow-emerald-500/25"
 disabled={disabled}
 loading={isActing && acting.decision === 'approved'}
 leftIcon={<Check className="w-4 h-4" />}
 onClick={() => handleRespond(id, 'approved')}
 >
 Approve
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="text-ruby hover:text-ruby hover:bg-ruby/10 border border-ruby/20"
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
 <h2 className="text-xl font-light text-ink tracking-tight">Approvals</h2>
 <p className="text-xs text-ink-mute">Review flagged orders and workflow actions</p>
 </div>
 <Card padding="lg" className="text-center py-12">
 <AlertCircle className="w-10 h-10 text-ruby mx-auto mb-3" />
 <h3 className="text-base font-medium text-ink">Failed to load approvals</h3>
 <p className="text-xs text-ink-mute mt-1">{error.message}</p>
 </Card>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h2 className="font-heading text-2xl font-light tracking-[-0.5px] text-ink">Approvals</h2>
 <p className="font-body text-sm text-ink-mute">Review flagged orders and high-value transactions</p>
 </div>
 {isLoading ? (
 <Skeleton variant="button" />
 ) : (
 <Badge variant={approvals?.length ? 'warning' : 'success'} dot>
 {approvals?.length || 0} pending
 </Badge>
 )}
 </div>

 {/* High-Value Protection Banner - Solid Warm Accent & Glassmorphism */}
 <div className="p-4 rounded-xl border-l-4 border-l-amber-500 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card hover:shadow-md transition-all duration-200">
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700 flex items-center justify-center shrink-0 shadow-xs ">
 <ClipboardCheck className="w-5 h-5" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-medium text-ink">High-Value Order Protection</h3>
 <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium ">
 Active Guard
 </span>
 </div>
 <p className="text-xs text-ink-mute mt-0.5">
 Sales of Rs. 10,000 or more require explicit merchant authorization before stock is deducted.
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 text-xs text-ink-secondary bg-canvas dark:bg-canvas px-3 py-1.5 rounded-md border border-hairline shrink-0 font-tabular">
 <span className="font-semibold text-amber-800 dark:text-amber-300">{approvals?.length || 0}</span>
 <span>awaiting response</span>
 </div>
 </div>

 {isLoading ? (
 <div className="space-y-2">
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 </div>
 ) : approvals?.length === 0 ? (
 <Card padding="lg">
 <EmptyState
 icon={<ClipboardCheck className="w-6 h-6" />}
 title="No approvals pending"
 description="You're all caught up! Orders and automated actions requiring merchant review will appear here."
 />
 </Card>
 ) : (
 <Table table={table} emptyText="No approvals pending." />
 )}
 </div>
 );
}
