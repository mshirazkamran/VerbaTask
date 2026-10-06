import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { WhatsAppIcon } from './ui/WhatsAppIcon';
import { Button } from './ui/Button';
import { toast } from 'sonner';
import { useGenerateReport } from '../hooks/useDashboard';

export function ReportDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const generateReport = useGenerateReport();

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

  const handleSelect = async (type) => {
    setOpen(false);
    try {
      await generateReport.mutateAsync(type);
      toast.success('Report sent to your WhatsApp');
    } catch (err) {
      toast.error('The report didn’t send. Try again in a moment.');
    }
  };

  const reports = [
    { type: 'sales', label: 'Sales' },
    { type: 'top_selling', label: 'Top sellers' },
    { type: 'inventory', label: 'Full stock' },
    { type: 'low_stock', label: 'Low stock' },
    { type: 'expiring', label: 'Expiring items' },
  ];

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <Button
        size="sm"
        variant="secondary"
        leftIcon={<WhatsAppIcon className="size-4" />}
        rightIcon={<ChevronDown className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />}
        onClick={() => setOpen(!open)}
        loading={generateReport.isPending}
        className="w-full sm:w-auto"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Send a report
      </Button>

      {open && (
        <div role="menu" className="absolute right-0 z-[100] mt-2 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-rule bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <p className="label px-3 pb-1 pt-2">Sent to your WhatsApp</p>
          {reports.map((r) => (
            <button
              key={r.type}
              onClick={() => handleSelect(r.type)}
              role="menuitem"
              className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper-2"
            >
              <FileText className="size-4 shrink-0 text-muted" />
              <span className="truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReportDropdown;
