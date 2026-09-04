import { motion } from 'motion/react';
import {
  Milestone,
  CheckCircle2,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { WhatsAppMock } from './WhatsAppMock';
import { Reveal, SectionHeading } from './glass';

function InventoryMock() {
  const rows = [
    { name: 'Dalda Cooking Oil 5L', qty: '3 cartons', low: true },
    { name: 'Sufi Basmati Rice', qty: '42 kg', low: false },
    { name: 'Tapal Danedar Tea 900g', qty: '5 packs', low: true },
    { name: 'Olpers Milk 1L Pack', qty: '64 packs', low: false },
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-slate-50 dark:border-white/10 dark:bg-[#12151C] p-5 shadow-md dark:shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Live Inventory</p>
        </div>
        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          2 items low
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <div
            key={r.name}
            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors ${
              r.low
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[0.04]'
            }`}
          >
            <span className="text-sm text-zinc-900 dark:text-white font-medium">{r.name}</span>
            <span
              className={`font-mono text-sm font-semibold ${
                r.low ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {r.qty}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    icon: Milestone,
    title: 'Guided WhatsApp Order Flow',
    body: "The AI asks only what's missing — item, quantity, rate, paid or udhaar — one short question at a time in whatever language you wrote in. No menus to memorize.",
    mock: (
      <WhatsAppMock
        bubbles={[
          { from: 'merchant', text: '2 carton oil bech diye', time: '11:15 AM' },
          { from: 'bot', text: 'Rate PKR 2,650 per carton theek hai?', time: '11:15 AM' },
          { from: 'merchant', text: 'Haan, aur paisay mil gaye', time: '11:16 AM' },
          { from: 'bot', text: 'Done! ORD-2842 recorded, PKR 5,300 paid in Cash. Dalda Oil stock: 3 cartons left.', time: '11:16 AM' },
        ]}
      />
    ),
  },
  {
    icon: CheckCircle2,
    title: 'Voice-First Rules & Automations',
    body: "Describe what you need in a voice note the way you'd instruct a shop assistant. VerbaTask creates reorder triggers and payment reminders that you can turn off with a simple reply.",
    mock: (
      <WhatsAppMock
        bubbles={[
          { from: 'merchant', text: '', voice: true, time: '06:40 PM' },
          {
            from: 'bot',
            text: 'Automation created! When: stock changes. If: Tapal Tea falls below 10 packs. Then: send me an alert on WhatsApp.',
            sub: 'Transcribed from Roman Urdu voice note ("Chai 10 pack se kam ho to yaad dilana")',
            time: '06:40 PM',
          },
        ]}
      />
    ),
  },
  {
    icon: Package,
    title: 'Inventory Stays in Real-Time Sync',
    body: 'Every logged order immediately updates your inventory counts. Low-stock warnings alert you before shelves go empty, and your web dashboard reflects the exact same truth as WhatsApp.',
    mock: <InventoryMock />,
  },
  {
    icon: ShieldAlert,
    title: 'Confirmation Prompts on High-Value Sales',
    body: 'Any transaction above your custom threshold pauses and requests explicit confirmation. The AI never quietly commits a large or irreversible transaction without your say-so.',
    mock: (
      <WhatsAppMock
        bubbles={[
          {
            from: 'bot',
            text: 'Approval needed: Order total of PKR 26,500 exceeds your PKR 20,000 threshold. Reply HAAN to confirm, or NAHI to cancel.',
            time: '12:02 PM',
          },
          { from: 'merchant', text: 'HAAN', time: '12:03 PM' },
          { from: 'bot', text: 'Approved and logged. ORD-2840 marked as completed.', time: '12:03 PM' },
        ]}
      />
    ),
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-24 bg-white dark:bg-[#0B0D11] transition-colors duration-200">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="What It Does"
          title="A WhatsApp chat that operates like a full back office"
          subtitle="Everything you need to run your shop without the complexity of traditional enterprise software."
        />

        <div className="mt-16 space-y-20">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <Reveal className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white font-heading">
                  {f.title}
                </h3>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {f.body}
                </p>
              </Reveal>

              <motion.div
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-70px' }}
                transition={{ type: 'spring', stiffness: 70, damping: 18 }}
                className={i % 2 === 1 ? 'lg:order-1' : ''}
              >
                {f.mock}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
