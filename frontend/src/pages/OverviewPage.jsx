import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, AlertCircle } from 'lucide-react';
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import { CountUp } from '../components/ui/CountUp';
import { useDashboard } from '../hooks/useDashboard';
import { ReportDropdown } from '../components/ReportDropdown';
import { useAuthStore, useUiStore } from '../lib/store';
import { getTranslations } from '../lib/translations';
import { formatPKR, formatDate, formatBusinessName } from '../lib/format';

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function PaymentMethod({ method, isUrdu, t }) {
  const key = (method || 'cash').toLowerCase();
  const label = t?.[key] || capitalise(key);
  return (
    <span className={`whitespace-nowrap text-xs font-medium capitalize text-ink-2 ${isUrdu ? 'font-urdu' : ''}`}>
      {label}
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
function AttentionRow({ to, label, hint, value, tone, loading, className = '' }) {
  const tones = {
    coral: 'bg-coral-tint text-danger-ink',
    pear: 'bg-pear-tint text-warn-ink',
    calm: 'bg-paper-2 text-ink',
  };
  return (
    <Link
      to={to}
      className={`group flex flex-1 items-center justify-between gap-4 rounded-card px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5 ${tones[tone]} ${className}`}
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
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';
  const t = getTranslations(language).dashboard;

  const { data, isLoading, error } = useDashboard();
  const merchant = useAuthStore((s) => s.merchant);

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

  const URDU_DAYS = useMemo(
    () => ({
      Sun: 'اتوار',
      Mon: 'پیر',
      Tue: 'منگل',
      Wed: 'بدھ',
      Thu: 'جمعرات',
      Fri: 'جمعہ',
      Sat: 'ہفتہ',
    }),
    []
  );

  // 7-day trend: use the backend series when present, else roll up recent orders by day.
  const revenueChartData = useMemo(() => {
    if (data?.salesTrend && Array.isArray(data.salesTrend) && data.salesTrend.length > 0) {
      if (!isUrdu) return data.salesTrend;
      return data.salesTrend.map((pt) => ({
        ...pt,
        date: URDU_DAYS[pt.date] || pt.date,
      }));
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
      const enDay = d.toLocaleDateString('en-PK', { weekday: 'short' });
      trend.push({
        date: isUrdu ? (URDU_DAYS[enDay] || enDay) : enDay,
        fullDate: dateKey,
        revenue: dateMap[dateKey] ?? (i === 0 ? data?.todaySales || 0 : 0),
      });
    }
    return trend;
  }, [data, isUrdu, URDU_DAYS]);

  const recentOrdersColumns = useMemo(
    () => [
      {
        id: 'srNo',
        header: isUrdu ? 'نمبر شمار' : 'Sr No.',
        cell: ({ row }) => <span className="font-mono text-xs font-semibold text-muted">{row.index + 1}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: t.time,
        cell: ({ getValue }) => <span className="font-mono text-xs text-muted">{formatDate(getValue(), language)}</span>,
      },
      {
        accessorKey: 'items',
        header: t.items,
        cell: ({ getValue }) => {
          const items = getValue() || [];
          const summary = items.map((i) => `${i.name} ×${i.quantity}`).join(', ');
          return (
            <span className="block max-w-[200px] truncate text-sm text-ink sm:max-w-[320px] md:max-w-[420px] lg:max-w-[600px] xl:max-w-[800px]" title={summary}>
              {summary || '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'total',
        header: t.total,
        cell: ({ getValue }) => <span className="font-mono text-sm font-semibold text-ink">{formatPKR(getValue())}</span>,
      },
      {
        accessorKey: 'status',
        header: t.status,
        cell: ({ getValue }) => {
          const val = getValue();
          const label = t[val] || (val === 'pending_approval' ? t.pendingApproval : val);
          return <Badge variant={val} dot>{label}</Badge>;
        },
      },
      {
        accessorKey: 'paymentMethod',
        header: t.paymentMethod,
        cell: ({ getValue }) => <PaymentMethod method={getValue()} isUrdu={isUrdu} t={t} />,
      },
    ],
    [t, isUrdu, language]
  );

  const recentOrdersTable = useReactTable({
    data: data?.recentOrders || [],
    columns: recentOrdersColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: 'createdAt', desc: true }] },
  });

  const greetingName = formatBusinessName(merchant?.businessName, merchant?.location);
  const todayLabel = new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="display text-[length:var(--fs-xl)] text-ink">{t.today}</h1>
        <Card padding="lg" className="py-14 text-center">
          <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
          <h2 className="font-display text-lg font-semibold text-ink">{t.dashboardErrorTitle}</h2>
          <p className="mt-1 text-sm text-muted">{error.message}. {t.dashboardErrorDesc}</p>
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
            {greetingName ? (isUrdu ? `${t.todayAt} ${greetingName}` : `Today at ${greetingName}`) : t.todayAtShop}
          </h1>
        </div>
        <ReportDropdown />
      </div>

      {/* Row 1 — Equal 50/50 split: Sales graph left, Needs You right */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-6">
        <Card padding="none" className="flex flex-col justify-between overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-5 pt-5 sm:px-7 sm:pt-7">
            <div className="min-w-0">
              <p className="label">{t.salesToday}</p>
              {isLoading ? (
                <Skeleton className="mt-3 h-14 w-56" />
              ) : (
                <p className="mt-2 font-display text-[clamp(2.75rem,5vw+1rem,4.5rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-ink font-tabular">
                  <span className="mr-2 align-top text-[0.4em] font-medium text-muted">{isUrdu ? 'روپے' : 'Rs.'}</span>
                  <span className="hl">
                    <CountUp to={stats?.todaySales ?? 0} separator="," />
                  </span>
                </p>
              )}
            </div>
            <dl className="flex gap-6 pb-1.5">
              <div>
                <dt className="label">{t.orders}</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-ink">{isLoading ? '—' : data?.todayOrdersCount ?? 0}</dd>
              </div>
              <div>
                <dt className="label">{t.itemsSold}</dt>
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

        <div className="flex flex-col gap-3">
          <p className="label px-1">{t.needsYou}</p>
          <div className="flex flex-1 flex-col justify-between gap-3">
            <AttentionRow
              to="/dashboard/approvals"
              label={t.approvalsWaiting}
              hint={pending ? t.approvalsPendingHint : t.approvalsNoneHint}
              value={pending}
              tone={pending ? 'coral' : 'calm'}
              loading={isLoading}
              className="flex-1"
            />
            <AttentionRow
              to="/dashboard/inventory"
              label={t.runningLow}
              hint={lowStock ? t.runningLowHint : t.allStockedHint}
              value={lowStock}
              tone={lowStock ? 'pear' : 'calm'}
              loading={isLoading}
              className="flex-1"
            />
            <AttentionRow
              to="/dashboard/workflows"
              label={t.workflowsOn}
              hint={t.workflowsHint}
              value={stats?.activeWorkflows ?? 0}
              tone="calm"
              loading={isLoading}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Row 2 — Recent orders stretched full width to the right side */}
      <Card padding="none" className="w-full min-w-0 overflow-hidden">
        <SectionHead
          title={t.recentOrders}
          meta={t.fromWhatsAppAndDashboard}
          action={
            <Link to="/dashboard/orders" className="link-type text-sm">
              {t.allOrders} <ArrowUpRight className="size-3.5 rtl:rotate-90" />
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
            <Table table={recentOrdersTable} emptyText={t.noOrdersYet} />
          )}
        </div>
      </Card>
    </div>
  );
}

export default OverviewPage;
