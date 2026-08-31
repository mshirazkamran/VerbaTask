import { useMemo } from 'react';
import {
  IconLayoutDashboard,
  IconTrendingUp,
  IconPackage,
  IconClipboardCheck,
  IconBolt,
  IconShoppingCart,
  IconAlertCircle,
  IconChartBar,
  IconCreditCard,
} from '@tabler/icons-react';
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import { useDashboard } from '../hooks/useDashboard';
import { formatPKR, formatDate, formatQuantity } from '../lib/format';

const PAYMENT_COLORS = {
  cash: '#533afd',
  easypaisa: '#ea2261',
  jazzcash: '#9b6829',
  bank: '#f96bee',
};

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

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-canvas border border-hairline p-2.5 rounded-md shadow-card text-xs">
        <p className="text-ink-mute mb-1 font-medium">{label}</p>
        <p className="text-primary font-tabular font-medium">
          {formatPKR(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
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

  // Aggregate recent orders into trend chart data
  const revenueChartData = useMemo(() => {
    const orders = data?.recentOrders || [];
    if (!orders.length) {
      // Default placeholder 7-day trend
      return [
        { date: 'Mon', revenue: 0 },
        { date: 'Tue', revenue: 0 },
        { date: 'Wed', revenue: 0 },
        { date: 'Thu', revenue: 0 },
        { date: 'Fri', revenue: 0 },
        { date: 'Sat', revenue: 0 },
        { date: 'Sun', revenue: data?.todaySales || 0 },
      ];
    }

    // Group orders by formatted date
    const dateMap = {};
    [...orders].reverse().forEach((order) => {
      const d = new Date(order.createdAt);
      const key = isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-PK', { weekday: 'short' });
      dateMap[key] = (dateMap[key] || 0) + (order.total || 0);
    });

    return Object.entries(dateMap).map(([date, revenue]) => ({ date, revenue }));
  }, [data]);

  // Aggregate payment methods breakdown
  const paymentBreakdownData = useMemo(() => {
    const orders = data?.recentOrders || [];
    const counts = {};
    orders.forEach((o) => {
      const method = o.paymentMethod || 'cash';
      counts[method] = (counts[method] || 0) + 1;
    });

    const entries = Object.entries(counts);
    if (!entries.length) {
      return [{ name: 'Cash', value: 1, method: 'cash' }];
    }

    return entries.map(([method, value]) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value,
      method,
    }));
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
        cell: ({ getValue }) => <span className="font-tabular">{formatPKR(getValue())}</span>,
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
          <p className="text-xs text-ink-mute">Sales, stock, and approvals for today</p>
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
          <p className="text-xs text-ink-mute">Sales, stock, and approvals for today</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-pill bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Updates (30s)</span>
        </div>
      </div>

      {/* KPI Cards */}
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
          sub={isLoading ? '' : "Same as today's sales (profit tracking coming soon)"}
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

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend AreaChart */}
        <Card padding="none" className="lg:col-span-2 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconChartBar className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-ink">Revenue Activity</h3>
            </div>
            <span className="text-xs text-ink-mute">Recent transaction volume</span>
          </div>
          <div className="p-4 flex-1 min-h-[220px]">
            {isLoading ? (
              <Skeleton variant="card" className="h-[200px]" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary, #533afd)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary, #533afd)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--color-ink-mute, #64748d)' }}
                    axisLine={{ stroke: 'var(--color-hairline, #e3e8ee)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-ink-mute, #64748d)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `Rs. ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary, #533afd)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#indigoGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card padding="none" className="overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconCreditCard className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-ink">Payment Methods</h3>
            </div>
          </div>
          <div className="p-4 flex-1 min-h-[220px] flex items-center justify-center">
            {isLoading ? (
              <Skeleton variant="circle" className="w-32 h-32" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={paymentBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentBreakdownData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PAYMENT_COLORS[entry.method] || '#533afd'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} orders`, name]}
                    contentStyle={{
                      backgroundColor: 'var(--color-canvas, #fff)',
                      borderColor: 'var(--color-hairline, #e3e8ee)',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-ink-secondary">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Orders & Low Stock Tables */}
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
                      <p className="text-[11px] text-ink-mute font-tabular">
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
