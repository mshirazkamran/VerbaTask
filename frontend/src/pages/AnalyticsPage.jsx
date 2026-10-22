import { useMemo, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
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
import { Modal } from '../components/ui/Modal';
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

function GrowthChip({ value, t, compact = false }) {
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
      {value}% {!compact && <span className="font-normal opacity-85">{t.vsPrevious}</span>}
    </Badge>
  );
}

function Kpi({ label, value, growth, t, loading, money = true, compact = true }) {
  return (
    <div className="min-w-0 py-2 sm:py-0">
      <p className="text-xs font-medium text-muted truncate">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-28" />
      ) : (
        <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink font-tabular sm:text-[1.65rem] truncate">
          {money ? formatPKR(value) : <CountUp to={value} />}
        </p>
      )}
      {growth !== undefined && !loading && (
        <div className="mt-1.5">
          <GrowthChip value={growth} t={t} compact={compact} />
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
  const [activeModal, setActiveModal] = useState(null); // 'metrics' | 'payments' | 'products' | null
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
              <Kpi label={t.orders} value={summary?.orders ?? 0} money={false} t={t} loading={loading} />
              <Kpi label={t.avgOrder} value={summary?.avgOrderValue ?? 0} t={t} loading={loading} />
              <Kpi label={t.avgDaily} value={summary?.avgDailyRevenue ?? 0} t={t} loading={loading} />
              <Kpi label={t.unitsSold} value={summary?.units ?? 0} money={false} t={t} loading={loading} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-rule bg-surface px-5 py-3 sm:px-6">
            <span className="text-xs text-muted truncate max-w-[50%]">
              {bestDay && !loading ? (
                <>
                  <span className="font-semibold text-ink-2">{t.bestDay}:</span>{' '}
                  <span className="font-mono text-ink">{formatPKR(bestDay.revenue)}</span>
                </>
              ) : (
                <span className="font-semibold text-muted">{t.bestDay}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setActiveModal('metrics')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-deep transition-colors cursor-pointer shrink-0"
            >
              <span>{t.showDetails || (isUrdu ? 'تفصیلات دیکھیں' : 'Show Details')}</span>
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </button>
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
                    {data.paymentMethods.slice(0, 3).map((p) => (
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
            <span className="font-mono text-xs font-semibold text-muted">
              {data?.paymentMethods?.length || 0} {isUrdu ? 'چینلز' : 'methods'}
            </span>
            <button
              type="button"
              onClick={() => setActiveModal('payments')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-deep transition-colors cursor-pointer shrink-0"
            >
              <span>{t.showDetails || (isUrdu ? 'تفصیلات دیکھیں' : 'Show Details')}</span>
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </button>
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
                  {data.topProducts.slice(0, 4).map((p, i) => (
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
            <span className="font-mono text-xs font-semibold text-muted">
              {data?.topProducts?.length || 0} {isUrdu ? 'پروڈکٹس' : 'products'}
            </span>
            <button
              type="button"
              onClick={() => setActiveModal('products')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-deep transition-colors cursor-pointer shrink-0"
            >
              <span>{t.showDetails || (isUrdu ? 'تفصیلات دیکھیں' : 'Show Details')}</span>
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </button>
          </div>
        </Card>
      </div>

      {/* Modal 1: Metrics & Sales Performance */}
      <Modal
        isOpen={activeModal === 'metrics'}
        onClose={() => setActiveModal(null)}
        title={isUrdu ? 'آمدنی اور سیلز کی مکمل رپورٹ' : 'Revenue & Sales Performance Details'}
        description={isUrdu ? `${t.rangeLabel[range]} کا مکمل مالیاتی جائزہ` : `Detailed sales and order analytics for ${t.rangeLabel[range]}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5 pt-1 text-left">
          {/* Revenue Highlight Card */}
          <div className="rounded-xl border border-rule bg-paper-2/60 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t.revenue} ({t.rangeLabel[range]})
                </span>
                <p className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink font-tabular">
                  {formatPKR(summary?.revenue ?? 0)}
                </p>
              </div>
              <div>
                <GrowthChip value={summary?.growth?.revenue} t={t} />
              </div>
            </div>
            {summary?.previousRevenue != null && (
              <p className="mt-2 text-xs text-muted">
                {isUrdu ? 'پچھلے عرصے کی آمدنی: ' : 'Previous period revenue: '}
                <span className="font-mono font-semibold text-ink-2">{formatPKR(summary.previousRevenue)}</span>
              </p>
            )}
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-rule bg-surface p-3.5">
              <span className="text-[11px] font-medium text-muted block">{t.orders}</span>
              <p className="mt-1 font-display text-xl font-bold text-ink font-tabular">
                {summary?.orders ?? 0}
              </p>
              {summary?.growth?.orders != null && (
                <div className="mt-1.5">
                  <GrowthChip value={summary?.growth?.orders} t={t} compact />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-rule bg-surface p-3.5">
              <span className="text-[11px] font-medium text-muted block">{t.avgOrder}</span>
              <p className="mt-1 font-display text-xl font-bold text-ink font-tabular">
                {formatPKR(summary?.avgOrderValue ?? 0)}
              </p>
              {summary?.growth?.avgOrderValue != null && (
                <div className="mt-1.5">
                  <GrowthChip value={summary?.growth?.avgOrderValue} t={t} compact />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-rule bg-surface p-3.5">
              <span className="text-[11px] font-medium text-muted block">{t.avgDaily}</span>
              <p className="mt-1 font-display text-xl font-bold text-ink font-tabular">
                {formatPKR(summary?.avgDailyRevenue ?? 0)}
              </p>
              <span className="text-[10px] text-muted mt-1 block">{isUrdu ? 'فی دن اوسط آمدن' : 'per day average'}</span>
            </div>

            <div className="rounded-lg border border-rule bg-surface p-3.5">
              <span className="text-[11px] font-medium text-muted block">{t.unitsSold}</span>
              <p className="mt-1 font-display text-xl font-bold text-ink font-tabular">
                {summary?.units ?? 0}
              </p>
              <span className="text-[10px] text-muted mt-1 block">{isUrdu ? 'فروخت شدہ یونٹس' : 'units sold'}</span>
            </div>

            <div className="rounded-lg border border-rule bg-surface p-3.5">
              <span className="text-[11px] font-medium text-muted block">{t.weeklyAvg}</span>
              <p className="mt-1 font-display text-xl font-bold text-ink font-tabular">
                {formatPKR(data?.weeklyAverage ?? 0)}
              </p>
              <span className="text-[10px] text-muted mt-1 block">{t.last12Weeks}</span>
            </div>

            <div className="rounded-lg border border-rule bg-surface p-3.5">
              <span className="text-[11px] font-medium text-muted block">{t.monthlyAvg}</span>
              <p className="mt-1 font-display text-xl font-bold text-ink font-tabular">
                {formatPKR(data?.monthlyAverage ?? 0)}
              </p>
              <span className="text-[10px] text-muted mt-1 block">{t.last12Months}</span>
            </div>
          </div>

          {/* Best Day Card */}
          {bestDay && (
            <div className="rounded-lg border border-rule bg-surface p-4 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-ink block">{t.bestDay}</span>
                <span className="text-muted text-[11px]">
                  {formatKey(bestDay.date, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-base font-bold text-primary block">
                  {formatPKR(bestDay.revenue)}
                </span>
                <span className="text-muted text-[11px] font-mono">
                  {bestDay.orders} {t.ordersLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 2: Payment Methods Breakdown */}
      <Modal
        isOpen={activeModal === 'payments'}
        onClose={() => setActiveModal(null)}
        title={isUrdu ? 'ادائیگی کے ذرائع کا تفصیلی جائزہ' : 'Payment Methods Breakdown Details'}
        description={isUrdu ? `${t.rangeLabel[range]} میں ہر چینل کے ذریعے موصول ہونے والی رقم` : `Revenue volume and order share across all payment channels for ${t.rangeLabel[range]}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5 pt-1 text-left">
          <div className="flex items-center justify-between rounded-xl border border-rule bg-paper-2/60 p-4">
            <div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">{t.revenue}</span>
              <p className="font-display text-2xl font-bold text-ink font-tabular">{formatPKR(summary?.revenue ?? 0)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">{isUrdu ? 'فعال ذرائع' : 'Channels'}</span>
              <p className="font-mono text-2xl font-bold text-ink">{data?.paymentMethods?.length || 0}</p>
            </div>
          </div>

          {data?.paymentMethods?.length ? (
            <div className="rounded-xl border border-rule bg-surface overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-rule bg-paper-2/50 font-semibold text-muted uppercase tracking-wider text-[10.5px]">
                  <tr>
                    <th className="px-4 py-3">{isUrdu ? 'طریقہ' : 'Method'}</th>
                    <th className="px-4 py-3 text-right">{isUrdu ? 'آمدنی' : 'Revenue'}</th>
                    <th className="px-4 py-3 text-right">{isUrdu ? 'آرڈرز' : 'Orders'}</th>
                    <th className="px-4 py-3 text-right">{isUrdu ? 'حصہ' : 'Share'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule font-medium">
                  {data.paymentMethods.map((p) => (
                    <tr key={p.method} className="hover:bg-paper-2/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="size-3 shrink-0 rounded-pill"
                            style={{ background: PAYMENT_COLORS[p.method] || 'var(--color-muted)' }}
                          />
                          <span className={`font-semibold text-ink text-sm ${isUrdu ? 'font-urdu' : ''}`}>
                            {methodLabel(p.method)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-ink">
                        {formatPKR(p.revenue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-ink-2">
                        {p.orders || 0}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-pill bg-paper-3 overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-pill"
                              style={{
                                width: `${Math.max(4, p.share)}%`,
                                background: PAYMENT_COLORS[p.method] || 'var(--color-muted)',
                              }}
                            />
                          </div>
                          <span className="font-mono font-bold text-primary text-xs">
                            {Math.round(p.share)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">{t.noSplit}</p>
          )}
        </div>
      </Modal>

      {/* Modal 3: Top Selling Products */}
      <Modal
        isOpen={activeModal === 'products'}
        onClose={() => setActiveModal(null)}
        title={isUrdu ? 'سب سے زیادہ بکنے والی اشیاء کا تجزیہ' : 'Top Selling Products Detailed Ranking'}
        description={isUrdu ? `${t.rangeLabel[range]} میں سب سے زیادہ فروخت اور آمدنی دینے والے پروڈکٹس` : `Ranked product catalog performance by revenue for ${t.rangeLabel[range]}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5 pt-1 text-left">
          <div className="flex items-center justify-between rounded-xl border border-rule bg-paper-2/60 p-4">
            <div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">{isUrdu ? 'سب سے اوپر آئٹم' : 'Top Product'}</span>
              <p className="font-display text-lg font-bold text-ink truncate max-w-xs">{data?.topProducts?.[0]?.name || '—'}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">{isUrdu ? 'درجہ بندی' : 'Products Listed'}</span>
              <p className="font-mono text-2xl font-bold text-ink">{data?.topProducts?.length || 0}</p>
            </div>
          </div>

          {data?.topProducts?.length ? (
            <div className="rounded-xl border border-rule bg-surface overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-rule bg-paper-2/50 font-semibold text-muted uppercase tracking-wider text-[10.5px]">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">{isUrdu ? 'پروڈکٹ' : 'Product'}</th>
                    <th className="px-4 py-3 text-right">{isUrdu ? 'تعداد' : 'Units Sold'}</th>
                    <th className="px-4 py-3 text-right">{isUrdu ? 'کل رقم' : 'Revenue'}</th>
                    <th className="px-4 py-3 text-right">{isUrdu ? 'حصہ' : 'Share'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule font-medium">
                  {data.topProducts.map((p, i) => (
                    <tr key={p.name} className="hover:bg-paper-2/40 transition-colors">
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-grid size-5 place-items-center rounded-pill font-mono text-[11px] font-bold ${
                          i === 0 ? 'bg-primary text-white' : 'bg-paper-2 text-ink'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-ink text-sm block truncate max-w-[200px] sm:max-w-xs" title={p.name}>
                          {p.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-ink-2">
                        {p.quantity} {t.sold}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-ink">
                        {formatPKR(p.revenue)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-pill bg-paper-3 overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-pill"
                              style={{
                                width: `${Math.max(4, (p.revenue / (data.topProducts[0]?.revenue || 1)) * 100)}%`,
                                background: i === 0 ? 'var(--color-primary)' : 'var(--color-chart-1)',
                              }}
                            />
                          </div>
                          <span className="font-mono font-bold text-primary text-xs">
                            {Math.round(p.share)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">{t.noSales}</p>
          )}
        </div>
      </Modal>

      {!loading && !hasSales && <p className="px-1 text-center text-sm text-muted">{t.noSales}</p>}
    </div>
  );
}
