import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
import { SectionHeading, Stagger, StaggerItem } from './glass';

const faqs = [
  {
    q: 'Do I have to change how I run my counter?',
    a: 'No. You continue serving customers exactly as you do today. The only new habit is sending a quick voice note or text to your VerbaTask WhatsApp thread: "2 carton oil bech diye, cash mil gaya." Everything else stays the same.',
  },
  {
    q: 'What if the AI misunderstands an amount or item?',
    a: 'Every logged entry is read back to you immediately with the item name, quantity, rate, and total in chat. If anything is incorrect, reply GALAT or type the correction and it reverses instantly. High-value sales require your explicit confirmation before being recorded.',
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
    q: 'What happens if my phone loses internet connection?',
    a: 'WhatsApp automatically queues your voice note or message and delivers it as soon as your connection restores. VerbaTask then processes the queue in sequence without losing a single transaction.',
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="px-4 py-24 bg-white dark:bg-[#0B0D11] transition-colors duration-200">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="Frequently Asked Questions"
          title="Clear answers for store owners"
          subtitle="Everything you need to know before linking your shop to VerbaTask."
        />

        <Stagger className="mt-12 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <StaggerItem key={f.q}>
                <div className="rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#12151C] overflow-hidden transition-colors hover:border-zinc-300 dark:hover:border-white/20 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.02] cursor-pointer"
                  >
                    <span className="font-heading text-base font-semibold text-zinc-900 dark:text-white">
                      {f.q}
                    </span>
                    {isOpen ? (
                      <Minus className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Plus className="w-5 h-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <div className="px-6 pb-5 pt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 border-t border-zinc-100 dark:border-white/5">
                          {f.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

export default Faq;
