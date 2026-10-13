import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Plus,
  Trash2,
  AlertCircle,
  Bell,
  Zap,
  Info,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
} from '../hooks/useWorkflows';
import { formatDate } from '../lib/format';
import { useUiStore } from '../lib/store';
import { getTranslations } from '../lib/translations';

const emptyWorkflow = {
  trigger: 'threshold',
  item: '',
  value: '',
  keyword: '',
  frequency: 'daily',
  time: '21:00',
  dayOfWeek: '1',
  actionType: 'notify',
  reportType: 'sales',
  actionMessage: '',
};

const selectClass =
  'h-10 px-3 text-[15px] bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

const DAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ur: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'],
};

// Must stay in sync with REPORT_TYPES in backend/src/workflows/workflow.rules.js.
const REPORTS = [
  ['sales', "Today's sales", 'آج کی سیلز'],
  ['inventory', 'Inventory', 'انوینٹری'],
  ['low_stock', 'Low stock', 'کم اسٹاک'],
  ['top_selling', 'Top selling', 'زیادہ بکنے والی اشیاء'],
  ['expiring', 'Expiring items', 'ایکسپائری'],
];

function WorkflowForm({ initial = emptyWorkflow, onSubmit, onCancel, submitLabel, loading, isUrdu, t }) {
  const [form, setForm] = useState(initial);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let condition = {};
    if (form.trigger === 'threshold') {
      condition = { item: form.item.trim() || null, operator: '<', value: Number(form.value) };
    } else if (form.trigger === 'message') {
      condition = { keywords: [form.keyword] };
    } else if (form.trigger === 'schedule') {
      condition = {
        frequency: form.frequency,
        time: form.time,
        ...(form.frequency === 'weekly' && { dayOfWeek: Number(form.dayOfWeek) }),
      };
    }

    onSubmit({
      trigger: form.trigger,
      condition,
      action:
        form.actionType === 'send_report'
          ? { type: 'send_report', reportType: form.reportType }
          : { type: 'notify', message: form.actionMessage || undefined },
      active: true,
    });
  };

  // A stock alert composes its own text; other triggers need a message to send.
  const messageRequired = form.actionType === 'notify' && form.trigger !== 'threshold';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-secondary">{t.trigger}</label>
          <select name="trigger" value={form.trigger} onChange={handleChange} className={selectClass}>
            <option value="threshold">{t.stockThreshold}</option>
            <option value="message">{t.incomingMessage}</option>
            <option value="schedule">{t.recurringSchedule}</option>
          </select>
        </div>

        {form.trigger === 'threshold' && (
          <Input
            label={t.thresholdQtyLabel}
            name="value"
            type="number"
            min="0"
            value={form.value}
            onChange={handleChange}
            placeholder={isUrdu ? 'مثلاً: 5' : 'e.g. 5'}
            required
          />
        )}

        {form.trigger === 'message' && (
          <Input
            label={t.triggerKeywordLabel}
            name="keyword"
            type="text"
            maxLength={40}
            value={form.keyword}
            onChange={handleChange}
            placeholder={isUrdu ? 'مثلاً: end' : 'e.g. end'}
            required
          />
        )}

        {form.trigger === 'schedule' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-secondary">{t.frequencyLabel}</label>
            <select name="frequency" value={form.frequency} onChange={handleChange} className={selectClass}>
              <option value="daily">{t.daily}</option>
              <option value="weekly">{t.weekly}</option>
            </select>
          </div>
        )}
      </div>

      {form.trigger === 'threshold' && (
        <Input
          label={isUrdu ? 'چیز (ہر چیز کے لیے خالی چھوڑیں)' : 'Item (leave empty for any item)'}
          name="item"
          type="text"
          value={form.item}
          onChange={handleChange}
          placeholder={isUrdu ? 'مثلاً: چینی' : 'e.g. Sugar'}
        />
      )}

      {form.trigger === 'schedule' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={isUrdu ? 'وقت (پاکستان)' : 'Time (Pakistan)'}
            name="time"
            type="time"
            value={form.time}
            onChange={handleChange}
            required
          />
          {form.frequency === 'weekly' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-secondary">{isUrdu ? 'دن' : 'Day'}</label>
              <select name="dayOfWeek" value={form.dayOfWeek} onChange={handleChange} className={selectClass}>
                {DAYS[isUrdu ? 'ur' : 'en'].map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-medium text-ink-secondary">{t.actionLabel}</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['notify', Bell, isUrdu ? 'الرٹ بھیجیں' : 'Send alert'],
            ['send_report', FileText, isUrdu ? 'رپورٹ بھیجیں' : 'Send report'],
          ].map(([value, Icon, label]) => (
            <label
              key={value}
              className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-sm border px-3 text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-primary/20 ${
                form.actionType === value
                  ? 'border-primary bg-primary-tint text-primary-deep dark:text-primary'
                  : 'border-hairline-input bg-canvas text-ink-2 hover:bg-canvas-soft'
              }`}
            >
              <input
                type="radio"
                name="actionType"
                value={value}
                checked={form.actionType === value}
                onChange={handleChange}
                className="sr-only"
              />
              <Icon className="size-4 shrink-0" />
              {label}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-mute">{isUrdu ? 'واٹس ایپ پر بھیجا جائے گا' : 'Sent to you on WhatsApp'}</p>
      </fieldset>

      {form.actionType === 'send_report' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-secondary">{isUrdu ? 'کون سی رپورٹ' : 'Which report'}</label>
          <select name="reportType" value={form.reportType} onChange={handleChange} className={selectClass}>
            {REPORTS.map(([value, en, ur]) => (
              <option key={value} value={value}>{isUrdu ? ur : en}</option>
            ))}
          </select>
        </div>
      )}

      {form.actionType === 'notify' && (
        <Input
          label={messageRequired ? (isUrdu ? 'بھیجنے والا پیغام' : 'Message to send') : t.customNotifMessage}
          name="actionMessage"
          type="text"
          maxLength={500}
          value={form.actionMessage}
          onChange={handleChange}
          placeholder={isUrdu ? 'مثلاً: دکان بند کرنے کا وقت!' : 'e.g. Time to close the shop!'}
          required={messageRequired}
        />
      )}

      <div className="p-3 mt-4 bg-canvas-soft border border-hairline rounded-sm flex items-start gap-2 text-xs text-ink-mute">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span>
          {form.actionType === 'send_report'
            ? isUrdu ? 'منتخب رپورٹ آپ کو واٹس ایپ پر PDF میں بھیجی جائے گی۔' : 'The selected report is sent to you on WhatsApp as a PDF.'
            : form.trigger === 'threshold'
            ? t.thresholdNotice
            : t.messageNotice}
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          {t.cancel}
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function WorkflowsPage() {
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';
  const t = getTranslations(language).workflowsPage;

  const { data: workflows, isLoading, error } = useWorkflows();
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();

  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleCreate = async (payload) => {
    try {
      await createWorkflow.mutateAsync(payload);
      toast.success(isUrdu ? 'نیا ورک فلو کامیابی سے بن گیا!' : 'Workflow created');
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || (isUrdu ? 'ورک فلو بنانے میں ناکامی' : 'Failed to create workflow'));
    }
  };

  const handleToggle = useCallback(
    async (workflow) => {
      try {
        await updateWorkflow.mutateAsync({ id: workflow._id, active: !workflow.active });
        toast.success(
          workflow.active
            ? isUrdu ? 'ورک فلو روک دیا گیا' : 'Workflow paused'
            : isUrdu ? 'ورک فلو فعال ہو گیا' : 'Workflow activated'
        );
      } catch (err) {
        toast.error(err.message || (isUrdu ? 'تبدیلی محفوظ نہ ہو سکی' : 'Failed to update workflow'));
      }
    },
    [updateWorkflow, isUrdu]
  );

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteWorkflow.mutateAsync(deletingId);
      toast.success(isUrdu ? 'ورک فلو حذف کر دیا گیا' : 'Workflow deleted');
      setDeletingId(null);
    } catch (err) {
      toast.error(err.message || (isUrdu ? 'حذف کرنے میں ناکامی' : 'Failed to delete workflow'));
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'trigger',
        header: t.trigger,
        cell: ({ getValue }) => {
          const val = getValue();
          const triggerLabel =
            val === 'threshold'
              ? t.stockThreshold
              : val === 'message'
              ? t.incomingMessage
              : val === 'schedule'
              ? t.recurringSchedule
              : val;
          return (
            <div className="flex items-center gap-2">
              <Zap className="size-4 shrink-0 text-warn-ink" />
              <span className="text-sm font-medium capitalize text-ink">{triggerLabel}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'condition',
        header: t.condition,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-ink-2">{row.original.triggerText || '-'}</span>
        ),
      },
      {
        accessorKey: 'action',
        header: t.action,
        cell: ({ row }) => {
          // valid=false: saved before validation existed (e.g. an invented action) — it never runs.
          if (row.original.valid === false) {
            return (
              <Badge variant="danger" dot>
                {isUrdu ? 'غیر معاون — حذف کریں' : 'Unsupported — delete'}
              </Badge>
            );
          }
          const label = row.original.actionText || '-';
          return (
            <div className="flex items-center gap-2 max-w-[260px]">
              <Bell className="size-4 shrink-0 text-sky-ink" />
              <span className="truncate text-sm font-medium text-ink" title={label}>
                {label}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'active',
        header: t.status,
        cell: ({ getValue }) => (
          <Badge variant={getValue() ? 'success' : 'neutral'} dot>
            {getValue() ? (isUrdu ? 'فعال' : 'Active') : (isUrdu ? 'روکا گیا' : 'Paused')}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t.created,
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap font-mono text-xs text-muted">
            {formatDate(getValue(), language)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={row.original.active ? '' : '!text-success-ink'}
              onClick={() => handleToggle(row.original)}
              disabled={updateWorkflow.isPending}
            >
              {row.original.active ? t.pause : t.activate}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="!text-danger-ink hover:!bg-coral-tint"
              leftIcon={<Trash2 className="size-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(row.original._id);
              }}
            >
              {t.delete}
            </Button>
          </div>
        ),
      },
    ],
    [t, isUrdu, language, updateWorkflow.isPending, handleToggle]
  );

  const table = useReactTable({
    data: workflows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: 'createdAt', desc: true }] },
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="label">{t.automations}</p>
            <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink">{t.workflows}</h1>
          </div>
        </div>
        <Card padding="lg" className="text-center py-12">
          <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
          <h3 className="text-base font-medium text-ink">{t.workflowsFailedTitle}</h3>
          <p className="text-xs text-ink-mute mt-1">{error.message}</p>
        </Card>
      </div>
    );
  }

  const activeCount = workflows?.filter((w) => w.active)?.length || 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label">{t.automations}</p>
          <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)]">
            {t.workflows}
          </h1>
        </div>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalOpen(true)}>
          {t.newWorkflow}
        </Button>
      </div>

      {/* 8/4 — rules on the left, the explainer rides the right (mirrors Approvals) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <Card padding="none" className="min-w-0 overflow-hidden lg:col-span-8">
          <div className="px-5 pb-2 pt-5 sm:px-6">
            <h2 className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg">{t.rules}</h2>
            <p className="label mt-0.5">
              {isUrdu ? `کل ${workflows?.length || 0}` : `${workflows?.length || 0} ${t.total}`}
            </p>
          </div>
          {isLoading ? (
            <div className="space-y-2 px-5 pb-5 sm:px-6">
              <Skeleton variant="tableRow" />
              <Skeleton variant="tableRow" />
              <Skeleton variant="tableRow" />
            </div>
          ) : workflows?.length === 0 ? (
            <EmptyState
              icon={<Zap className="size-6" />}
              title={t.noWorkflowsYet}
              description={t.noWorkflowsDesc}
              actionLabel={t.newWorkflow}
              actionIcon={<Plus className="size-4" />}
              onAction={() => setModalOpen(true)}
            />
          ) : (
            <div className="pb-2">
              <Table table={table} emptyText={t.noWorkflowsYet} />
            </div>
          )}
        </Card>

        <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
          <div className="rounded-card bg-sky-tint p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="label">{t.runningNow}</p>
                <p className="mt-2 font-display text-6xl font-semibold leading-none tracking-[-0.04em] text-sky-ink font-tabular">
                  {isLoading ? '—' : activeCount}
                </p>
              </div>
              <Bell className="mb-1 size-6 text-sky-ink" />
            </div>
            <p className="mt-6 border-t border-current/15 pt-4 text-sm leading-relaxed text-ink-2">
              {t.explainerText}
            </p>
          </div>
        </aside>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t.newWorkflowModalTitle}
        description={t.newWorkflowModalDesc}
      >
        <WorkflowForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          submitLabel={t.createWorkflowBtn}
          loading={createWorkflow.isPending}
          isUrdu={isUrdu}
          t={t}
        />
      </Modal>

      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title={t.deleteModalTitle}
        description={t.deleteModalDesc}
        maxWidth="max-w-sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setDeletingId(null)} disabled={deleteWorkflow.isPending}>
            {t.cancel}
          </Button>
          <Button variant="danger" loading={deleteWorkflow.isPending} onClick={handleDelete}>
            {t.delete}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default WorkflowsPage;
