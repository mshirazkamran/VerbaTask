import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { Reveal, SectionHeading } from './glass';

const included = [
  'Unlimited sales logging via WhatsApp text or Urdu voice note',
  'Urdu, Roman Urdu, and English cross-lingual understanding',
  'Live inventory tracking with automated low-stock warnings',
  'Pakistani payment channels (JazzCash, EasyPaisa, SadaPay, Banks, Cash)',
  'High-value order confirmation alerts & fraud guards',
  'Full Web Dashboard access with downloadable PDF reports',
];

export function Pricing() {
  return (
    <section id="pricing" className="px-4 py-16 sm:py-24 bg-slate-50 dark:bg-[#0E1015] transition-colors duration-200">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Transparent Pricing"
          title="100% Free for Small Merchants"
          subtitle="No credit cards required, no hidden trial expirations, and no surprise lockouts."
        />

        <Reveal className="mx-auto mt-12 max-w-2xl">
          <div className="rounded-3xl border border-emerald-500/30 bg-white dark:bg-[#12151C] p-5 sm:p-10 shadow-lg dark:shadow-2xl relative overflow-hidden">
            {/* Top accent badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              Community Retail Tier
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl sm:text-6xl font-extrabold text-zinc-950 dark:text-white font-heading">
                PKR 0
              </span>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                / month, per store
              </span>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              VerbaTask is designed to digitize local Kiryana stores, boutiques, and pharmacies.
              Merchant-initiated conversations run within the Meta Cloud API free service tier,
              allowing small shops to log daily sales without costly software subscriptions.
            </p>

            <div className="mt-8 border-t border-zinc-200 dark:border-white/10 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-4">
                What is included:
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-200">
                    <Check className="mt-0.5 w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/signup"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all duration-150"
            >
              <WhatsAppIcon className="w-5 h-5" />
              <span>Get Started Free on WhatsApp</span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default Pricing;
