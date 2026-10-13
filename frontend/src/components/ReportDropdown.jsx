import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  FileText,
  Download,
  TrendingUp,
  Star,
  Package,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import { WhatsAppIcon } from './ui/WhatsAppIcon';
import { Button } from './ui/Button';
import { toast } from 'sonner';
import { useGenerateReport } from '../hooks/useDashboard';
import { useMerchant } from '../hooks/useMerchant';
import { useUiStore } from '../lib/store';
import { api } from '../lib/api';
import { generateClientReportPdf } from '../lib/pdfReportGenerator';

const REPORTS = [
  {
    type: 'sales',
    label: 'Sales Report',
    labelUr: 'سیلز رپورٹ',
    icon: TrendingUp,
    desc: 'Revenue, payments & orders',
  },
  {
    type: 'top_selling',
    label: 'Top Sellers',
    labelUr: 'ٹاپ سیلرز',
    icon: Star,
    desc: 'Fastest moving stock',
  },
  {
    type: 'inventory',
    label: 'Full Inventory',
    labelUr: 'مکمل انوینٹری',
    icon: Package,
    desc: 'Complete items catalog',
  },
  {
    type: 'low_stock',
    label: 'Low Stock',
    labelUr: 'کم اسٹاک',
    icon: AlertTriangle,
    desc: 'Items needing reorder',
  },
  {
    type: 'expiring',
    label: 'Expiring Items',
    labelUr: 'ختم ہونے والا مال',
    icon: Clock,
    desc: 'Batches reaching expiry',
  },
];

export function ReportDropdown() {
  const [open, setOpen] = useState(false);
  const [downloadingType, setDownloadingType] = useState(null);
  const [sendingType, setSendingType] = useState(null);
  const ref = useRef(null);

  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';

  const { data: merchant } = useMerchant();
  const generateReport = useGenerateReport();

  const isLinked = merchant?.whatsappNumber && !merchant.whatsappNumber.startsWith('unlinked_');
  const linkedNumber = isLinked ? merchant.whatsappNumber : null;

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleDownload = async (type, label) => {
    try {
      setDownloadingType(type);
      toast.info(isUrdu ? `${label} ڈاؤن لوڈ ہو رہی ہے...` : `Preparing ${label} PDF...`);
      const dateStr = new Date().toISOString().slice(0, 10);
      try {
        await api.download(`/api/reports/download/${type}`, `${type}_report_${dateStr}.pdf`);
      } catch (dlErr) {
        console.warn('Server download route not available, generating client PDF:', dlErr.message);
        await generateClientReportPdf(type, merchant);
      }
      toast.success(isUrdu ? `${label} پی ڈی ایف محفوظ ہو گئی!` : `${label} PDF downloaded successfully!`);
    } catch (err) {
      console.error('Download report error:', err);
      toast.error(err.message || 'Failed to download report PDF');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleSendWhatsapp = async (type, label) => {
    if (!isLinked) {
      toast.error(
        isUrdu
          ? 'واٹس ایپ لنک نہیں ہے۔ براہ کرم "PDF" ڈاؤن لوڈ استعمال کریں یا سیٹنگز میں واٹس ایپ جوڑیں۔'
          : 'WhatsApp is not linked to this account. Use Download PDF or link WhatsApp in Settings.'
      );
      return;
    }

    try {
      setSendingType(type);
      toast.info(isUrdu ? `رپورٹ واٹس ایپ پر بھیجی جا رہی ہے...` : `Sending ${label} to WhatsApp...`);
      const res = await generateReport.mutateAsync(type);
      const recipient = res?.recipient || linkedNumber;
      toast.success(
        isUrdu
          ? `رپورٹ واٹس ایپ (+${recipient}) پر کامیابی سے بھیج دی گئی! 📄`
          : `Report sent to WhatsApp (+${recipient})! 📄`
      );
    } catch (err) {
      console.error('Send report error:', err);
      toast.error(err.message || 'Could not send report to WhatsApp. Try downloading PDF directly.');
    } finally {
      setSendingType(null);
    }
  };

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <Button
        size="sm"
        variant="secondary"
        leftIcon={<FileText className="size-4 text-emerald-600" />}
        rightIcon={<ChevronDown className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />}
        onClick={() => setOpen(!open)}
        className="w-full sm:w-auto justify-between sm:justify-center"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{isUrdu ? 'رپورٹس / Reports' : 'Reports'}</span>
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[100] mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card border border-rule bg-surface p-2 shadow-[var(--shadow-pop)] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header & WhatsApp Status */}
          <div className="px-3 py-2 border-b border-rule mb-1.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink uppercase tracking-wider">
                {isUrdu ? 'کاروباری رپورٹس' : 'Business Reports'}
              </p>
              <p className="text-[11px] text-muted">
                {isUrdu ? 'پی ڈی ایف محفوظ کریں یا واٹس ایپ پر بھیجیں' : 'Download PDF or send to WhatsApp'}
              </p>
            </div>
            {isLinked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <WhatsAppIcon className="size-3" />
                <span>+{linkedNumber}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3" />
                <span>{isUrdu ? 'واٹس ایپ غیر مربوط' : 'WhatsApp unlinked'}</span>
              </span>
            )}
          </div>

          {/* Report Items */}
          <div className="space-y-1">
            {REPORTS.map((r) => {
              const Icon = r.icon;
              const isDownloading = downloadingType === r.type;
              const isSending = sendingType === r.type;
              const title = isUrdu ? r.labelUr : r.label;

              return (
                <div
                  key={r.type}
                  className="flex items-center justify-between gap-2 rounded-lg p-2 transition-colors hover:bg-paper-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0 text-muted">
                      <Icon className="size-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium text-ink truncate ${isUrdu ? 'font-urdu text-base' : ''}`}>
                        {title}
                      </p>
                      <p className="text-[11px] text-muted truncate">{r.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Direct Download Button */}
                    <button
                      type="button"
                      disabled={isDownloading || isSending}
                      onClick={() => handleDownload(r.type, title)}
                      title={isUrdu ? 'پی ڈی ایف ڈاؤن لوڈ کریں' : 'Download PDF directly'}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-rule hover:bg-surface hover:text-ink text-muted transition-colors disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5 text-emerald-600" />
                      )}
                      <span>PDF</span>
                    </button>

                    {/* Send to WhatsApp Button */}
                    <button
                      type="button"
                      disabled={isDownloading || isSending}
                      onClick={() => handleSendWhatsapp(r.type, title)}
                      title={
                        isLinked
                          ? isUrdu
                            ? 'واٹس ایپ پر بھیجیں'
                            : `Send to +${linkedNumber}`
                          : 'WhatsApp not linked'
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 ${
                        isLinked
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                          : 'border-rule text-muted/50 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isSending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <WhatsAppIcon className="size-3.5" />
                      )}
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!isLinked && (
            <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
              {isUrdu
                ? '💡 تجویز: اوپر دیے گئے "PDF" بٹن سے رپورٹ فوری ڈاؤن لوڈ کریں۔ واٹس ایپ پر موصول کرنے کے لیے سیٹنگز میں فون نمبر لنک کریں۔'
                : '💡 Tip: Click "PDF" to download reports instantly to your device. Link your WhatsApp in Settings to receive them directly on WhatsApp.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportDropdown;
