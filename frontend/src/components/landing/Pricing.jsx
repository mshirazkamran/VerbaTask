import { Link } from 'react-router';
import { Check, ArrowRight } from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { Magnet } from '../ui/reactbits/Magnet';

const included = [
  'Unlimited sales logging via Urdu & Roman Urdu voice notes',
  'Real-time automated inventory decrement & low-stock alerts',
  'Pakistani payment channels: Cash, Easypaisa, JazzCash, 1-Link Banks',
  'Human-in-the-loop safety approvals for transactions ≥ Rs. 10,000',
  'Full Web Terminal dashboard with inventory analytics & CSV/PDF exports',
  'Zero recurring subscription lockouts or hidden credit card fees',
];

export function Pricing() {
  return (
    <section id="pricing" className="px-4 sm:px-6 py-24 bg-[var(--bg-canvas-soft)] transition-colors duration-200 border-t border-[var(--border-hairline)]">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#287A74]/30 bg-[#287A74]/10 px-3 py-1 text-xs font-semibold text-[#1E5C58] dark:text-[#AEEED3] uppercase tracking-wider mb-3">
            05 — Economics
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-ink)] font-display">
            Transparent pricing for community merchants.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-ink-secondary)] font-body">
            No credit card required. No trial expiration count-downs. No surprise lockouts when you need your ledger most.
          </p>
        </div>

        {/* High-Contrast Inverted Anchor Card */}
        <div className="max-w-3xl mx-auto rounded-3xl bg-[#287A74] text-white p-7 sm:p-12 shadow-2xl relative overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-[#AEEED3]/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 size-80 rounded-full bg-[#FFF8B0]/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <span className="rounded-full bg-[#FFF8B0] text-[#3D3400] font-bold text-xs px-3.5 py-1 uppercase tracking-wider font-mono">
                Small Merchant Tier
              </span>
              <span className="text-xs text-[#AEEED3] font-medium">
                Meta Cloud Free API Tier
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-5xl sm:text-7xl font-extrabold tracking-tight font-display font-tabular">
                PKR 0
              </span>
              <span className="text-sm font-medium text-[#AEEED3]/80">
                / month, per store
              </span>
            </div>

            <p className="mt-5 text-sm sm:text-base leading-relaxed text-[#EAFBF5] font-body max-w-xl">
              VerbaTask is designed to digitize local Kiryana shops and pharmacies across Pakistan.
              Merchant-initiated WhatsApp messages operate within the Meta Cloud API free service tier,
              allowing small shops to log daily sales without costly software subscriptions.
            </p>

            <div className="mt-9 pt-7 border-t border-white/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FFF8B0] mb-5">
                Every feature included on Day 1:
              </p>
              <ul className="grid gap-3.5 sm:grid-cols-2">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-white/95">
                    <Check className="mt-0.5 w-4 h-4 shrink-0 text-[#FFF8B0]" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Magnet padding={40} magnetStrength={3} wrapperClassName="w-full sm:w-auto">
                <Link
                  to="/signup"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-[#FFF8B0] hover:bg-[#FFF380] text-[#287A74] px-7 py-4 text-sm font-bold shadow-lg transition-all duration-150 active:scale-[0.98]"
                >
                  <WhatsAppIcon className="w-5 h-5 shrink-0" />
                  <span>Start Free on WhatsApp Now</span>
                </Link>
              </Magnet>

              <span className="text-xs text-[#AEEED3]/80 flex items-center gap-1.5">
                Takes 60 seconds to pair store
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Pricing;
