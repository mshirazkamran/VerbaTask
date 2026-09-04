import {
  Calculator,
  Languages,
  BookOpen,
} from 'lucide-react';
import { GlassCard, SectionHeading, Stagger, StaggerItem } from './glass';

const problems = [
  {
    icon: Calculator,
    title: "Udhaar and cash live in someone's head",
    body: "Who paid, who owes udhaar, and what is pending — reconciled from memory at shop closing time, and quietly wrong more often than anyone admits.",
  },
  {
    icon: BookOpen,
    title: 'Inventory is a paper register (if it exists)',
    body: 'Nobody knows the cooking oil or milk cartons ran out until a walk-in customer asks for it. Reordering is guesswork, and capital stays locked in dead stock.',
  },
  {
    icon: Languages,
    title: 'Existing POS systems were not made for Pakistan',
    body: 'English-first, desktop-first software with fifteen required fields per entry. It demands typing speed and literacy that a busy shop counter simply does not have.',
  },
];

export function Problem() {
  return (
    <section className="px-4 py-20 bg-slate-50 dark:bg-[#0E1015] transition-colors duration-200">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The Problem"
          title="Your shop already runs on WhatsApp. The records don't."
          subtitle="Kiryana stores, boutiques, and pharmacies across Pakistan take customer orders and confirm payments in WhatsApp all day — then manually track none of it."
        />

        <Stagger className="mt-12 grid gap-6 md:grid-cols-3">
          {problems.map((p) => (
            <StaggerItem key={p.title}>
              <GlassCard className="h-full flex flex-col justify-start">
                <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400">
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-zinc-950 dark:text-white font-heading">
                  {p.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {p.body}
                </p>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export default Problem;
