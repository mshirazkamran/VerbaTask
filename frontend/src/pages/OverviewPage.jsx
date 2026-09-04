import { useMemo, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import {
  TrendingUp,
  Package,
  ClipboardCheck,
  Zap,
  ShoppingCart,
  AlertCircle,
  BarChart3,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { toast } from 'sonner';
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
import { CountUp } from '../components/ui/CountUp';
import { useDashboard, useNotifyExpiries } from '../hooks/useDashboard';
import { useUpdateInventoryItem } from '../hooks/useInventory';
import { Button } from '../components/ui/Button';
import { ReportDropdown } from '../components/ReportDropdown';
import { formatPKR, formatDate, formatQuantity } from '../lib/format';

import cashLogo from '../assets/cash-logo.jpeg';
import epLogo from '../assets/ep-logo.png';
import jcLogo from '../assets/jc-logo.png';
import bankLogo from '../assets/bank-logo.png';

const PAYMENT_COLORS = {
 cash: '#10B981',
 easypaisa: '#0EA5E9',
 jazzcash: '#F59E0B',
 bank: '#8B5CF6',
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



function StatCard({ label, value, sub, icon: Icon, loading, variant = 'primary', formatter, index = 0 }) {
 const variantStyles = {
 primary: {
 card: 'bg-canvas border-hairline',
 label: 'text-emerald-700 dark:text-emerald-300 font-medium',
 value: 'text-emerald-950 dark:text-emerald-50 font-light',
 sub: 'text-emerald-600 dark:text-emerald-300',
 iconBox: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
 },
 success: {
 card: 'bg-canvas border-hairline',
 label: 'text-emerald-700 dark:text-emerald-300 font-medium',
 value: 'text-emerald-950 dark:text-emerald-50 font-light',
 sub: 'text-emerald-600 dark:text-emerald-300',
 iconBox: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
 },
 warning: {
 card: 'bg-canvas border-hairline',
 label: 'text-amber-800 dark:text-amber-300 font-medium',
 value: 'text-amber-950 dark:text-amber-50 font-light',
 sub: 'text-amber-700 dark:text-amber-300',
 iconBox: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300',
 },
 danger: {
 card: 'bg-canvas border-hairline',
 label: 'text-red-800 dark:text-red-300 font-medium',
 value: 'text-red-950 dark:text-red-50 font-light',
 sub: 'text-red-700 dark:text-red-300',
 iconBox: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300',
 },
 };

 const config = variantStyles[variant] || variantStyles.primary;

 return (
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
 >
 <div className={`relative rounded-xl border ${config.card} p-5 shadow-card transition-all duration-200 hover:shadow-md`}>
 <div className="flex items-start justify-between">
 <div className="min-w-0 flex-1">
 <p className={`text-xs uppercase tracking-wider ${config.label}`}>{label}</p>
 {loading ? (
 <Skeleton variant="text" className="w-24 h-8 mt-2" />
 ) : (
 <p className={`text-2xl font-tabular mt-2 truncate ${config.value}`}>
 {formatter && formatter.name === 'formatPKR' ? (
 <CountUp to={value} prefix="Rs. " separator="," />
 ) : (
 <CountUp to={value} />
 )}
 </p>
 )}
 {sub && <p className={`text-xs mt-1.5 truncate ${config.sub}`}>{sub}</p>}
 </div>
 <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.iconBox}`}>
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
 <div className="bg-canvas border border-hairline p-3 rounded-lg shadow-md text-xs">
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
 const updateItem = useUpdateInventoryItem();
 const notifyExpiries = useNotifyExpiries();

 const handleClearExpiry = async (itemId, currentDates, dateToClear) => {
 try {
 const newDates = currentDates.filter(d => d !== dateToClear);
 await updateItem.mutateAsync({ id: itemId, expiryDates: newDates });
 } catch (e) {
 console.error(e);
 }
 };

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

 // Robust 7-day sales trend (never collapses when new orders are added)
 const revenueChartData = useMemo(() => {
 // 1. If backend returns salesTrend array, use it directly
 if (data?.salesTrend && Array.isArray(data.salesTrend) && data.salesTrend.length > 0) {
 return data.salesTrend;
 }

 // 2. Fallback: generate rolling 7 continuous days (from 6 days ago through today)
 const trend = [];
 const dateMap = {};

 const orders = data?.recentOrders || [];
 orders.forEach((order) => {
 if (!order.createdAt) return;
 const d = new Date(order.createdAt);
 if (isNaN(d.getTime())) return;
 const dateKey = d.toISOString().split('T')[0];
 dateMap[dateKey] = (dateMap[dateKey] || 0) + (order.total || 0);
 });

 for (let i = 6; i >= 0; i--) {
 const d = new Date();
 d.setDate(d.getDate() - i);
 const dateKey = d.toISOString().split('T')[0];
 const weekday = d.toLocaleDateString('en-PK', { weekday: 'short' });
 trend.push({
 date: weekday,
 fullDate: dateKey,
 revenue: dateMap[dateKey] ?? (i === 0 ? (data?.todaySales || 0) : 0),
 });
 }

 return trend;
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
 <div className="flex items-center gap-2 max-w-[150px] sm:max-w-[240px]">
 <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium shrink-0">
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
 <AlertCircle className="w-10 h-10 text-ruby mx-auto mb-3" />
 <h3 className="text-base font-medium text-ink">Failed to load dashboard</h3>
 <p className="text-xs text-ink-mute mt-1">{error.message}</p>
 </Card>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h2 className="font-heading text-2xl font-light tracking-[-0.5px] text-ink">Overview</h2>
 <p className="font-body text-sm text-ink-mute">Sales, stock, and approvals for today</p>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <ReportDropdown />
 <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-canvas border border-hairline text-emerald-800 dark:text-emerald-300 text-xs font-medium">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
 </span>
 <span>Real-time Updates</span>
 </div>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
 <StatCard
 label="Today's Sales"
 value={stats?.todaySales ?? 0}
 formatter={formatPKR}
 sub={isLoading ? '' : `${data?.todayOrdersCount ?? 0} orders today`}
 icon={TrendingUp}
 loading={isLoading}
 variant="success"
 index={0}
 />
 <StatCard
 label="Items Sold Today"
 value={stats?.itemsSoldToday ?? 0}
 sub={isLoading ? '' : `Across ${data?.todayOrdersCount ?? 0} orders`}
 icon={Package}
 loading={isLoading}
 variant="primary"
 index={1}
 />
 <StatCard
 label="Low Stock Items"
 value={stats?.lowStockCount ?? 0}
 sub={isLoading ? '' : 'Need attention'}
 icon={Package}
 loading={isLoading}
 variant={stats?.lowStockCount > 0 ? 'warning' : 'primary'}
 index={2}
 />
 <StatCard
 label="Pending Approvals"
 value={stats?.pendingApprovals ?? 0}
 sub={isLoading ? '' : 'Awaiting review'}
 icon={ClipboardCheck}
 loading={isLoading}
 variant={stats?.pendingApprovals > 0 ? 'danger' : 'primary'}
 index={3}
 />
 </div>

 {/* Visualizations Row */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Revenue Trend AreaChart */}
 <Card padding="none" className="lg:col-span-2 overflow-hidden flex flex-col border border-hairline">
 <div className="px-5 py-3.5 border-b border-hairline flex items-center justify-between bg-canvas-soft">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-hairline flex items-center justify-center">
 <BarChart3 className="w-4 h-4" />
 </div>
 <h3 className="text-sm font-medium text-ink">Revenue Activity</h3>
 </div>
 <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-canvas-soft border border-hairline text-emerald-700 dark:text-emerald-300 font-tabular">
 7-Day Trend
 </span>
 </div>
 <div className="p-4 flex-1 min-h-[220px]">
 {isLoading ? (
 <Skeleton variant="card" className="h-[200px]" />
 ) : (
 <ResponsiveContainer width="100%" height={200}>
 <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
 stroke="#10b981"
 strokeWidth={2.5}
 fill="#10b981"
 fillOpacity={0.08}
 />
 </AreaChart>
 </ResponsiveContainer>
 )}
 </div>
 </Card>

 {/* Payment Methods Breakdown */}
 <Card padding="none" className="overflow-hidden flex flex-col border border-hairline">
 <div className="px-5 py-3.5 border-b border-hairline flex items-center justify-between bg-canvas-soft">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
 <CreditCard className="w-4 h-4" />
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
 itemStyle={{ color: 'var(--color-ink)' }}
 labelStyle={{ color: 'var(--color-ink-secondary)' }}
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
 <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
 <ShoppingCart className="w-4 h-4" />
 </div>
 <h3 className="text-sm font-medium text-ink">Recent Orders</h3>
 </div>
 {stats?.activeWorkflows != null && (
 <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-medium">
 <Zap className="w-3.5 h-3.5" />
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
 <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
 <Package className="w-4 h-4" />
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
 <li key={item._id} className="px-4 py-3 flex items-center justify-between hover:bg-canvas-soft transition-colors">
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
 <Package className="w-4 h-4" />
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
 <Package className="w-5 h-5" />
 </div>
 <p className="text-sm font-medium text-ink">All stock is healthy</p>
 <p className="text-xs text-ink-mute mt-0.5">No items are below threshold</p>
 </div>
 )}
 </div>
 </Card>

 {data?.expiringItems?.length > 0 && (
 <Card padding="none" className="overflow-hidden border border-hairline mt-6">
 <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
 <Calendar className="w-3.5 h-3.5" />
 </div>
 <h3 className="text-sm font-medium text-ink">Expiring Soon</h3>
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={() => notifyExpiries.mutate()}
 disabled={notifyExpiries.isPending}
 className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors disabled:opacity-50"
 title="Send alert to WhatsApp"
 >
 <WhatsAppIcon className="w-3.5 h-3.5" />
 {notifyExpiries.isPending ? 'Sending...' : 'Send Alert'}
 </button>
 <Badge variant="danger" size="sm" dot>{data.expiringItems.length} alert{data.expiringItems.length === 1 ? '' : 's'}</Badge>
 </div>
 </div>
 <div className="p-1">
 <ul className="divide-y divide-hairline">
 {data.expiringItems.map((item) => {
 // Find the earliest date(s) that are near expiry to show
 const targetExpiry = new Date();
 targetExpiry.setDate(targetExpiry.getDate() + 45);
 const expiryThreshold = `${targetExpiry.getFullYear()}-${String(targetExpiry.getMonth() + 1).padStart(2, '0')}`;
 
 const nearingExpiry = item.expiryDates.filter(d => d <= expiryThreshold).sort();
 const dateToShow = nearingExpiry[0];

 return (
 <li key={item._id} className="px-4 py-3 flex items-center justify-between hover:bg-canvas-soft transition-colors">
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
 <Calendar className="w-4 h-4" />
 </div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-ink truncate">{item.name}</p>
 <p className="text-[11px] text-ink-mute font-tabular">
 Expires: <span className="text-red-600 dark:text-red-400 font-medium">{dateToShow}</span>
 </p>
 </div>
 </div>
 <button 
 onClick={() => handleClearExpiry(item._id, item.expiryDates, dateToShow)}
 className="text-[10px] px-2 py-1 rounded-md bg-canvas border border-hairline text-ink hover:text-emerald-600 hover:border-emerald-500 transition-colors shrink-0"
 title="Mark as cleared (sold or removed)"
 >
 Cleared
 </button>
 </li>
 );
 })}
 </ul>
 </div>
 </Card>
 )}
 </div>
 </div>
 );
}
