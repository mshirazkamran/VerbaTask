import { useState, useRef, useEffect } from 'react';
import { IconBrandWhatsapp, IconChevronDown, IconFileReport } from '@tabler/icons-react';
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
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const handleSelect = async (type) => {
 setOpen(false);
 try {
 await generateReport.mutateAsync(type);
 toast.success('Report generated and sent to your WhatsApp! 📱');
 } catch (err) {
 toast.error('Failed to generate report');
 }
 };

 const reports = [
 { type: 'sales', label: 'Overall Sales Report' },
 { type: 'top_selling', label: 'Top Selling Items' },
 { type: 'inventory', label: 'Full Inventory Stock' },
 { type: 'low_stock', label: 'Low Running Stock' },
 { type: 'expiring', label: 'Item Expiry Report' }
 ];

 return (
 <div className="relative" ref={ref}>
 <Button
 size="sm"
 variant="secondary"
 leftIcon={<IconBrandWhatsapp className="w-4 h-4 text-[#25D366]" />}
 rightIcon={<IconChevronDown className={`w-3.5 h-3.5 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`} />}
 onClick={() => setOpen(!open)}
 loading={generateReport.isPending}
 className="text-xs py-1"
 >
 Generate Report
 </Button>

 {open && (
 <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-canvas rounded-lg shadow-lg border border-hairline py-1 z-50 overflow-hidden">
 {reports.map((r) => (
 <button
 key={r.type}
 onClick={() => handleSelect(r.type)}
 className="w-full text-left px-4 py-2 text-[13px] font-medium text-ink hover:bg-canvas-soft transition-colors flex items-center gap-2"
 >
 <IconFileReport className="w-4 h-4 text-ink-mute" />
 {r.label}
 </button>
 ))}
 </div>
 )}
 </div>
 );
}
