import { Link } from 'react-router';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';

// One honest price line on the pear band — no tier table.
const included = [
  'Unlimited sales by voice note or text',
  'Live stock with low-stock alerts',
  'Cash, Easypaisa, JazzCash, bank and udhaar',
  'Approvals for sales above your limit',
  'Web dashboard and WhatsApp reports',
  'No card on file, no trial countdown',
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 bg-pear text-on-pear dark:border-y dark:border-rule dark:bg-paper-2 dark:text-ink">
      <div className="shell grid gap-12 py-20 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-tight">Pricing</h2>
          <p className="display mt-4 font-tabular dark:text-pear text-[length:var(--text-numeral)] leading-[0.9]">
            PKR&nbsp;0
          </p>
          <p className="mt-4 font-mono text-sm uppercase tracking-[0.08em]">per store · per month</p>
        </div>

        <div className="min-w-0 lg:pt-4">
          <p className="max-w-[34rem] text-lg leading-relaxed">
            Messages you send to VerbaTask run inside WhatsApp’s free service window, so a small shop
            can log every sale without paying for software.
          </p>
          <ul className="mt-8 grid border-t border-on-pear/25 dark:border-rule sm:grid-cols-2 sm:gap-x-8">
            {included.map((item) => (
              <li key={item} className="border-b border-on-pear/25 dark:border-rule py-3 text-sm font-medium">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link to="/signup" className="btn btn--ink btn--lg">
              <WhatsAppIcon className="size-5" />
              Start free
            </Link>
            <span className="text-sm">Pairing takes about a minute.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Pricing;
