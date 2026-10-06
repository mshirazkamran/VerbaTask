import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, AlertCircle, Calendar, Package } from 'lucide-react';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import { CountUp } from '../components/ui/CountUp';
import { useDashboard, useNotifyExpiries } from '../hooks/useDashboard';
import { useUpdateInventoryItem } from '../hooks/useInventory';
import { ReportDropdown } from '../components/ReportDropdown';
import { useAuthStore } from '../lib/store';
import { formatPKR, formatDate, formatQuantity } from '../lib/format';

import cashLogo from '../assets/cash-logo.jpeg';
import epLogo from '../assets/ep-logo.png';
import jcLogo from '../assets/jc-logo.png';
import bankLogo from '../assets/bank-logo.png';

const PAYMENT_COLORS = {
  cash: 'var(--color-chart-1)',
  easypaisa: 'var(--color-chart-2)',
  jazzcash: 'var(--color-chart-3)',
  bank: 'var(--color-chart-4)',
};

const PAYMENT_LOGOS = {
  cash: cashLogo,
  easypaisa: epLogo,
  jazzcash: jcLogo,
  bank: bankLogo,
};

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function PaymentMethod({ method }) {
  const key = (method || 'cash').toLowerCase();
  const logo = PAYMENT_LOGOS[key];
  return (
    <span className="inline-flex items-center gap-2">
      {logo && <img src={logo} alt="" className="size-5 shrink-0 rounded-[5px] object-cover" />}
      <span className="whitespace-nowrap text-xs font-medium text-ink-2">{capitalise(key)}</span>
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-input border border-rule bg-surface px-3 py-2 shadow-[var(--shadow-pop)]">
      <p className="label">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-ink">{formatPKR(payload[0].value)}</p>
    </div>
  );
}

