import { motion } from 'motion/react';
import {
  MessageSquarePlus,
  Mic,
  Package,
  LayoutDashboard,
} from 'lucide-react';
import { SectionHeading, Stagger, StaggerItem } from './glass';

const steps = [
  {
    icon: MessageSquarePlus,
    title: '1. Message the Number',
    body: 'Save the verified WhatsApp number. Send a message to link your store — that is your entire onboarding.',
  },
  {
    icon: Mic,
    title: '2. Speak or Text the Sale',
    body: 'Send a voice note or typed message in Urdu, Roman Urdu, or English: "Do carton oil bech diye, cash mil gaya."',
  },
  {
    icon: Package,
    title: '3. Order Logged & Stock Deducted',
    body: 'The transaction is recorded, stock quantities adjust in real time, and any low-stock alerts fire immediately.',
  },
  {
    icon: LayoutDashboard,
    title: '4. Visual Web Hub',
    body: 'Open your web dashboard whenever you want deep inventory analytics, downloadable PDF reports, and payment settings.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-24 bg-slate-50 dark:bg-[#0E1015] transition-colors duration-200">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="How It Works"
          title="Four simple steps — three happen in chat"
          subtitle="Designed so that anyone from a seasoned cashier to a daily shop assistant can log sales with zero training."
        />

        <div className="mt-16">
          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <StaggerItem key={s.title}>
                <div className="h-full rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#141720] p-6 shadow-sm dark:shadow-md flex flex-col justify-start">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <s.icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-xs font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 dark:text-zinc-400 dark:bg-white/5 dark:border-white/10 px-2.5 py-1 rounded-full">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-white font-heading">
                    {s.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {s.body}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
