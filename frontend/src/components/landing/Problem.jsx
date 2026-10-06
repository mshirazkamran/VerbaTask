import { motion } from 'motion/react';
import {
  FileSpreadsheet,
  AlertOctagon,
  Languages,
  ArrowRight,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { SpotlightCard } from '../ui/reactbits/SpotlightCard';

export function Problem() {
  return (
    <section id="problem" className="px-4 sm:px-6 py-24 bg-[var(--bg-canvas-soft)] transition-colors duration-200 border-y border-[var(--border-hairline)]">
      <div className="mx-auto max-w-6xl">
        {/* Section Header: Left-aligned with distinctive numbered eyebrow */}
        <div className="max-w-2xl mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#287A74]/30 bg-[#287A74]/10 px-3 py-1 text-xs font-semibold text-[#1E5C58] dark:text-[#AEEED3] uppercase tracking-wider mb-3">
            01 — The Friction
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-ink)] font-display">
            Your shop already runs on WhatsApp. Your records don't.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-ink-secondary)] font-body">
            Kiryana shops, pharmacies, and merchants across Pakistan take customer orders and confirm
            payments over WhatsApp all day — then manually track none of it.
          </p>
        </div>

        {/* 60/40 Asymmetric Layout */}
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.85fr] items-stretch">
          {/* 60% Dominant Feature Card: The Ledger & Udhaar Problem */}
          <SpotlightCard
            spotlightColor="rgba(174, 238, 211, 0.18)"
            className="flex flex-col justify-between p-7 sm:p-9 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-3xl"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="size-11 rounded-xl bg-[#287A74]/15 text-[#287A74] dark:text-[#AEEED3] flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="rounded-md bg-[#FFF8B0] text-[#4E4300] px-2.5 py-1 text-xs font-bold font-mono">
                  Primary Failure Point
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-ink)] font-display">
                Udhaar and cash totals live in someone's head.
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--text-ink-secondary)] font-body">
                Who took 5kg rice on udhaar? Did the restaurant pay their dairy bill?
                At 10:00 PM closing time, shopkeepers sift through memory or a torn paper register
                (bahi-khata). Crucial amounts get missed, disputes arise, and cash leaks away quietly.
              </p>

              {/* Tangible Pakistani Retail Scenario Comparison */}
              <div className="mt-8 grid sm:grid-cols-2 gap-3.5 text-xs">
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 dark:bg-red-950/20 p-4">
                  <div className="flex items-center gap-2 font-semibold text-red-600 dark:text-red-400 mb-1.5">
                    <TrendingDown className="w-4 h-4 shrink-0" />
                    <span>The Paper Bahi-Khata</span>
                  </div>
                  <p className="text-[var(--text-ink-mute)] leading-relaxed">
                    Scribbled on counter slips. Unindexed, impossible to total instantly, and easily lost or forgotten.
                  </p>
                </div>

                <div className="rounded-xl border border-[#287A74]/30 bg-[#287A74]/8 dark:bg-[#287A74]/15 p-4">
                  <div className="flex items-center gap-2 font-semibold text-[#1E5C58] dark:text-[#AEEED3] mb-1.5">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>VerbaTask Voice Note</span>
                  </div>
                  <p className="text-[var(--text-ink-mute)] leading-relaxed">
                    "Rashid bhai ne 1500 udhaar liya." Instantly recorded, indexed by customer, and visible on both WhatsApp & Web.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs font-medium text-[#287A74] dark:text-[#AEEED3]">
              <span>Zero manual data entry required at closing</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </SpotlightCard>

          {/* 40% Column with Staggered Complementary Cards */}
          <div className="flex flex-col gap-6 justify-between">
            {/* Card 2: Inventory Blindness */}
            <SpotlightCard
              spotlightColor="rgba(85, 169, 160, 0.16)"
              className="p-6 sm:p-7 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-3xl"
            >
              <div className="size-10 rounded-xl bg-[#55A9A0]/20 text-[#287A74] dark:text-[#AEEED3] flex items-center justify-center mb-4">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-[var(--text-ink)] font-display">
                Inventory is an empty shelf discovery.
              </h4>
              <p className="mt-2 text-sm text-[var(--text-ink-secondary)] leading-relaxed font-body">
                Nobody knows cooking oil cartons or milk packets ran out until a walk-in customer asks for them.
                Reordering is pure guesswork, and working capital stays locked in slow-moving stock.
              </p>
            </SpotlightCard>

            {/* Card 3: Clunky Desktop POS Software */}
            <SpotlightCard
              spotlightColor="rgba(255, 248, 176, 0.2)"
              className="p-6 sm:p-7 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-3xl"
            >
              <div className="size-10 rounded-xl bg-[#FFF8B0] text-[#3D3400] flex items-center justify-center mb-4">
                <Languages className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-[var(--text-ink)] font-display">
                Existing POS software wasn't made for Pakistan.
              </h4>
              <p className="mt-2 text-sm text-[var(--text-ink-secondary)] leading-relaxed font-body">
                Desktop-first, English-only interfaces with 15 required form fields per sale. They require typing literacy
                and barcode setups that a fast-paced retail counter simply does not have.
              </p>
            </SpotlightCard>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Problem;