function SectionHead({ title, meta, action }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
      <div className="min-w-0">
        <h2 className="truncate font-display text-base font-semibold tracking-tight text-ink sm:text-lg">{title}</h2>
        {meta && <p className="label mt-0.5">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

/* "Needs you" — one row per thing that wants the shopkeeper's attention. */
function AttentionRow({ to, label, hint, value, tone, loading }) {
  const tones = {
    coral: 'bg-coral-tint text-danger-ink',
    pear: 'bg-pear-tint text-warn-ink',
    calm: 'bg-paper-2 text-ink',
  };
  return (
    <Link
      to={to}
      className={`group flex items-center justify-between gap-4 rounded-card px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5 ${tones[tone]}`}
    >
      <span className="min-w-0">
        <span className="block font-display text-base font-semibold tracking-tight">{label}</span>
        <span className="mt-0.5 block text-xs opacity-80">{hint}</span>
      </span>
      <span className="flex items-center gap-2">
        {loading ? (
          <Skeleton className="h-9 w-10" />
        ) : (
          <span className="font-display text-4xl font-semibold leading-none tracking-tight font-tabular">
            <CountUp to={value} />
          </span>
        )}
        <ArrowUpRight className="size-4 opacity-50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </span>
    </Link>
  );
}

export function OverviewPage() {
  const { data, isLoading, error } = useDashboard();
  const updateItem = useUpdateInventoryItem();
  const notifyExpiries = useNotifyExpiries();
  const merchant = useAuthStore((s) => s.merchant);

  const handleClearExpiry = async (itemId, currentDates, dateToClear) => {
    try {
      const newDates = currentDates.filter((d) => d !== dateToClear);
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

  // 7-day trend: use the backend series when present, else roll up recent orders by day.
  const revenueChartData = useMemo(() => {
    if (data?.salesTrend && Array.isArray(data.salesTrend) && data.salesTrend.length > 0) {
      return data.salesTrend;
    }
    const trend = [];
    const dateMap = {};
    (data?.recentOrders || []).forEach((order) => {
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
      trend.push({
        date: d.toLocaleDateString('en-PK', { weekday: 'short' }),
        fullDate: dateKey,
        revenue: dateMap[dateKey] ?? (i === 0 ? data?.todaySales || 0 : 0),
      });
    }
    return trend;
  }, [data]);

  const paymentBreakdown = useMemo(() => {
    const counts = {};
    (data?.recentOrders || []).forEach((o) => {
      const method = (o.paymentMethod || 'cash').toLowerCase();
      counts[method] = (counts[method] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
      total,
      rows: Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([method, value]) => ({ method, value, share: total ? value / total : 0 })),
    };
  }, [data]);

  const recentOrdersColumns = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Time',
        cell: ({ getValue }) => <span className="font-mono text-xs text-muted">{formatDate(getValue())}</span>,
      },
      {
        accessorKey: 'items',
        header: 'Items',
        cell: ({ getValue }) => {
          const items = getValue() || [];
          const summary = items.map((i) => `${i.name} ×${i.quantity}`).join(', ');
          return (
            <span className="block max-w-[150px] truncate text-sm text-ink sm:max-w-[200px] 2xl:max-w-[280px]" title={summary}>
              {summary || '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ getValue }) => <span className="font-mono text-sm font-semibold text-ink">{formatPKR(getValue())}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <Badge variant={getValue()} dot>{getValue()}</Badge>,
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Paid by',
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

  const greetingName = merchant?.businessName;
  const todayLabel = new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="display text-[length:var(--fs-xl)] text-ink">Today</h1>
        <Card padding="lg" className="py-14 text-center">
          <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
          <h2 className="font-display text-lg font-semibold text-ink">The dashboard didn’t load</h2>
          <p className="mt-1 text-sm text-muted">{error.message}. Refresh the page to try again.</p>
        </Card>
      </div>
    );
  }

  const pending = stats?.pendingApprovals ?? 0;
  const lowStock = stats?.lowStockCount ?? 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header — greeting left, the one page action right */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="label">{todayLabel}</p>
          <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)]">
            {greetingName ? `Today at ${greetingName}` : 'Today at your shop'}
          </h1>
        </div>
        <ReportDropdown />
      </div>

      {/* Row 1 · 7/5 — the day's number with its week, beside what needs you */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <Card padding="none" className="overflow-hidden lg:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-5 pt-5 sm:px-7 sm:pt-7">
            <div className="min-w-0">
              <p className="label">Sales today</p>
              {isLoading ? (
                <Skeleton className="mt-3 h-14 w-56" />
              ) : (
                <p className="mt-2 font-display text-[clamp(2.75rem,5vw+1rem,4.5rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-ink font-tabular">
                  <span className="mr-2 align-top text-[0.4em] font-medium text-muted">Rs.</span>
                  <span className="hl">
                    <CountUp to={stats?.todaySales ?? 0} separator="," />
                  </span>
                </p>
              )}
            </div>
            <dl className="flex gap-6 pb-1.5">
              <div>
                <dt className="label">Orders</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-ink">{isLoading ? '—' : data?.todayOrdersCount ?? 0}</dd>
              </div>
              <div>
                <dt className="label">Items sold</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-ink">{isLoading ? '—' : stats?.itemsSoldToday ?? 0}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 h-[190px] px-1 pb-2 sm:h-[220px]">
            {isLoading ? (
              <div className="px-5 pb-4">
                <Skeleton className="h-[170px] w-full rounded-card" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 20, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'var(--font-label)' }}
                    axisLine={{ stroke: 'var(--color-rule)' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={44}
                    tick={{ fontSize: 10, fill: 'var(--color-muted)', fontFamily: 'var(--font-label)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-rule-2)', strokeDasharray: '3 3' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    strokeWidth={2.25}
                    fill="url(#salesFill)"
                    activeDot={{ r: 5, fill: 'var(--color-pear)', stroke: 'var(--color-ink)', strokeWidth: 1.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-3 lg:col-span-5">
          <p className="label px-1">Needs you</p>
          <AttentionRow
            to="/dashboard/approvals"
            label="Approvals waiting"
            hint={pending ? 'Big sales held until you decide' : 'Nothing is waiting on you'}
            value={pending}
            tone={pending ? 'coral' : 'calm'}
            loading={isLoading}
          />
          <AttentionRow
            to="/dashboard/inventory"
            label="Running low"
            hint={lowStock ? 'Items under their alert level' : 'Every shelf is above its level'}
            value={lowStock}
            tone={lowStock ? 'pear' : 'calm'}
            loading={isLoading}
          />
          <AttentionRow
            to="/dashboard/workflows"
            label="Workflows on"
            hint="Automations watching your stock"
            value={stats?.activeWorkflows ?? 0}
            tone="calm"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Row 2 · 8/4 — the ledger, beside how the money came in and what's running out */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <Card padding="none" className="min-w-0 overflow-hidden lg:col-span-8">
          <SectionHead
            title="Recent orders"
            meta="From WhatsApp and the dashboard"
            action={
              <Link to="/dashboard/orders" className="link-type text-sm">
                All orders <ArrowUpRight className="size-3.5" />
              </Link>
            }
          />
          <div className="mt-3 pb-2">
            {isLoading ? (
              <div className="space-y-2 px-5 pb-4 sm:px-6">
                <Skeleton variant="tableRow" />
                <Skeleton variant="tableRow" />
                <Skeleton variant="tableRow" />
              </div>
            ) : (
              <Table table={recentOrdersTable} emptyText="No orders yet. Send your first voice note to see it here." />
            )}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-4 lg:gap-6">
          <Card padding="none">
            <SectionHead title="Paid by" meta={paymentBreakdown.total ? `${paymentBreakdown.total} recent orders` : 'No orders yet'} />
            <div className="px-5 pb-5 pt-4 sm:px-6">
              {isLoading ? (
                <Skeleton className="h-3 w-full" />
              ) : paymentBreakdown.total ? (
                <>
                  <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-pill" role="img" aria-label="Share of orders by payment method">
                    {paymentBreakdown.rows.map((r) => (
                      <span
                        key={r.method}
                        style={{ width: `${r.share * 100}%`, background: PAYMENT_COLORS[r.method] || 'var(--color-muted)' }}
                      />
                    ))}
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {paymentBreakdown.rows.map((r) => (
                      <li key={r.method} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2.5">
                          <span className="size-2.5 rounded-pill" style={{ background: PAYMENT_COLORS[r.method] || 'var(--color-muted)' }} />
                          <PaymentMethod method={r.method} />
                        </span>
                        <span className="font-mono text-xs text-muted">
                          {r.value} · {Math.round(r.share * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted">The split appears after your first few sales.</p>
              )}
            </div>
          </Card>

          <Card padding="none" className="flex-1">
            <SectionHead
              title="Running low"
              meta={lowStock ? `${lowStock} item${lowStock === 1 ? '' : 's'}` : 'All stocked'}
              action={
                lowStock ? (
                  <Link to="/dashboard/inventory" className="link-type text-sm">
                    Restock
                  </Link>
                ) : null
              }
            />
            <div className="pb-2 pt-2">
              {isLoading ? (
                <div className="space-y-3 px-5 pb-4 pt-2 sm:px-6">
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                </div>
              ) : data?.lowStockItems?.length ? (
                <ul className="divide-y divide-rule">
                  {data.lowStockItems.map((item) => (
                    <li key={item._id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {item.price ? formatPKR(item.price) : 'No price'} / {item.unit || 'unit'}
                        </p>
                      </div>
                      <Badge variant={item.quantity === 0 ? 'danger' : 'warning'} dot>
                        {formatQuantity(item.quantity, item.unit)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-3 px-5 pb-4 pt-2 sm:px-6">
                  <span className="grid size-9 place-items-center rounded-pill bg-success-tint text-success-ink">
                    <Package className="size-4" />
                  </span>
                  <p className="text-sm text-ink-2">Nothing is under its alert level.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {data?.expiringItems?.length > 0 && (
        <Card padding="none">
          <SectionHead
            title="Expiring soon"
            meta={`${data.expiringItems.length} batch${data.expiringItems.length === 1 ? '' : 'es'} within 45 days`}
            action={
              <button
                type="button"
                onClick={() => notifyExpiries.mutate()}
                disabled={notifyExpiries.isPending}
                className="btn btn--soft btn--sm"
                title="Send the list to your WhatsApp"
              >
                <WhatsAppIcon className="size-3.5" />
                {notifyExpiries.isPending ? 'Sending…' : 'Send to WhatsApp'}
              </button>
            }
          />
          <ul className="mt-3 divide-y divide-rule pb-2">
            {data.expiringItems.map((item) => {
              const target = new Date();
              target.setDate(target.getDate() + 45);
              const threshold = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
              const dateToShow = item.expiryDates.filter((d) => d <= threshold).sort()[0];

              return (
                <li key={item._id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-pill bg-coral-tint text-danger-ink">
                      <Calendar className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                      <p className="font-mono text-[11px] text-muted">
                        Expires <span className="text-danger-ink">{dateToShow}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClearExpiry(item._id, item.expiryDates, dateToShow)}
                    className="btn btn--ghost btn--sm"
                    title="Mark this batch as sold or removed"
                  >
                    Cleared
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default OverviewPage;
