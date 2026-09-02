import { useMemo, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
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
  IconBox,
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

import cashLogo from '../assets/cash-logo.jpeg';
import epLogo from '../assets/ep-logo.png';
import jcLogo from '../assets/jc-logo.png';
import bankLogo from '../assets/bank-logo.png';

const PAYMENT_COLORS = {
  cash: '#6366f1',
  easypaisa: '#10b981',
  jazzcash: '#f59e0b',
  bank: '#0ea5e9',
};

const PAYMENT_LOGOS = {
  cash: cashLogo,
  easypaisa: epLogo,
  jazzcash: jcLogo,
  bank: bankLogo,
};

function PaymentMethod({ method }) {
  const key = (method || 'cash').toLowerCase();
  const logo = PAYMENT_LOGOS[key];
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span className="inline-flex items-center gap-2">
      {logo && <img src={logo} alt={label} className="w-5 h-5 rounded shadow-xs object-cover shrink-0" />}
      <span className="text-xs font-medium text-ink-secondary">{label}</span>
    </span>
  );
}

function CountUp({ to, formatter = (v) => v, duration = 0.8 }) {
  const [display, setDisplay] = useState(() => formatter(0));
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const formatted = useTransform(spring, (v) => formatter(Math.round(Math.abs(v))));

  useEffect(() => {
    motionVal.set(to);
  }, [to, motionVal]);

  useEffect(() => {
    return formatted.on('change', (v) => setDisplay(v));
  }, [formatted]);

  return <>{display}</>;
}

