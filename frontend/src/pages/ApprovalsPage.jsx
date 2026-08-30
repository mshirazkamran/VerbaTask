import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  IconCheck,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useApprovals, useRespondApproval } from '../hooks/useApprovals';
import { formatDate } from '../lib/format';

export function ApprovalsPage() {
  const { data: approvals, isLoading, error } = useApprovals('pending');
  const respond = useRespondApproval();
  const [acting, setActing] = useState({ id: null, decision: null });

  const handleRespond = useCallback(
    async (id, decision) => {
      setActing({ id, decision });
      try {
        await respond.mutateAsync({ id, decision });
        toast.success(`Approval ${decision}`);
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
          <span className="capitalize text-ink-secondary">{getValue()}</span>
        ),
      },
      {
        accessorKey: 'summary',
        header: 'Summary',
        cell: ({ getValue }) => (
          <span className="truncate max-w-[300px] block" title={getValue()}>
            {getValue() || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <Badge variant={getValue()}>{getValue()}</Badge>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Requested',
        cell: ({ getValue }) => formatDate(getValue()),
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
                variant="secondary"
                size="sm"
                disabled={disabled}
                loading={isActing && acting.decision === 'approved'}
                leftIcon={<IconCheck className="w-4 h-4" />}
                onClick={() => handleRespond(id, 'approved')}
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-ruby hover:text-ruby hover:bg-ruby/10"
                disabled={disabled}
                loading={isActing && acting.decision === 'rejected'}
                leftIcon={<IconX className="w-4 h-4" />}
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
          <IconAlertCircle className="w-10 h-10 text-ruby mx-auto mb-3" />
          <h3 className="text-base font-medium text-ink">Failed to load approvals</h3>
          <p className="text-xs text-ink-mute mt-1">{error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-light text-ink tracking-tight">Approvals</h2>
          <p className="text-xs text-ink-mute">Review flagged orders and workflow actions</p>
        </div>
        {isLoading ? (
          <Skeleton variant="button" />
        ) : (
          <Badge variant={approvals?.length ? 'warning' : 'success'} dot>
            {approvals?.length || 0} pending
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
        </div>
      ) : (
        <Table table={table} emptyText="No approvals pending. You're all caught up!" />
      )}
    </div>
  );
}
