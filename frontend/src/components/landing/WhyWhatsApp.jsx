import { motion } from 'motion/react';
import {
  XCircle,
  CheckCircle2,
  Smartphone,
  Shield,
  Zap,
} from 'lucide-react';
import { SpotlightCard } from '../ui/reactbits/SpotlightCard';

const comparisons = [
  {
    feature: 'Hardware & Terminal Cost',
    traditional: 'Rs. 45,000 – 120,000 for PC, touch POS terminal & barcode gun',
    verbatask: 'Rs. 0 — Runs entirely inside WhatsApp on any basic Android phone',
    advantage: true,
  },
  {
    feature: 'Language & Literacy Barrier',
    traditional: 'English-only UI with 15 mandatory fields per checkout entry',
    verbatask: 'Urdu & Roman Urdu voice notes — speak naturally like talking to staff',
    advantage: true,
  },
  {
    feature: 'Loadshedding & Offline Power',
    traditional: 'Requires uninterrupted UPS/generator power for desktop terminals',
    verbatask: 'Works via mobile battery & 3G/4G cellular data network',
    advantage: true,
  },
  {
    feature: 'Staff & Cashier Training',
    traditional: 'Weeks of cashier training; errors result in bad inventory logs',
    verbatask: 'Zero training needed — if staff can send a voice note, they can use it',
    advantage: true,
  },
];

export function WhyWhatsApp() {
  return (
    <section id="why-whatsapp" className="px-4 sm:px-6 py-24 bg-[var(--bg-canvas)] transition-colors duration-200">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#287A74]/30 bg-[#287A74]/10 px-3 py-1 text-xs font-semibold text-[#1E5C58] dark:text-[#AEEED3] uppercase tracking-wider mb-3">
            04 — The Contrast
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-ink)] font-display">
            The counter reality: Desktop POS vs. WhatsApp Voice.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-ink-secondary)] font-body">
            Software adoption fails in Pakistan when it forces shopkeepers to sit behind clunky hardware.
            VerbaTask turns the chat app they already use all day into a sales operations engine.
          </p>
        </div>

        {/* Tactile Comparison Table Container */}
        <SpotlightCard
          spotlightColor="rgba(174, 238, 211, 0.16)"
          className="rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-canvas-soft)] p-6 sm:p-9 shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-[var(--border-hairline)]">
                  <th className="py-4 pr-6 font-display font-semibold text-xs uppercase tracking-wider text-[var(--text-ink-mute)] w-1/3">
                    Counter Requirement
                  </th>
                  <th className="py-4 px-6 font-display font-semibold text-xs uppercase tracking-wider text-red-600 dark:text-red-400 w-1/3">
                    Traditional Desktop POS
                  </th>
                  <th className="py-4 pl-6 font-display font-semibold text-xs uppercase tracking-wider text-[#1E5C58] dark:text-[#AEEED3] bg-[#287A74]/10 dark:bg-[#AEEED3]/10 rounded-t-xl w-1/3">
                    VerbaTask on WhatsApp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {comparisons.map((row, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-[var(--bg-canvas)]/50">
                    <td className="py-4 pr-6 font-semibold text-[var(--text-ink)] font-display">
                      {row.feature}
                    </td>
                    <td className="py-4 px-6 text-[var(--text-ink-secondary)] text-xs sm:text-sm">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{row.traditional}</span>
                      </div>
                    </td>
                    <td className="py-4 pl-6 font-medium text-[var(--text-ink)] bg-[#287A74]/5 dark:bg-[#AEEED3]/5 text-xs sm:text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#287A74] dark:text-[#AEEED3] shrink-0 mt-0.5" />
                        <span className="font-semibold text-[#1E5C58] dark:text-[#AEEED3]">{row.verbatask}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text-ink-mute)]">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#55A9A0]" />
              Zero hardware maintenance or proprietary terminal fees
            </span>
            <span className="font-mono text-[#287A74] dark:text-[#AEEED3] font-bold">
              Immediate ROI on Day 1
            </span>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}

export default WhyWhatsApp;
