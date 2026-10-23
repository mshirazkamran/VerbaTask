import { useState } from 'react';
import { Download, Send, FileText, Phone } from 'lucide-react';
import { toast } from 'sonner';

import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import { api } from '../lib/api';
import { formatPKR } from '../lib/format';
import { useCustomerStatement, useSendCustomerStatement } from '../hooks/useCustomers';

const formatEntryDate = (value) =>
  new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi',
  });

const ENTRY_LABELS = {
  purchase: { en: 'Udhaar', ur: 'ادھار', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  payment: { en: 'Paid', ur: 'وصولی', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  return: { en: 'Return', ur: 'واپسی', className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
  opening: { en: 'Earlier', ur: 'پچھلا', className: 'bg-paper-2 text-ink-secondary' },
};

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-hairline bg-canvas-soft px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute">{label}</p>
      <p className={`mt-0.5 font-tabular text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

/**
 * A customer's khata statement: every udhaar purchase with its date and items, every payment,
 * and the running balance — with the same PDF the WhatsApp bot sends available to download
 * or send to WhatsApp.
 */
export function KhataStatementModal({ customer, onClose, isUrdu }) {
  const { data, isLoading, error } = useCustomerStatement(customer?._id);
  const sendMutation = useSendCustomerStatement();
  const [downloading, setDownloading] = useState(false);

  if (!customer) return null;

  const rows = data?.rows || [];
  const totals = data?.totals;
  const name = customer.name || '';
  const fileName = `Khata_${name.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'customer'}.pdf`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await api.download(`/api/customers/${customer._id}/statement/pdf`, fileName);
      toast.success(isUrdu ? 'کھاتہ رپورٹ ڈاؤن لوڈ ہو گئی' : 'Khata report downloaded');
    } catch (err) {
      toast.error(err.message || (isUrdu ? 'رپورٹ ڈاؤن لوڈ نہیں ہو سکی' : 'Could not download the report'));
    } finally {
      setDownloading(false);
    }
  };

  const handleSend = async () => {
    try {
      const res = await sendMutation.mutateAsync(customer._id);
      toast.success(
        isUrdu
          ? `کھاتہ رپورٹ واٹس ایپ پر بھیج دی گئی (+${res?.recipient || ''})`
          : `Khata report sent to WhatsApp (+${res?.recipient || ''})`
      );
    } catch (err) {
      toast.error(err.message || (isUrdu ? 'واٹس ایپ پر نہیں بھیجی جا سکی' : 'Could not send to WhatsApp'));
    }
  };

  return (
    <Modal
      isOpen={!!customer}
      onClose={onClose}
      maxWidth="max-w-3xl"
      title={isUrdu ? `کھاتہ رپورٹ — ${name}` : `Khata report — ${name}`}
      description={
        isUrdu
          ? 'ہر ادھار خریداری تاریخ اور سامان کے ساتھ، ہر وصولی، اور بقایا رقم'
          : 'Every udhaar purchase with its date and items, every payment, and what is still owed'
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-secondary font-tabular">
            <Phone className="w-4 h-4 text-muted" />
            {customer.phone || (isUrdu ? 'فون نمبر درج نہیں' : 'No phone on file')}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="w-4 h-4" />}
              loading={downloading}
              onClick={handleDownload}
            >
              {isUrdu ? 'پی ڈی ایف ڈاؤن لوڈ' : 'Download PDF'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Send className="w-4 h-4" />}
              loading={sendMutation.isPending}
              onClick={handleSend}
            >
              {isUrdu ? 'واٹس ایپ پر بھیجیں' : 'Send to WhatsApp'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton variant="tableRow" />
            <Skeleton variant="tableRow" />
            <Skeleton variant="tableRow" />
          </div>
        ) : error ? (
          <p className="text-sm text-coral">
            {isUrdu ? 'کھاتہ لوڈ نہیں ہو سکا۔' : 'Could not load this khata.'} {error.message}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Stat
                label={isUrdu ? 'بقایا' : 'Still owed'}
                value={formatPKR(totals?.balance ?? 0)}
                tone={(totals?.balance ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
              />
              <Stat label={isUrdu ? 'کل ادھار' : 'Total udhaar'} value={formatPKR(totals?.purchased ?? 0)} tone="text-ink" />
              <Stat label={isUrdu ? 'کل وصولی' : 'Total paid'} value={formatPKR(totals?.paid ?? 0)} tone="text-emerald-600 dark:text-emerald-400" />
            </div>

            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-hairline px-4 py-8 text-center">
                <FileText className="mx-auto mb-2 w-6 h-6 text-muted" />
                <p className="text-sm text-ink-secondary">
                  {isUrdu
                    ? 'اس کھاتے میں ابھی کوئی خریداری یا وصولی درج نہیں۔'
                    : 'No purchases or payments recorded on this khata yet.'}
                </p>
                <p className="mt-1 text-xs text-ink-mute">
                  {isUrdu
                    ? `واٹس ایپ پر بولیں: "${name} ke khate me lipton daal do"`
                    : `On WhatsApp, say: "${name} ke khate me lipton daal do"`}
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-hairline rounded-lg border border-hairline">
                {rows.map((row, idx) => {
                  const label = ENTRY_LABELS[row.type] || ENTRY_LABELS.opening;
                  const isCredit = row.credit > 0;
                  const amount = isCredit ? row.credit : row.debit;
                  return (
                    <li key={`${row.type}-${row.date}-${idx}`} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-pill px-2 py-0.5 text-[11px] font-semibold ${label.className}`}>
                            {isUrdu ? label.ur : label.en}
                          </span>
                          <span className="font-tabular text-xs text-ink-mute">{formatEntryDate(row.date)}</span>
                        </div>
                        <p className="mt-1 break-words text-sm text-ink">{row.details}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`font-tabular text-sm font-semibold ${
                            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isCredit ? '−' : '+'} {formatPKR(amount)}
                        </p>
                        <p className="mt-0.5 font-tabular text-xs text-ink-mute">
                          {isUrdu ? 'بقایا' : 'Balance'} {formatPKR(row.balance)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export default KhataStatementModal;
