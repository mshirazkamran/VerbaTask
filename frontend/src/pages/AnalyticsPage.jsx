import { useMemo, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { CountUp } from '../components/ui/CountUp';
import { useAnalytics } from '../hooks/useAnalytics';
import { useUiStore } from '../lib/store';
import { getTranslations } from '../lib/translations';
import { formatPKR } from '../lib/format';

const RANGES = ['7d', '30d', '90d', '12m'];

const PAYMENT_COLORS = {
  cash: '#15803D',
  easypaisa: '#059669',
  jazzcash: '#D97706',
  bank: '#2563EB',
  udhaar: '#DC2626',
};

const AXIS_TICK = { fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'var(--font-sans)' };
const GRID_STROKE = 'var(--color-rule)';

const compactPKR = (v) => (v >= 1_000_000 ? `${+(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v);

/** Day keys are Pakistan-local "YYYY-MM-DD" (or "YYYY-MM"); format them without timezone drift. */
function formatKey(key, locale, opts) {
  const full = key.length === 7 ? `${key}-01` : key;
  return new Date(`${full}T00:00:00Z`).toLocaleDateString(locale, { timeZone: 'UTC', ...opts });
}

function SectionHead({ title, meta, action }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-ink sm:text-lg">{title}</h2>
        {meta && <p className="mt-0.5 text-xs font-medium text-muted">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

function ChartTooltip({ active, payload, label, valueFormatter, unitLabel }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-input border border-rule bg-surface px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-muted">{point.tooltipLabel || label}</p>
      <p className="mt-0.5 font-mono text-sm font-bold text-ink">{valueFormatter(payload[0].value)}</p>
      {unitLabel && point.orders != null && (
        <p className="font-mono text-[11px] text-muted">
          {point.orders} {unitLabel}
        </p>
      )}
    </div>
  );
}

function GrowthChip({ value, t }) {
  if (value == null) {
    return (
      <Badge variant="neutral">
        <Minus className="size-3" /> {t.noEarlier}
      </Badge>
    );
  }
  const up = value > 0;
  const flat = value === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge variant={flat ? 'neutral' : up ? 'success' : 'danger'}>
      <Icon className="size-3.5" /> {up ? '+' : ''}
      {value}% <span className="font-normal opacity-85">{t.vsPrevious}</span>
    </Badge>
  );
}

function Kpi({ label, value, growth, t, loading, money = true }) {
  return (
    <div className="min-w-0 py-2 sm:py-0">
      <p className="text-xs font-medium text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-28" />
      ) : (
        <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink font-tabular sm:text-[1.65rem]">
          {money ? formatPKR(value) : <CountUp to={value} />}
        </p>
      )}
      {growth !== undefined && !loading && (
        <div className="mt-1.5">
          <GrowthChip value={growth} t={t} />
        </div>
      )}
    </div>
  );
}

function RangePicker({ value, onChange, t }) {
  return (
    <div role="tablist" aria-label={t.title} className="inline-flex gap-1 rounded-card border border-rule bg-surface p-1 shadow-xs">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={value === r}
          onClick={() => onChange(r)}
          className={`h-9 whitespace-nowrap rounded-[8px] px-3.5 text-xs font-semibold transition-all duration-150 ${
            value === r ? 'bg-ink text-paper shadow-xs' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
          }`}
        >
          {t.range[r]}
        </button>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const t = getTranslations(language).analytics;

  const [range, setRange] = useState('30d');
  const { data, isLoading, error } = useAnalytics(range);
  const loading = isLoading && !data;

  const summary = data?.summary;
  const hasSales = (summary?.orders ?? 0) > 0;

  const trend = useMemo(() => {
    const monthly = data?.range === '12m';
    return (data?.trend || []).map((p) => ({
      ...p,
      label: formatKey(p.date, locale, monthly ? { month: 'short' } : data?.days <= 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }),
      tooltipLabel: formatKey(p.date, locale, monthly ? { month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' }),
    }));
  }, [data, locale]);

  const methodLabel = (m) => t[m] || m.charAt(0).toUpperCase() + m.slice(1);
  const topMax = data?.topProducts?.[0]?.revenue || 1;
  const bestDay = summary?.bestDay;

  if (error && !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">{t.title}</h1>
        <Card padding="lg" className="py-14 text-center">
          <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
          <h2 className="text-lg font-semibold text-ink">{t.errorTitle}</h2>
          <p className="mt-1 text-sm text-muted">{t.errorDesc}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header — Title, eyebrow and Range Picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t.eyebrow}</p>
          <h1 className={`mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl ${isUrdu ? 'font-urdu' : ''}`}>
            {t.title}
          </h1>
        </div>
        <div className="max-w-full overflow-x-auto">
          <RangePicker value={range} onChange={setRange} t={t} />
        </div>
      </div>

      {/* Row 1 — Long Revenue Trend Graph on top */}
      <Card padding="none" className="flex min-w-0 flex-col justify-between overflow-hidden">
        <SectionHead
          title={t.revenueTrend}
          meta={range === '12m' ? t.perMonth : t.perDay}
          action={
            <span className="hidden font-mono text-xs font-semibold text-muted sm:inline-block">
              {hasSales ? `${trend.length} ${range === '12m' ? 'months' : 'days'} recorded` : t.noSales}
            </span>
          }
        />
        <div className="relative mt-2 h-[280px] w-full px-2 pb-3 sm:h-[320px]">
          {loading ? (
            <div className="px-5 pb-4">
              <Skeleton className="h-[270px] w-full rounded-card" />
            </div>
          ) : (
            <div className="absolute inset-0 pb-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 12, right: 24, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID_STROKE }} tickLine={false} minTickGap={24} />
                  <YAxis width={44} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={compactPKR} />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={formatPKR} unitLabel={t.ordersLabel} />}
                    cursor={{ stroke: 'var(--color-rule-2)', strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#analyticsFill)"
                    activeDot={{ r: 5, fill: 'var(--color-pear)', stroke: 'var(--color-ink)', strokeWidth: 1.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-rule bg-surface px-5 py-3 sm:px-6">
          <span className="text-xs font-semibold text-muted">{range === '12m' ? t.perMonth : t.perDay}</span>
          <span className="text-xs font-semibold text-primary">{hasSales ? `${trend.length} days recorded` : t.noSales}</span>
        </div>
      </Card>

      {/* Row 2 — 3 in a row at bottom with equal sizes */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
        {/* Card 1: Total Sales & Key Metrics */}
        <Card padding="none" className="flex min-w-0 flex-col justify-between overflow-hidden">
          <div>
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t.revenue} · {t.rangeLabel[range]}
              </p>
              {loading ? (
                <Skeleton className="mt-2.5 h-12 w-48" />
              ) : (
                <p className="mt-1.5 font-display text-[clamp(2.15rem,2.5vw+1rem,3rem)] font-bold leading-none tracking-tight text-ink font-tabular">
                  <span className="mr-1.5 text-[0.45em] font-medium text-muted">{isUrdu ? 'روپے' : 'Rs.'}</span>
                  <CountUp to={summary?.revenue ?? 0} separator="," />
                </p>
              )}
              {!loading && (
                <div className="mt-2.5">
                  <GrowthChip value={summary?.growth?.revenue} t={t} />
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-rule px-5 py-4 sm:px-6">
              <Kpi label={t.orders} value={summary?.orders ?? 0} growth={summary?.growth?.orders} money={false} t={t} loading={loading} />
              <Kpi label={t.avgOrder} value={summary?.avgOrderValue ?? 0} growth={summary?.growth?.avgOrderValue} t={t} loading={loading} />
              <Kpi label={t.avgDaily} value={summary?.avgDailyRevenue ?? 0} t={t} loading={loading} />
              <Kpi label={t.unitsSold} value={summary?.units ?? 0} money={false} t={t} loading={loading} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-rule bg-surface px-5 py-3 sm:px-6">
            <span className="text-xs font-semibold text-muted">{t.bestDay}</span>
            <span className="text-right text-xs text-ink-2">
              {bestDay && !loading ? (
                <>
                  {formatKey(bestDay.date, locale, { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                  <span className="font-mono font-bold text-ink">{formatPKR(bestDay.revenue)}</span>
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </span>
          </div>
        </Card>

        {/* Card 2: Payment Methods Breakdown */}
        <Card padding="none" className="flex min-w-0 flex-col justify-between overflow-hidden">
          <div>
            <SectionHead title={t.paymentSplit} meta={t.rangeLabel[range]} />
            <div className="px-5 pb-5 pt-3 sm:px-6">
              {loading ? (
                <Skeleton className="mx-auto my-4 size-36 rounded-pill" />
              ) : data?.paymentMethods?.length ? (
                <>
                  <div className="relative mx-auto h-[170px] w-full max-w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.paymentMethods}
                          dataKey="revenue"
                          nameKey="method"
                          innerRadius="64%"
                          outerRadius="100%"
                          paddingAngle={2}
                          stroke="var(--color-surface)"
                          strokeWidth={2}
                        >
                          {data.paymentMethods.map((p) => (
                            <Cell key={p.method} fill={PAYMENT_COLORS[p.method] || 'var(--color-muted)'} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p className="text-[11px] font-medium text-muted">{t.revenue}</p>
                        <p className="font-display text-base font-bold tracking-tight text-ink font-tabular">{formatPKR(summary?.revenue ?? 0)}</p>
                      </div>
                    </div>
                  </div>
                  <ul className="mt-3.5 space-y-2">
                    {data.paymentMethods.map((p) => (
                      <li key={p.method} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-pill" style={{ background: PAYMENT_COLORS[p.method] || 'var(--color-muted)' }} />
                          <span className={`truncate font-medium text-ink ${isUrdu ? 'font-urdu' : ''}`}>{methodLabel(p.method)}</span>
                        </span>
                        <span className="whitespace-nowrap font-mono font-semibold text-ink-2">
                          {formatPKR(p.revenue)} · <span className="text-muted">{Math.round(p.share)}%</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="py-4 text-sm text-muted">{t.noSplit}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-rule bg-surface px-5 py-3 sm:px-6">
            <span className="text-xs font-semibold text-muted">{t.paymentSplit}</span>
            <span className="font-mono text-xs font-semibold text-ink-2">
              {data?.paymentMethods?.length || 0} {isUrdu ? 'چینلز' : 'methods'}
            </span>
          </div>
        </Card>

        {/* Card 3: Top Selling Products */}
        <Card padding="none" className="flex min-w-0 flex-col justify-between overflow-hidden">
          <div>
            <SectionHead title={t.topSelling} meta={`${t.byRevenue} · ${t.rangeLabel[range]}`} />
            <div className="px-5 pb-5 pt-3 sm:px-6">
              {loading ? (
                <div className="space-y-3 pt-2">
                  <Skeleton variant="tableRow" />
                  <Skeleton variant="tableRow" />
                  <Skeleton variant="tableRow" />
                </div>
              ) : data?.topProducts?.length ? (
                <ol className="divide-y divide-rule">
                  {data.topProducts.slice(0, 5).map((p, i) => (
                    <li key={p.name} className="py-2.5 first:pt-1 last:pb-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="grid size-5 shrink-0 place-items-center rounded-pill bg-paper-2 font-mono text-[11px] font-bold text-ink">
                            {i + 1}
                          </span>
                          <span className="truncate text-xs font-semibold text-ink" title={p.name}>{p.name}</span>
                        </span>
                        <span className="whitespace-nowrap font-mono text-xs font-bold text-ink">{formatPKR(p.revenue)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2.5 pl-7">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-paper-3">
                          <div
                            className="h-full rounded-pill transition-all"
                            style={{ width: `${Math.max(4, (p.revenue / topMax) * 100)}%`, background: i === 0 ? 'var(--color-primary)' : 'var(--color-chart-1)' }}
                          />
                        </div>
                        <span className="shrink-0 text-right font-mono text-[10.5px] text-muted">
                          {p.quantity} {t.sold} · {Math.round(p.share)}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-4 text-sm text-muted">{t.noSales}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-rule bg-surface px-5 py-3 sm:px-6">
            <span className="text-xs font-semibold text-muted">{t.topSelling}</span>
            <span className="font-mono text-xs font-semibold text-ink-2">
              {data?.topProducts?.length || 0} {isUrdu ? 'پروڈکٹس' : 'products'}
            </span>
          </div>
        </Card>
      </div>

      {!loading && !hasSales && <p className="px-1 text-center text-sm text-muted">{t.noSales}</p>}
    </div>
  );
}
