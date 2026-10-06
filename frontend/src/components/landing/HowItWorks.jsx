import { motion } from 'motion/react';
import {
  MessageSquarePlus,
  Mic,
  Package,
  LayoutDashboard,
  ArrowRight,
} from 'lucide-react';

const steps = [
  {
    num: '1.0',
    title: 'Link Your WhatsApp Number',
    body: 'Save the verified business number. Send "Salam" or link code to pair your store — that is your entire setup.',
    detail: 'No app download or terminal config required.',
  },
  {
    num: '2.0',
    title: 'Speak or Text the Transaction',
    body: 'Send a voice note or message in Urdu or Roman Urdu: "Do carton Dalda bech diye, cash mil gaya."',
    detail: 'Understands Pakistani Kiryana transliterations.',
  },
  {
    num: '3.0',
    title: 'Instant Stock & Ledger Sync',
    body: 'The sale is logged, stock counts deduct in real time, and low-stock alerts ping if quantities drop.',
    detail: 'Immediate double-entry verification on chat.',
  },
  {
    num: '4.0',
    title: 'Visual Web Dashboard',
    body: 'Access your web terminal anytime to view charts, audit customer udhaar balances, or download reports.',
    detail: 'Real-time sync between WhatsApp and Web.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 sm:px-6 py-24 bg-[var(--bg-canvas-soft)] transition-colors duration-200 border-b border-[var(--border-hairline)]">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#287A74]/30 bg-[#287A74]/10 px-3 py-1 text-xs font-semibold text-[#1E5C58] dark:text-[#AEEED3] uppercase tracking-wider mb-3">
            03 — Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-ink)] font-display">
            Four straightforward stages. Three happen in WhatsApp.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-ink-secondary)] font-body">
            Designed so that any shop assistant or cashier can log daily transactions with zero software training.
          </p>
        </div>

        {/* Asymmetric Staggered Sequence */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, idx) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className={`rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-6 sm:p-7 flex flex-col justify-between shadow-xs transition-transform hover:-translate-y-1 ${
                idx % 2 === 1 ? 'lg:translate-y-4' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="font-mono text-xs font-bold text-[#287A74] dark:text-[#AEEED3] bg-[#287A74]/10 dark:bg-[#AEEED3]/15 px-2.5 py-1 rounded-lg">
                    {s.num}
                  </span>
                  <div className="size-2 rounded-full bg-[#55A9A0]" />
                </div>

                <h3 className="text-lg font-bold text-[var(--text-ink)] font-display">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-[var(--text-ink-secondary)] font-body">
                  {s.body}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border-hairline)] text-[11px] font-medium text-[var(--text-ink-mute)]">
                {s.detail}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