function StatCard({ label, value, sub, icon: Icon, loading, variant = 'primary', formatter, index = 0 }) {
  const variantStyles = {
    primary: {
      border: 'border-indigo-500/25 hover:border-indigo-500/45',
      gradient: 'from-indigo-500/15 via-purple-500/5 to-canvas',
      iconBox: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-500/25',
      glow: 'bg-indigo-500',
    },
    success: {
      border: 'border-emerald-500/25 hover:border-emerald-500/45',
      gradient: 'from-emerald-500/15 via-teal-500/5 to-canvas',
      iconBox: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/25',
      glow: 'bg-emerald-500',
    },
    warning: {
      border: 'border-amber-500/25 hover:border-amber-500/45',
      gradient: 'from-amber-500/15 via-orange-500/5 to-canvas',
      iconBox: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-500/25',
      glow: 'bg-amber-500',
    },
    danger: {
      border: 'border-rose-500/25 hover:border-rose-500/45',
      gradient: 'from-rose-500/15 via-ruby/10 to-canvas',
      iconBox: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-sm shadow-rose-500/25',
      glow: 'bg-rose-500',
    },
  };

  const config = variantStyles[variant] || variantStyles.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`relative rounded-xl border bg-gradient-to-br ${config.gradient} ${config.border} p-5 shadow-card transition-all duration-200 hover:shadow-float backdrop-blur-xs`}>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-mute uppercase tracking-wider font-medium">{label}</p>
            {loading ? (
              <Skeleton variant="text" className="w-24 h-8 mt-2" />
            ) : (
              <p className="text-2xl font-light text-ink font-tabular mt-2 truncate">
                {formatter ? (
                  <CountUp to={value} formatter={formatter} />
                ) : (
                  <CountUp to={value} />
                )}
              </p>
            )}
            {sub && <p className="text-xs text-ink-mute mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.iconBox}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-canvas border border-hairline p-3 rounded-lg shadow-float text-xs">
        <p className="text-ink-mute mb-1 font-medium">{label}</p>
        <p className="text-primary font-tabular font-semibold text-sm">
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
      itemsSoldToday: data.itemsSoldToday || 0,
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
          const count = items.length;
          const summary = items.map((i) => `${i.name} x${i.quantity}`).join(', ');
          return (
            <div className="flex items-center gap-2 max-w-[240px]">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
              <span className="truncate text-ink text-xs" title={summary}>
                {summary || '-'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ getValue }) => (
          <span className="font-tabular font-medium text-emerald-600 dark:text-emerald-400">
            {formatPKR(getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <Badge variant={getValue()} dot>{getValue()}</Badge>,
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Payment',
        cell: ({ getValue }) => <PaymentMethod method={getValue()} />,
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
          <h2 className="font-heading text-2xl font-light tracking-[-0.5px] text-ink">Overview</h2>
          <p className="font-body text-sm text-ink-mute">Sales, stock, and approvals for today</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-pill bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Real-time Updates</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={stats?.todaySales ?? 0}
          formatter={formatPKR}
          sub={isLoading ? '' : `${data?.todayOrdersCount ?? 0} orders today`}
          icon={IconTrendingUp}
          loading={isLoading}
          variant="success"
          index={0}
        />
        <StatCard
          label="Items Sold Today"
          value={stats?.itemsSoldToday ?? 0}
          sub={isLoading ? '' : `Across ${data?.todayOrdersCount ?? 0} orders`}
          icon={IconBox}
          loading={isLoading}
          variant="primary"
          index={1}
        />
        <StatCard
          label="Low Stock Items"
          value={stats?.lowStockCount ?? 0}
          sub={isLoading ? '' : 'Need attention'}
          icon={IconPackage}
          loading={isLoading}
          variant={stats?.lowStockCount > 0 ? 'warning' : 'primary'}
          index={2}
        />
        <StatCard
          label="Pending Approvals"
          value={stats?.pendingApprovals ?? 0}
          sub={isLoading ? '' : 'Awaiting review'}
          icon={IconClipboardCheck}
          loading={isLoading}
          variant={stats?.pendingApprovals > 0 ? 'danger' : 'primary'}
          index={3}
        />
      </div>

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend AreaChart */}
        <Card padding="none" className="lg:col-span-2 overflow-hidden flex flex-col border border-primary/20">
          <div className="px-5 py-4 border-b border-hairline flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <IconChartBar className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-medium text-ink">Revenue Activity</h3>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary font-tabular">
              Recent Volume
            </span>
          </div>
          <div className="p-4 flex-1 min-h-[220px]">
            {isLoading ? (
              <Skeleton variant="card" className="h-[200px]" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="indigoPurpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="60%" stopColor="#a855f7" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
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
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#indigoPurpleGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card padding="none" className="overflow-hidden flex flex-col border border-hairline">
          <div className="px-5 py-4 border-b border-hairline flex items-center justify-between bg-gradient-to-r from-canvas-soft to-transparent">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <IconCreditCard className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-medium text-ink">Payment Methods</h3>
            </div>
            <span className="text-[11px] text-ink-mute">By count</span>
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
                        fill={PAYMENT_COLORS[entry.method] || '#6366f1'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} orders`, name]}
                    contentStyle={{
                      backgroundColor: 'var(--color-canvas, #fff)',
                      borderColor: 'var(--color-hairline, #e3e8ee)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value, entry) => {
                      const method = (entry?.payload?.method || value).toLowerCase();
                      const logo = PAYMENT_LOGOS[method];
                      const label = method.charAt(0).toUpperCase() + method.slice(1);
                      return (
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
                          {logo && <img src={logo} alt={label} className="w-3.5 h-3.5 rounded object-cover" />}
                          <span className="font-medium">{label}</span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Orders & Low Stock Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card padding="none" className="xl:col-span-2 overflow-hidden border border-hairline">
          <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <IconShoppingCart className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-medium text-ink">Recent Orders</h3>
            </div>
            {stats?.activeWorkflows != null && (
              <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                <IconBolt className="w-3.5 h-3.5" />
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

        <Card padding="none" className="overflow-hidden border border-hairline">
          <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <IconPackage className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-medium text-ink">Low Stock Alerts</h3>
            </div>
            {data?.lowStockItems?.length ? (
              <Badge variant="warning" size="sm" dot>{data.lowStockItems.length} alert{data.lowStockItems.length === 1 ? '' : 's'}</Badge>
            ) : null}
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
                  <li key={item._id} className="px-4 py-3 flex items-center justify-between hover:bg-canvas-soft/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <IconPackage className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                        <p className="text-[11px] text-ink-mute font-tabular">
                          {item.price ? formatPKR(item.price) : 'No price'} / {item.unit || 'unit'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={item.quantity === 0 ? 'danger' : 'warning'} dot>
                      {formatQuantity(item.quantity, item.unit)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <IconPackage className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-ink">All stock is healthy</p>
                <p className="text-xs text-ink-mute mt-0.5">No items are below threshold</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
