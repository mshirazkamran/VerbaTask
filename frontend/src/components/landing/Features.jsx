import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Mic,
  Package,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { SpotlightCard } from '../ui/reactbits/SpotlightCard';
import { WhatsAppMock } from './WhatsAppMock';

export function Features() {
  const [selectedPayment, setSelectedPayment] = useState('easypaisa');

  const inventoryItems = [
    { name: 'Dalda Cooking Oil 5L', qty: 3, unit: 'cartons', low: true },
    { name: 'Sufi Super Basmati Rice', qty: 42, unit: 'kg', low: false },
    { name: 'Tapal Danedar Tea 900g', qty: 4, unit: 'packs', low: true },
    { name: 'Olpers Milk 1L Pack', qty: 64, unit: 'packs', low: false },
  ];

  return (
    <section id="features" className="px-4 sm:px-6 py-24 bg-[var(--bg-canvas)] transition-colors duration-200">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="max-w-2xl mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#287A74]/30 bg-[#287A74]/10 px-3 py-1 text-xs font-semibold text-[#1E5C58] dark:text-[#AEEED3] uppercase tracking-wider mb-3">
            02 — Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-ink)] font-display">
            Built for how Pakistani shops actually operate.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-ink-secondary)] font-body">
            No barcode guns, no training sessions. Speak naturally in Urdu or Roman Urdu, and
            VerbaTask converts everyday conversation into structured inventory transactions.
          </p>
        </div>

        {/* Bento Grid with Asymmetric Spans */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-[minmax(280px,auto)]">
          {/* Tile 1: (Wide 2-col on desktop) - Guided Voice Ordering */}
          <SpotlightCard
            spotlightColor="rgba(174, 238, 211, 0.22)"
            className="md:col-span-2 p-7 sm:p-8 rounded-3xl bg-[var(--bg-canvas-soft)] border border-[var(--border-hairline)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-xl bg-[#287A74] text-white flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text-ink)] font-display">
                      Guided Voice & Text Ordering
                    </h3>
                    <p className="text-xs text-[var(--text-ink-mute)]">
                      Speaks Kiryana terms, English & Roman Urdu
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#AEEED3]/30 text-[#174845] dark:text-[#AEEED3] border border-[#AEEED3]/50 px-2.5 py-0.5 text-xs font-bold font-mono">
                  Whisper + Qwen AI
                </span>
              </div>

              <p className="text-sm text-[var(--text-ink-secondary)] leading-relaxed max-w-xl font-body">
                The AI identifies missing parameters—rate, quantity, or cash vs. udhaar—and prompts only for what is
                unclear. One brief question at a time.
              </p>

              {/* Mini WhatsApp Preview */}
              <div className="mt-6 rounded-2xl border border-[var(--border-hairline)] overflow-hidden bg-[var(--bg-canvas)] shadow-xs">
                <WhatsAppMock
                  title="VerbaTask Voice Parser"
                  bubbles={[
                    { from: 'merchant', text: '', voice: true, time: '02:30 PM' },
                    {
                      from: 'bot',
                      text: 'Samajh gaya! 5kg Sufi Basmati Rice aur 2 carton Dalda Oil.\nTotal PKR 6,800. Cash mila ya JazzCash pe transfer hua?',
                      sub: 'Transcribed: "5 kilo chawal aur 2 carton ghee bech diye"',
                      time: '02:30 PM',
                    },
                  ]}
                />
              </div>
            </div>
          </SpotlightCard>

          {/* Tile 2: (1-col, Tall) - Live Inventory Sync */}
          <SpotlightCard
            spotlightColor="rgba(85, 169, 160, 0.2)"
            className="p-7 rounded-3xl bg-[var(--bg-canvas-soft)] border border-[var(--border-hairline)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="size-10 rounded-xl bg-[#55A9A0] text-white flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-ink)] font-display">
                    Live Stock Sync
                  </h3>
                  <p className="text-xs text-[var(--text-ink-mute)]">Instant shelf updates</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[var(--text-ink-secondary)] leading-relaxed font-body mb-5">
                Each order decrements stock across both WhatsApp queries and your dashboard in real time.
              </p>

              {/* Live Inventory Mini Table */}
              <div className="space-y-2 text-xs">
                {inventoryItems.map((item) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      item.low
                        ? 'border-[#FFF8B0]/60 bg-[#FFF8B0]/20 text-[#3D3400] dark:text-[#FFF8B0]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-ink)]'
                    }`}
                  >
                    <div className="truncate pr-2 font-medium">{item.name}</div>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono font-bold">
                      {item.low && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                      <span>{item.qty} {item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs font-semibold text-[#287A74] dark:text-[#AEEED3]">
              <span>Automated Low-Stock Alerts</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </SpotlightCard>

          {/* Tile 3: (1-col) - High-Value Safety Approvals */}
          <SpotlightCard
            spotlightColor="rgba(255, 248, 176, 0.25)"
            className="p-7 rounded-3xl bg-[var(--bg-canvas-soft)] border border-[var(--border-hairline)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="size-10 rounded-xl bg-[#287A74] text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-ink)] font-display">
                    High-Value Approvals
                  </h3>
                  <p className="text-xs text-[var(--text-ink-mute)]">Human-in-the-loop safety</p>
                </div>
              </div>

              <p className="text-sm text-[var(--text-ink-secondary)] leading-relaxed font-body">
                Any sale above your threshold (e.g. Rs. 10,000) requests explicit confirmation before committing.
              </p>

              {/* Simulated Interactive Approval Prompt */}
              <div className="mt-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3.5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[var(--text-ink-mute)] mb-2 font-mono">
                  <span>ORD-9021</span>
                  <span className="font-bold text-[var(--text-ink)]">PKR 18,500</span>
                </div>
                <p className="text-xs text-[var(--text-ink)] font-medium mb-3">
                  Approve 10 cartons of cooking oil for Al-Madina Hotel?
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    className="py-1.5 rounded-lg bg-[#287A74] text-white hover:bg-[#1E5C58] transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    className="py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-5 text-[11px] text-[var(--text-ink-mute)]">
              Rejected orders immediately restore inventory counts with zero stock leaks.
            </p>
          </SpotlightCard>

          {/* Tile 4: (2-col on desktop) - Pakistani Payment Rails Reconciliation */}
          <SpotlightCard
            spotlightColor="rgba(174, 238, 211, 0.2)"
            className="md:col-span-2 p-7 sm:p-8 rounded-3xl bg-[var(--bg-canvas-soft)] border border-[var(--border-hairline)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-xl bg-[#55A9A0] text-white flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text-ink)] font-display">
                      Multi-Rail Pakistani Reconciliation
                    </h3>
                    <p className="text-xs text-[var(--text-ink-mute)]">
                      Cash, Easypaisa, JazzCash, Bank Transfer & Udhaar
                    </p>
                  </div>
                </div>
                <span className="rounded-md bg-[#FFF8B0] text-[#4E4300] px-2.5 py-0.5 text-xs font-bold font-mono">
                  PKR Native
                </span>
              </div>

              <p className="text-sm text-[var(--text-ink-secondary)] leading-relaxed max-w-xl font-body">
                Categorize each sale by how the money arrived. Filter your daily cash register against digital
                wallets at closing time with zero discrepancy.
              </p>

              {/* Payment Rail Selector */}
              <div className="mt-6 flex flex-wrap gap-2.5 text-xs">
                {[
                  { id: 'cash', label: 'Cash on Counter', tag: 'Hand-to-hand' },
                  { id: 'easypaisa', label: 'Easypaisa Wallet', tag: '034x-xxxxxxx' },
                  { id: 'jazzcash', label: 'JazzCash Wallet', tag: '030x-xxxxxxx' },
                  { id: 'bank', label: 'Bank Transfer', tag: '1-link / IBFT' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPayment(p.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedPayment === p.id
                        ? 'border-[#287A74] bg-[#287A74]/15 text-[#1E5C58] dark:text-[#AEEED3] font-bold shadow-xs'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-ink)] hover:border-[#287A74]/40'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${selectedPayment === p.id ? 'text-[#287A74] dark:text-[#AEEED3]' : 'opacity-30'}`} />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs text-[var(--text-ink-mute)]">
              <span>Automated daily reconciliation report sent every night at 10:00 PM</span>
              <span className="font-mono text-[#287A74] dark:text-[#AEEED3] font-bold">100% Audit Ready</span>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}

export default Features;
