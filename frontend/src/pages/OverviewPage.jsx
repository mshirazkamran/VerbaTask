import { useMemo } from 'react';
import {
  IconLayoutDashboard,
  IconTrendingUp,
  IconPackage,
  IconClipboardCheck,
  IconBolt,
  IconShoppingCart,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';

import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import { useDashboard } from '../hooks/useDashboard';
import { formatPKR, formatDate, formatQuantity } from '../lib/format';

function StatCard({ label, value, sub, icon: Icon, loading, variant = 'primary' }) {
  const variantIconStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-ruby/10 text-ruby',
  };

  return (
    <Card padding="md" className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs text-ink-mute uppercase tracking-wider font-medium">{label}</p>
        {loading ? (
          <Skeleton variant="text" className="w-20 h-8 mt-2" />
        ) : (
          <p className="text-2xl font-light text-ink font-tabular mt-2 truncate">{value}</p>
        )}
        {sub && <p className="text-xs text-ink-mute mt-1 truncate">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${variantIconStyles[variant]}`}>
        <Icon className="w-5 h-5" />
      </div>
    </Card>
  );
}

export function OverviewPage() {
  const { data, isLoading, error } = useDashboard();

  const stats = useMemo(() => {
    if (!data) return null;
    return {
      todaySales: data.todaySales || 0,
      todayProfit: data.todayProfit || 0,
      lowStockCount: data.lowStockItems?.length || 0,
      pendingApprovals: data.pendingApprovals || 0,
      activeWorkflows: data.activeWorkflows || 0,
    };
  }, [data]);

  const recentOrdersColumns = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Time',
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: 'items',
        header: 'Items',
        cell: ({ getValue }) => {
          const items = getValue() || [];
          const summary = items.map((i) => `${i.name} x${i.quantity}`).join(', ');
          return <span className="truncate max-w-[200px] block" title={summary}>{summary || '-'}</span>;
        },
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ getValue }) => formatPKR(getValue()),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <Badge variant={getValue()}>{getValue()}</Badge>,
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ getValue }) => <Badge variant={getValue()}>{getValue()}</Badge>,
      },
    ],
    []
  );

  const recentOrdersTable = useReactTable({
    data: data?.recentOrders || [],
    columns: recentOrdersColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: 'createdAt', desc: true }] },
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-light text-ink tracking-tight">Overview</h2>
          <p className="text-xs text-ink-mute">Store activity summary and KPI metrics</p>
        </div>
        <Card padding="lg" className="text-center py-12">
          <IconAlertCircle className="w-10 h-10 text-ruby mx-auto mb-3" />
          <h3 className="text-base font-medium text-ink">Failed to load dashboard</h3>
          <p className="text-xs text-ink-mute mt-1">{error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-light text-ink tracking-tight">Overview</h2>
          <p className="text-xs text-ink-mute">Store activity summary and KPI metrics</p>
        </div>
        <Badge variant="primary" dot>
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={formatPKR(stats?.todaySales ?? 0)}
          sub={isLoading ? '' : `${data?.todayOrdersCount ?? 0} orders today`}
          icon={IconTrendingUp}
          loading={isLoading}
          variant="success"
        />
        <StatCard
          label="Today's Profit"
          value={formatPKR(stats?.todayProfit ?? 0)}
          sub={isLoading ? '' : 'Gross profit estimate'}
          icon={IconLayoutDashboard}
          loading={isLoading}
          variant="primary"
        />
        <StatCard
          label="Low Stock Items"
          value={stats?.lowStockCount ?? 0}
          sub={isLoading ? '' : 'Need attention'}
          icon={IconPackage}
          loading={isLoading}
          variant={stats?.lowStockCount > 0 ? 'warning' : 'primary'}
        />
        <StatCard
          label="Pending Approvals"
          value={stats?.pendingApprovals ?? 0}
          sub={isLoading ? '' : 'Awaiting review'}
          icon={IconClipboardCheck}
          loading={isLoading}
          variant={stats?.pendingApprovals > 0 ? 'danger' : 'primary'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card padding="none" className="xl:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconShoppingCart className="w-4 h-4 text-ink-mute" />
              <h3 className="text-sm font-medium text-ink">Recent Orders</h3>
            </div>
            {stats?.activeWorkflows != null && (
              <div className="flex items-center gap-1.5 text-xs text-ink-mute">
                <IconBolt className="w-3.5 h-3.5 text-primary" />
                {stats.activeWorkflows} active workflow{stats.activeWorkflows === 1 ? '' : 's'}
              </div>
            )}
          </div>
          <div className="p-1">
            {isLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton variant="tableRow" />
                <Skeleton variant="tableRow" />
                <Skeleton variant="tableRow" />
              </div>
            ) : (
              <Table table={recentOrdersTable} emptyText="No orders yet" />
            )}
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-hairline flex items-center gap-2">
            <IconPackage className="w-4 h-4 text-ink-mute" />
            <h3 className="text-sm font-medium text-ink">Low Stock Alerts</h3>
          </div>
          <div className="p-1">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
              </div>
            ) : data?.lowStockItems?.length ? (
              <ul className="divide-y divide-hairline">
                {data.lowStockItems.map((item) => (
                  <li key={item._id} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-ink truncate">{item.name}</p>
                      <p className="text-[11px] text-ink-mute">
                        {item.price ? formatPKR(item.price) : 'No price'} / {item.unit || 'unit'}
                      </p>
                    </div>
                    <Badge variant={item.quantity === 0 ? 'danger' : 'warning'}>
                      {formatQuantity(item.quantity, item.unit)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-12 text-center">
                <IconPackage className="w-8 h-8 text-ink-mute/50 mx-auto mb-2" />
                <p className="text-sm text-ink-secondary">All stock is healthy</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
