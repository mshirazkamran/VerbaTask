import {
  CloudOff,
  Languages,
  Smartphone,
  BotMessageSquare,
} from 'lucide-react';
import { GlassCard, SectionHeading, Stagger, StaggerItem } from './glass';

const reasons = [
  {
    icon: CloudOff,
    title: 'Zero App Installs',
    body: 'No Play Store downloads, no 100MB apps consuming limited internal phone storage. Just a verified WhatsApp contact in a chat app that is already open all day.',
  },
  {
    icon: Languages,
    title: 'No English Literacy Barrier',
    body: 'Urdu voice notes, Roman Urdu typing, and Urdu script are all first-class citizens. Shopkeepers simply tap the microphone icon and speak naturally.',
  },
  {
    icon: Smartphone,
    title: 'Runs on Everyday Android Phones',
    body: 'If a phone can send a basic WhatsApp message over a 3G/4G connection, it can power an entire shop inventory and sales operations layer.',
  },
  {
    icon: BotMessageSquare,
    title: 'Meets Shopkeepers Where They Already Are',
    body: 'Customers already order over WhatsApp. Suppliers already confirm stock over WhatsApp. Bringing the sales ledger into the same app eliminates context switching.',
  },
];

export function WhyWhatsApp() {
  return (
    <section id="why-whatsapp" className="px-4 py-24 bg-white dark:bg-[#0B0D11] transition-colors duration-200">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Why WhatsApp-First"
          title="The most powerful interface is the one already in your pocket"
          subtitle="Software adoption fails when it forces shopkeepers through long tutorials and complicated hardware setups. We removed every barrier."
        />

        <Stagger className="mt-14 grid gap-6 sm:grid-cols-2">
          {reasons.map((r) => (
            <StaggerItem key={r.title}>
              <GlassCard className="h-full flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <r.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-white font-heading">
                    {r.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {r.body}
                  </p>
                </div>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export default WhyWhatsApp;
