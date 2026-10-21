import { useMemo, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
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
  cash: 'var(--color-chart-1)',
  easypaisa: 'var(--color-chart-2)',
  jazzcash: 'var(--color-chart-3)',
  bank: 'var(--color-chart-4)',
  udhaar: 'var(--color-ink-2)',
};

const AXIS_TICK = { fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'var(--font-label)' };
const GRID_STROKE = 'var(--color-rule)';

const compactPKR = (v) => (v >= 1_000_000 ? `${+(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v);

/** Day keys are Pakistan-local "YYYY-MM-DD" (or "YYYY-MM"); format them without timezone drift. */
function formatKey(key, locale, opts) {
  const full = key.length === 7 ? `${key}-01` : key;
  return new Date(`${full}T00:00:00Z`).toLocaleDateString(locale, { timeZone: 'UTC', ...opts });
}

function formatHour(h, isUrdu) {
  const h12 = h % 12 || 12;
  return isUrdu ? `${h12} ${h < 12 ? 'صبح' : 'شام'}` : `${h12} ${h < 12 ? 'AM' : 'PM'}`;
}

function SectionHead({ title, meta, action }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
      <div className="min-w-0">
        <h2 className="truncate font-display text-base font-semibold tracking-tight text-ink sm:text-lg">{title}</h2>
        {meta && <p className="label mt-0.5">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

function ChartTooltip({ active, payload, label, valueFormatter, unitLabel }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-input border border-rule bg-surface px-3 py-2 shadow-[var(--shadow-pop)]">
      <p className="label">{point.tooltipLabel || label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-ink">{valueFormatter(payload[0].value)}</p>
      {unitLabel && point.orders != null && (
        <p className="font-mono text-[11px] text-muted">
          {point.orders} {unitLabel}
        </p>
      )}
    </div>
  );
}

/** Percent change vs the previous period. `null` means there was nothing to compare against. */
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
      <Icon className="size-3" /> {up ? '+' : ''}
      {value}% <span className="font-normal opacity-80">{t.vsPrevious}</span>
    </Badge>
  );
}

function Kpi({ label, value, growth, t, loading, money = true }) {
  return (
    <div className="min-w-0 py-4 first:pt-0 last:pb-0 sm:py-0">
      <p className="label">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-28" />
      ) : (
        <p className="mt-1.5 font-display text-2xl font-semibold leading-none tracking-tight text-ink font-tabular sm:text-[1.75rem]">
          {money ? formatPKR(value) : <CountUp to={value} />}
        </p>
      )}
      {growth !== undefined && !loading && (
        <div className="mt-2">
          <GrowthChip value={growth} t={t} />
        </div>
      )}
    </div>
  );
}

function RangePicker({ value, onChange, t }) {
  return (
    <div role="tablist" aria-label={t.title} className="inline-flex gap-1 rounded-pill bg-paper-2 p-1">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={value === r}
          onClick={() => onChange(r)}
          className={`h-9 min-w-12 whitespace-nowrap rounded-pill px-3.5 font-mono text-xs font-semibold uppercase tracking-wide transition-colors duration-150 ${
            value === r ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-3 hover:text-ink'
          }`}
        >
          {t.range[r]}
        </button>
      ))}
    </div>
  );
}

/** Bars for a series (weeks or months) with a dashed average line; the in-progress period is highlighted. */
function AverageBars({ data, average, avgLabel, loading, height = 200 }) {
  if (loading) return <Skeleton className="h-[200px] w-full rounded-card" />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 14, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID_STROKE }} tickLine={false} interval="preserveStartEnd" />
          <YAxis width={40} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={compactPKR} />
          <Tooltip content={<ChartTooltip valueFormatter={formatPKR} />} cursor={{ fill: 'var(--color-paper-3)', opacity: 0.6 }} />
          {average > 0 && (
            <ReferenceLine
              y={average}
              stroke="var(--color-ink-2)"
              strokeDasharray="4 4"
              label={{ value: avgLabel, position: 'insideTopLeft', fill: 'var(--color-ink-2)', fontSize: 10, fontFamily: 'var(--font-label)' }}
            />
          )}
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((d, i) => (
              <Cell key={d.date} fill={i === data.length - 1 ? 'var(--color-pear)' : 'var(--color-chart-1)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AverageCard({ title, meta, value, caption, loading, children, className = '' }) {
  return (
    <Card padding="none" className={`min-w-0 overflow-hidden ${className}`}>
      <SectionHead title={title} meta={meta} />
      <div className="px-5 pt-3 sm:px-6">
        {loading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <p className="font-display text-[clamp(1.75rem,2.4vw+1rem,2.5rem)] font-semibold leading-none tracking-[-0.03em] text-ink font-tabular">
            <span className="hl">{formatPKR(value)}</span>
          </p>
        )}
        {caption && !loading && <p className="mt-2 text-xs text-muted">{caption}</p>}
      </div>
      <div className="mt-4 px-2 pb-3 sm:px-3">{children}</div>
    </Card>
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

  const weekly = useMemo(
    () =>
      (data?.weekly || []).map((p) => ({
        ...p,
        label: formatKey(p.date, locale, { day: 'numeric', month: 'short' }),
        tooltipLabel: `${isUrdu ? '' : 'Week of '}${formatKey(p.date, locale, { day: 'numeric', month: 'short' })}`,
      })),
    [data, locale, isUrdu]
  );

  const monthly = useMemo(
    () =>
      (data?.monthly || []).map((p) => ({
        ...p,
        label: formatKey(p.date, locale, { month: 'short' }),
        tooltipLabel: formatKey(p.date, locale, { month: 'long', year: 'numeric' }),
      })),
    [data, locale]
  );

  const hours = useMemo(
    () => (data?.byHour || []).map((h) => ({ ...h, label: String(h.hour).padStart(2, '0'), tooltipLabel: formatHour(h.hour, isUrdu) })),
    [data, isUrdu]
  );

  const weekdays = useMemo(
    () => (data?.byWeekday || []).map((d) => ({ ...d, label: t.weekdaysShort[d.day], tooltipLabel: t.weekdays[d.day] })),
    [data, t]
  );

  const methodLabel = (m) => t[m] || m.charAt(0).toUpperCase() + m.slice(1);
  const topMax = data?.topProducts?.[0]?.revenue || 1;
  const peakHour = data?.peak?.hour;
  const peakDay = data?.peak?.weekday;
  const bestDay = summary?.bestDay;

  if (error && !data) {
    return (
      <div className="space-y-6">
        <h1 className="display text-[length:var(--fs-xl)] text-ink">{t.title}</h1>
        <Card padding="lg" className="py-14 text-center">
          <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
          <h2 className="font-display text-lg font-semibold text-ink">{t.errorTitle}</h2>
          <p className="mt-1 text-sm text-muted">{t.errorDesc}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="label">{t.eyebrow}</p>
          <h1 className={`display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)] ${isUrdu ? 'font-urdu' : ''}`}>{t.title}</h1>
        </div>
        <div className="max-w-full overflow-x-auto">
          <RangePicker value={range} onChange={setRange} t={t} />
        </div>
      </div>

      {/* Row 1 · 5/7 — the headline number with its comparisons, beside the trend */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <Card padding="none" className="overflow-hidden lg:col-span-5">
          <div className="px-5 pt-5 sm:px-7 sm:pt-7">
            <p className="label">
              {t.revenue} · {t.rangeLabel[range]}
            </p>
            {loading ? (
              <Skeleton className="mt-3 h-14 w-56" />
            ) : (
              <p className="mt-2 font-display text-[clamp(2.5rem,4vw+1rem,4rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-ink font-tabular">
                <span className="mr-2 align-top text-[0.4em] font-medium text-muted">{isUrdu ? 'روپے' : 'Rs.'}</span>
                <span className="hl">
                  <CountUp to={summary?.revenue ?? 0} separator="," />
                </span>
              </p>
            )}
            {!loading && (
              <div className="mt-3">
                <GrowthChip value={summary?.growth?.revenue} t={t} />
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-rule px-5 py-5 sm:px-7">
            <Kpi label={t.orders} value={summary?.orders ?? 0} growth={summary?.growth?.orders} money={false} t={t} loading={loading} />
            <Kpi label={t.avgOrder} value={summary?.avgOrderValue ?? 0} growth={summary?.growth?.avgOrderValue} t={t} loading={loading} />
            <Kpi label={t.avgDaily} value={summary?.avgDailyRevenue ?? 0} t={t} loading={loading} />
            <Kpi label={t.unitsSold} value={summary?.units ?? 0} money={false} t={t} loading={loading} />
          </div>

          {bestDay && !loading && (
            <div className="flex items-center justify-between gap-3 border-t border-rule bg-paper-2 px-5 py-3.5 sm:px-7">
              <span className="label">{t.bestDay}</span>
              <span className="text-right text-sm text-ink-2">
                {formatKey(bestDay.date, locale, { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                <span className="font-mono font-semibold text-ink">{formatPKR(bestDay.revenue)}</span>
              </span>
            </div>
          )}
        </Card>

        <Card padding="none" className="min-w-0 overflow-hidden lg:col-span-7">
          <SectionHead title={t.revenueTrend} meta={range === '12m' ? t.perMonth : t.perDay} />
          <div className="mt-4 h-[260px] px-1 pb-3 sm:h-[320px] lg:h-[calc(100%-4.5rem)] lg:min-h-[300px]">
            {loading ? (
              <div className="px-5 pb-4">
                <Skeleton className="h-[250px] w-full rounded-card" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 20, left: 8, bottom: 0 }}>
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
                    strokeWidth={2.25}
                    fill="url(#analyticsFill)"
                    activeDot={{ r: 5, fill: 'var(--color-pear)', stroke: 'var(--color-ink)', strokeWidth: 1.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2 · 6/6 — weekly and monthly averages, each against its own history */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <AverageCard
          className="lg:col-span-6"
          title={t.weeklyAvg}
          meta={t.last12Weeks}
          value={data?.averages?.weekly ?? 0}
          caption={data?.averages?.basisDays ? `${t.basedOn} ${data.averages.basisDays} ${t.daysOfSales}` : null}
          loading={loading}
        >
          <AverageBars data={weekly} average={data?.averages?.weekly ?? 0} avgLabel={t.average} loading={loading} />
        </AverageCard>
        <AverageCard
          className="lg:col-span-6"
          title={t.monthlyAvg}
          meta={t.last12Months}
          value={data?.averages?.monthly ?? 0}
          caption={data?.averages?.basisDays ? `${t.basedOn} ${data.averages.basisDays} ${t.daysOfSales}` : null}
          loading={loading}
        >
          <AverageBars data={monthly} average={data?.averages?.monthly ?? 0} avgLabel={t.average} loading={loading} />
        </AverageCard>
      </div>

      {/* Row 3 · 4/8 — how the money arrived, beside what earned it */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <Card padding="none" className="min-w-0 lg:col-span-4">
          <SectionHead title={t.paymentSplit} meta={t.rangeLabel[range]} />
          <div className="px-5 pb-5 pt-4 sm:px-6">
            {loading ? (
              <Skeleton className="mx-auto size-40 rounded-pill" />
            ) : data?.paymentMethods?.length ? (
              <>
                <div className="relative mx-auto h-[190px] w-full max-w-[220px]">
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
                      <p className="label">{t.revenue}</p>
                      <p className="font-display text-lg font-semibold tracking-tight text-ink font-tabular">{formatPKR(summary?.revenue ?? 0)}</p>
                    </div>
                  </div>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {data.paymentMethods.map((p) => (
                    <li key={p.method} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="size-2.5 shrink-0 rounded-pill" style={{ background: PAYMENT_COLORS[p.method] || 'var(--color-muted)' }} />
                        <span className={`truncate text-sm text-ink-2 ${isUrdu ? 'font-urdu' : ''}`}>{methodLabel(p.method)}</span>
                      </span>
                      <span className="whitespace-nowrap font-mono text-xs text-muted">
                        {formatPKR(p.revenue)} · {Math.round(p.share)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted">{t.noSplit}</p>
            )}
          </div>
        </Card>

        <Card padding="none" className="min-w-0 lg:col-span-8">
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
                {data.topProducts.map((p, i) => (
                  <li key={p.name} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-baseline gap-3">
                        <span className="w-5 shrink-0 font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
                        <span className="truncate text-sm font-medium text-ink">{p.name}</span>
                      </span>
                      <span className="whitespace-nowrap font-mono text-sm font-semibold text-ink">{formatPKR(p.revenue)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 pl-8">
                      <div className="h-2 flex-1 overflow-hidden rounded-pill bg-paper-3">
                        <div
                          className="h-full rounded-pill"
                          style={{ width: `${Math.max(3, (p.revenue / topMax) * 100)}%`, background: i === 0 ? 'var(--color-pear)' : 'var(--color-chart-1)' }}
                        />
                      </div>
                      <span className="w-40 shrink-0 text-right font-mono text-[11px] text-muted">
                        {p.quantity} {t.sold} · {Math.round(p.share)}% {t.ofRevenue}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="pt-2 text-sm text-muted">{t.noSales}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Row 4 · 7/5 — when the shop is busy */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <Card padding="none" className="min-w-0 overflow-hidden lg:col-span-7">
          <SectionHead
            title={t.busiestHours}
            meta={peakHour != null ? `${t.peak}: ${formatHour(peakHour, isUrdu)}` : t.rangeLabel[range]}
          />
          <div className="mt-4 h-[220px] px-2 pb-3 sm:px-3">
            {loading ? (
              <Skeleton className="h-[200px] w-full rounded-card" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hours} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID_STROKE }} tickLine={false} interval={2} />
                  <YAxis width={32} allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(v) => `${v} ${t.ordersLabel}`} />}
                    cursor={{ fill: 'var(--color-paper-3)', opacity: 0.6 }}
                  />
                  <Bar dataKey="orders" radius={[3, 3, 0, 0]} maxBarSize={20}>
                    {hours.map((h) => (
                      <Cell key={h.hour} fill={h.hour === peakHour ? 'var(--color-pear)' : 'var(--color-chart-1)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card padding="none" className="min-w-0 overflow-hidden lg:col-span-5">
          <SectionHead title={t.busiestDays} meta={peakDay != null ? `${t.peak}: ${t.weekdays[peakDay]}` : t.rangeLabel[range]} />
          <div className="mt-4 h-[220px] px-2 pb-3 sm:px-3">
            {loading ? (
              <Skeleton className="h-[200px] w-full rounded-card" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdays} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID_STROKE }} tickLine={false} interval={0} />
                  <YAxis width={32} allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(v) => `${v} ${t.ordersLabel}`} />}
                    cursor={{ fill: 'var(--color-paper-3)', opacity: 0.6 }}
                  />
                  <Bar dataKey="orders" radius={[3, 3, 0, 0]} maxBarSize={32}>
                    {weekdays.map((d) => (
                      <Cell key={d.day} fill={d.day === peakDay ? 'var(--color-pear)' : 'var(--color-chart-1)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {!loading && !hasSales && <p className="px-1 text-center text-sm text-muted">{t.noSales}</p>}
    </div>
  );
}
