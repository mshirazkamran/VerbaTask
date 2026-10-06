import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: 'Do I have to change how I run my counter?',
    a: 'No. You continue serving customers exactly as you do today. The only new habit is sending a quick voice note or text to your VerbaTask WhatsApp thread: "2 carton oil bech diye, cash mil gaya." Everything else stays the same.',
  },
  {
    q: 'What if the AI misunderstands an amount or item?',
    a: 'Every logged entry is read back to you immediately with the item name, quantity, rate, and total in chat. If anything is incorrect, reply GALAT or type the correction and it reverses instantly. High-value sales (≥ Rs. 10,000) require your explicit confirmation before being recorded.',
  },
  {
    q: 'Does it really understand Roman Urdu and mixed sentences?',
    a: 'Yes. Sentences like "Do kilo chawal aur ek kilo daal, 500 ka note mila" are parsed seamlessly into items, quantities, and cash payments. Voice notes in natural Urdu dialect are transcribed and matched against your inventory catalogue.',
  },
  {
    q: 'Who has access to my store and sales data?',
    a: 'Only you and anyone you authorize to access your dashboard. Your sales records and inventory levels are securely tied to your verified WhatsApp merchant account and are never shared or sold.',
  },
  {
    q: 'Is the Web Dashboard required to use VerbaTask?',
    a: 'Not at all. The WhatsApp thread alone is completely self-sufficient for everyday sales and stock checks. The Web Dashboard is an optional bonus for when you want visual charts, printable PDF reports, or detailed payment method management.',
  },
  {
    q: 'What happens if my phone loses cellular connection?',
    a: 'WhatsApp automatically queues your voice note or message and delivers it as soon as your connection restores. VerbaTask then processes the queue in sequence without losing a single transaction.',
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="px-4 sm:px-6 py-24 bg-[var(--bg-canvas)] transition-colors duration-200">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#287A74]/30 bg-[#287A74]/10 px-3 py-1 text-xs font-semibold text-[#1E5C58] dark:text-[#AEEED3] uppercase tracking-wider mb-3">
            06 — Clarifications
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-ink)] font-display">
            Clear answers for store owners.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-ink-secondary)] font-body">
            Everything you need to know before connecting your shop to VerbaTask.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={f.q}
                className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas-soft)] overflow-hidden transition-colors shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4.5 text-left transition-colors hover:bg-[var(--color-anchor)]/5 cursor-pointer"
                >
                  <span className="font-display text-base font-semibold text-[var(--text-ink)]">
                    {f.q}
                  </span>
                  <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? 'bg-[#287A74] text-white' : 'bg-[var(--border-hairline)] text-[var(--text-ink-mute)]'
                  }`}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[var(--border-hairline)] px-6 py-4 text-sm leading-relaxed text-[var(--text-ink-secondary)] font-body bg-[var(--bg-canvas)]">
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Faq;
