import { useMemo, useState, useCallback, useEffect } from 'react';
import {
 useReactTable,
 getCoreRowModel,
 getSortedRowModel,
} from '@tanstack/react-table';
import {
  Check,
  X,
  AlertCircle,
  ClipboardCheck,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useApprovals, useRespondApproval } from '../hooks/useApprovals';
import { useMerchantProfile, useUpdateMerchantProfile } from '../hooks/useMerchantSettings';
import { useUiStore } from '../lib/store';
import { getTranslations } from '../lib/translations';
import { formatDate, formatPKR } from '../lib/format';

export function ApprovalsPage() {
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';
  const t = getTranslations(language).approvalsPage;
  const tDash = getTranslations(language).dashboard;

  const { data: approvals, isLoading, error } = useApprovals();
  const respond = useRespondApproval();
  const [acting, setActing] = useState({ id: null, decision: null });

  // Merchant profile & approval settings
  const { data: profile, isLoading: isProfileLoading } = useMerchantProfile();
  const updateProfile = useUpdateMerchantProfile();

  const serverApproval = profile?.requireApprovalForHighValue ?? false;
  const serverThreshold = profile?.highValueThreshold ?? 10000;

  const [requireApproval, setRequireApproval] = useState(false);
  const [threshold, setThreshold] = useState(10000);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync state when profile loads
  useEffect(() => {
    if (profile) {
      setRequireApproval(profile.requireApprovalForHighValue ?? false);
      setThreshold(profile.highValueThreshold ?? 10000);
      setIsInitialized(true);
    }
  }, [profile]);

  const isThresholdDirty = isInitialized && Number(threshold) !== serverThreshold;

  // Instant toggle handler for the switch button
  const handleToggleApproval = async () => {
    const nextValue = !requireApproval;
    const currentThreshold = Number(threshold) || 10000;
    setRequireApproval(nextValue);

    try {
      await updateProfile.mutateAsync({
        requireApprovalForHighValue: nextValue,
        highValueThreshold: currentThreshold,
      });
      toast.success(
        nextValue
          ? (isUrdu
              ? `منظوری کی شرط فعال کر دی گئی (${formatPKR(currentThreshold)})`
              : `High-value approval turned ON (${formatPKR(currentThreshold)})`)
          : (isUrdu
              ? 'منظوری کی شرط بند کر دی گئی ہے'
              : 'High-value approval turned OFF')
      );
    } catch (err) {
      setRequireApproval(!nextValue);
      toast.error(err.message || (isUrdu ? 'سیٹنگ محفوظ کرنے میں ناکامی' : 'Failed to update setting'));
    }
  };

  // Save threshold amount
  const handleSaveThreshold = async () => {
    const numThreshold = Number(threshold);
    if (!numThreshold || numThreshold <= 0) {
      toast.error(isUrdu ? 'براہ کرم درست رقم درج کریں' : 'Please enter a valid threshold amount');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        requireApprovalForHighValue: requireApproval,
        highValueThreshold: numThreshold,
      });
      toast.success(
        isUrdu
          ? `منظوری کی حد ${formatPKR(numThreshold)} محفوظ ہو گئی`
          : `Threshold updated to ${formatPKR(numThreshold)}`
      );
    } catch (err) {
      toast.error(err.message || (isUrdu ? 'حد محفوظ کرنے میں ناکامی' : 'Failed to update threshold'));
    }
  };

  const handleRespond = useCallback(
    async (id, decision) => {
      setActing({ id, decision });
      try {
        await respond.mutateAsync({ id, decision });
        toast.success(
          decision === 'approved'
            ? (isUrdu ? 'آرڈر منظور ہو گیا' : 'Order approved')
            : (isUrdu ? 'آرڈر مسترد کر دیا گیا' : 'Order rejected')
        );
      } catch (err) {
        toast.error(err.message || (isUrdu ? 'فیصلہ ریکارڈ کرنے میں ناکامی' : 'Failed to respond'));
      } finally {
        setActing({ id: null, decision: null });
      }
    },
    [respond, isUrdu]
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: 'type',
        header: t.type,
        cell: ({ getValue }) => (
          <Badge variant="neutral">{getValue()}</Badge>
        ),
      },
      {
        accessorKey: 'summary',
        header: t.orderDetails,
        cell: ({ getValue }) => (
          <div className="min-w-0 py-1">
            <span className="text-sm font-medium text-ink block truncate max-w-[340px]" title={getValue()}>
              {getValue() || '-'}
            </span>
            <span className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-danger-ink">
              <AlertCircle className="size-3.5" />
              {t.overLimitNoticeDynamic
                ? t.overLimitNoticeDynamic.replace('{amount}', formatPKR(serverThreshold))
                : `Over your ${formatPKR(serverThreshold)} limit`}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: t.status,
        cell: ({ getValue }) => {
          const val = getValue();
          const label = tDash[val] || (val === 'pending_approval' ? tDash.pendingApproval : val);
          return <Badge variant={val} dot>{label}</Badge>;
        },
      },
      {
        accessorKey: 'createdAt',
        header: t.requested,
        cell: ({ getValue }) => (
          <span className="text-xs text-ink-secondary whitespace-nowrap">
            {formatDate(getValue(), language)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const id = row.original._id;
          const isActing = acting.id === id;
          const disabled = respond.isPending && acting.id !== null;

          return (
            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
              <Button
                variant="teal"
                size="sm"
                disabled={disabled}
                loading={isActing && acting.decision === 'approved'}
                leftIcon={<Check className="w-4 h-4" />}
                onClick={() => handleRespond(id, 'approved')}
              >
                {t.approve}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                loading={isActing && acting.decision === 'rejected'}
                leftIcon={<X className="w-4 h-4" />}
                onClick={() => handleRespond(id, 'rejected')}
              >
                {t.reject}
              </Button>
            </div>
          );
        },
      },
    ],
    [acting, respond.isPending, handleRespond, t, tDash, language, serverThreshold]
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
 <p className="label">{t.heldForYou}</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink">{t.approvals}</h1>
 </div>
 <Card padding="lg" className="text-center py-12">
 <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
 <h3 className="text-base font-medium text-ink">{t.approvalsFailedTitle}</h3>
 <p className="text-xs text-ink-mute mt-1">{error.message}</p>
 </Card>
 </div>
 );
 }

 const pendingCount = approvals?.length || 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label">{t.heldForYou}</p>
          <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)]">
            {t.approvals}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={serverApproval ? 'success' : 'neutral'}
            dot
            size="lg"
          >
            {serverApproval
              ? `${t.policyActiveNoticeHeader || 'Approvals ON'}: ${formatPKR(serverThreshold)}`
              : (t.policyDefaultNotice || 'Approvals OFF (Default)')}
          </Badge>
        </div>
      </div>

      {/* 4/8 — the rule & controls on the left, the queue on the right */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
          {/* Waiting on you metric card */}
          <div className={`rounded-card p-5 sm:p-6 ${pendingCount ? 'bg-coral-tint' : 'bg-paper-2'}`}>
            <div className="flex items-center justify-between">
              <p className="label">{t.waitingOnYou}</p>
              <Badge variant={serverApproval ? 'success' : 'neutral'} dot size="sm">
                {serverApproval ? (t.policyActiveBadge || 'ON') : (t.policyDisabledBadge || 'OFF')}
              </Badge>
            </div>
            <p className={`mt-2 font-display text-6xl font-semibold leading-none tracking-[-0.04em] font-tabular ${pendingCount ? 'text-danger-ink' : 'text-ink'}`}>
              {isLoading ? '—' : pendingCount}
            </p>
            <p className="mt-6 border-t border-current/15 pt-4 text-sm leading-relaxed text-ink-2">
              {serverApproval
                ? (t.policyActiveNotice
                    ? t.policyActiveNotice.replace('{amount}', formatPKR(serverThreshold))
                    : `Sales of ${formatPKR(serverThreshold)} or more wait here before any stock comes off the shelf. Rejecting one leaves your stock exactly as it was.`)
                : (t.policyDisabledNotice || 'Approval requirement is currently turned off by default. All sales are confirmed immediately without holding.')}
            </p>
          </div>

          {/* Approval Settings & Threshold Controls Card */}
          <Card padding="md" className="space-y-4 border border-rule-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Sliders className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-ink">
                    {t.policyTitle || 'Approval Policy'}
                  </h3>
                </div>
                <p className="text-[11px] text-muted">
                  {t.policySubtitle || 'High-value transaction holds'}
                </p>
              </div>

              {/* Toggle switch button */}
              <button
                type="button"
                role="switch"
                aria-checked={requireApproval}
                disabled={isProfileLoading || updateProfile.isPending}
                onClick={handleToggleApproval}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 disabled:cursor-not-allowed ${
                  requireApproval ? 'bg-primary' : 'bg-rule-2 dark:bg-paper-3'
                }`}
                title={requireApproval ? (isUrdu ? 'بند کرنے کے لیے دبائیں' : 'Click to turn OFF') : (isUrdu ? 'آن کرنے کے لیے دبائیں' : 'Click to turn ON')}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    requireApproval
                      ? (isUrdu ? '-translate-x-5' : 'translate-x-5')
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Status indicator banner */}
            <div className={`rounded-input border p-3 transition-colors ${
              requireApproval
                ? 'border-primary/30 bg-primary/5'
                : 'border-rule-2 bg-surface/50'
            }`}>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-ink-2">{t.statusLabel || 'Approval Status'}:</span>
                <span className={requireApproval ? 'text-primary font-semibold' : 'text-muted'}>
                  {requireApproval
                    ? (t.policyActiveBadge || 'ON (Required)')
                    : (t.policyDisabledBadge || 'OFF (Disabled)')}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {requireApproval
                  ? (t.toggleHelpOn || 'Sales exceeding your threshold wait here for your confirmation before stock is deducted.')
                  : (t.toggleHelpOff || 'Disabled by default. Sales are logged immediately without requiring approval.')}
              </p>
            </div>

            {/* Threshold controls */}
            <div className="space-y-2.5 pt-1 border-t border-rule">
              <div className="flex items-center justify-between">
                <label htmlFor="high-value-threshold-input" className="text-xs font-semibold text-ink-2">
                  {t.thresholdLabel || 'Approval Threshold (PKR)'}
                </label>
                <span className="font-mono text-xs font-medium text-ink">
                  {formatPKR(Number(threshold) || 0)}
                </span>
              </div>

              <Input
                id="high-value-threshold-input"
                type="number"
                min="500"
                step="500"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveThreshold();
                  }
                }}
                disabled={isProfileLoading || updateProfile.isPending}
                helperText={t.thresholdHelper || 'Orders at or above this amount will wait here for approval.'}
              />

              {/* Quick Amount Preset Chips */}
              <div className="space-y-1 pt-1">
                <p className="text-[11px] text-muted">{t.thresholdPresets || 'Quick amounts:'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {[5000, 10000, 25000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setThreshold(preset)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded-md border transition-colors ${
                        Number(threshold) === preset
                          ? 'bg-primary text-white border-primary font-semibold'
                          : 'bg-surface border-rule text-ink-2 hover:border-ink-mute'
                      }`}
                    >
                      {formatPKR(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant={isThresholdDirty ? 'teal' : 'secondary'}
                  size="sm"
                  className="w-full justify-center"
                  disabled={!isThresholdDirty || updateProfile.isPending}
                  loading={updateProfile.isPending}
                  leftIcon={<Check className="size-3.5" />}
                  onClick={handleSaveThreshold}
                >
                  {isThresholdDirty
                    ? (t.saveThreshold || 'Save Threshold')
                    : (t.saved || 'Saved')}
                </Button>
              </div>
            </div>
          </Card>
        </aside>

 <Card padding="none" className="min-w-0 overflow-hidden lg:col-span-8">
 <div className="px-5 pb-2 pt-5 sm:px-6">
 <h2 className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg">{t.queue}</h2>
 <p className="label mt-0.5">{t.newestFirst}</p>
 </div>
 {isLoading ? (
 <div className="space-y-2 px-5 pb-5 sm:px-6">
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 </div>
 ) : pendingCount === 0 ? (
 <EmptyState
 icon={<ClipboardCheck className="size-6" />}
 title={t.nothingToApprove}
 description={t.nothingToApproveDesc}
 />
 ) : (
 <div className="pb-2">
 <Table table={table} emptyText={t.nothingToApprove} />
 </div>
 )}
 </Card>
 </div>
 </div>
 );
}
