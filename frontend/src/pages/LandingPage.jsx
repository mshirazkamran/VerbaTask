import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  IconMicrophone,
  IconBoxSeam,
  IconGitBranch,
  IconClipboardCheck,
  IconCreditCard,
  IconChartBar,
  IconArrowRight,
} from '@tabler/icons-react';
import { LandingLayout } from '../components/layout/LandingLayout';

const ease = [0.16, 1, 0.3, 1];

const heroStagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.12 } },
};

const heroItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease },
};

const features = [
  {
    icon: IconMicrophone,
    title: 'Voice-first logging',
    desc: 'Speak a sale in Urdu or English. Whisper AI transcribes it, Qwen NLP parses it into an order. Under 2 seconds.',
    accent: 'text-primary bg-primary/10',
    span: 'lg:col-span-3',
    extra: (
      <div className="mt-6 flex items-start gap-3">
        <div className="bg-primary/10 rounded-lg p-3 max-w-[220px]">
          <p className="text-[11px] text-ink leading-snug">
            "Do kilo chawal aur ek kilo daal chana, cash mein"
          </p>
          <p className="text-[9px] text-ink-mute mt-1.5 flex items-center gap-1">
            <IconMicrophone className="w-2.5 h-2.5" />
            Voice note &middot; Urdu
          </p>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-3 max-w-[160px]">
          <p className="text-[11px] text-ink leading-snug">
            Order logged. Stock updated. Rs. 580 recorded.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: IconBoxSeam,
    title: 'Live inventory',
    desc: 'Stock deducts automatically when a sale logs. Low-stock alerts fire before you run out, not after.',
    accent: 'text-emerald-600 bg-emerald-500/10',
    span: 'lg:col-span-3',
    extra: (
      <div className="mt-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-ruby animate-pulse" />
        <span className="text-xs text-ink-mute">doodh &middot; 6 litre left</span>
      </div>
    ),
  },
  {
    icon: IconGitBranch,
    title: 'Workflow automation',
    desc: 'Set triggers in plain language. Get notified when stock drops below a threshold, or on a schedule.',
    accent: 'text-amber-600 bg-amber-500/10',
    span: 'lg:col-span-2',
    extra: (
      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-amber-500/10 border border-amber-500/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        <span className="text-[11px] text-amber-600 font-medium">Active workflow</span>
      </div>
    ),
  },
  {
    icon: IconClipboardCheck,
    title: 'Approval controls',
    desc: 'Orders above Rs. 10,000 need your sign-off first. Approve or reject directly from WhatsApp.',
    accent: 'text-ruby bg-ruby/10',
    span: 'lg:col-span-2',
    extra: (
      <div className="mt-4 flex items-center gap-2">
        <span className="text-[10px] px-2.5 py-1 rounded-pill bg-ruby/10 text-ruby font-medium uppercase tracking-wide">
          Pending
        </span>
        <span className="text-xs text-ink-mute">Rs. 11,920 &middot; nurpur butter x16</span>
      </div>
    ),
  },
  {
    icon: IconCreditCard,
    title: 'Payment tracking',
    desc: 'Track every sale by payment method. See your cash, EasyPaisa, JazzCash, and bank split at a glance.',
    accent: 'text-primary bg-primary/10',
    span: 'lg:col-span-2',
    extra: (
      <div className="mt-4 flex items-center gap-1.5">
        <div className="w-5 h-5 rounded bg-[#533afd]" />
        <div className="w-5 h-5 rounded bg-[#ea2261]" />
        <div className="w-5 h-5 rounded bg-[#9b6829]" />
        <div className="w-5 h-5 rounded bg-[#f96bee]" />
      </div>
    ),
  },
  {
    icon: IconChartBar,
    title: 'Visual dashboard',
    desc: 'Charts, tables, and real-time stats. See your revenue trend, top products, and payment breakdown.',
    accent: 'text-magenta bg-magenta/10',
    span: 'lg:col-span-3',
    extra: (
      <svg className="mt-4 w-full h-8" viewBox="0 0 200 40" fill="none" preserveAspectRatio="none">
        <path
          d="M0 30 L30 25 L60 32 L90 18 L120 22 L150 12 L180 16 L200 8"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
        <path
          d="M0 30 L30 25 L60 32 L90 18 L120 22 L150 12 L180 16 L200 8 L200 40 L0 40 Z"
          fill="var(--color-primary)"
          opacity="0.08"
        />
      </svg>
    ),
  },
];

function StatPreview({ label, value }) {
  return (
    <div className="bg-canvas rounded-md p-3 shadow-card">
      <p className="text-[10px] text-ink-mute uppercase tracking-wider font-medium">{label}</p>
      <p className="font-numeric text-lg font-semibold text-ink mt-0.5">{value}</p>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-8 bg-gradient-to-r from-primary/15 via-magenta/10 to-primary/15 rounded-3xl blur-3xl" />
      {/* Browser chrome */}
      <div className="relative bg-canvas rounded-xl border border-hairline shadow-float overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline bg-canvas-soft/60">
          <div className="w-2.5 h-2.5 rounded-full bg-ruby/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-lemon/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="text-[10px] text-ink-mute ml-3 font-mono">verbatask.app</span>
        </div>
        <div className="p-5 bg-canvas-soft space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatPreview label="Today's Sales" value="Rs. 18,465" />
            <StatPreview label="Items Sold" value="27" />
            <StatPreview label="Low Stock" value="1" />
            <StatPreview label="Pending" value="0" />
          </div>
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 bg-canvas rounded-md p-3 shadow-card">
              <p className="text-[10px] text-ink-mute font-medium mb-2">Revenue Activity</p>
              <div className="h-16 rounded bg-gradient-to-t from-primary/20 via-primary/8 to-transparent flex items-end">
                <div className="w-full h-px bg-primary/30" />
              </div>
            </div>
            <div className="col-span-2 bg-canvas rounded-md p-3 shadow-card">
              <p className="text-[10px] text-ink-mute font-medium mb-2">Payment Methods</p>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <div className="w-2.5 h-2.5 rounded-full bg-magenta" />
                <div className="w-2.5 h-2.5 rounded-full bg-lemon" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
          <div className="bg-canvas rounded-md shadow-card overflow-hidden">
            <div className="px-3 py-2 border-b border-hairline">
              <p className="text-[10px] text-ink-mute font-medium">Recent Orders</p>
            </div>
            <div className="divide-y divide-hairline">
              <div className="px-3 py-2 flex justify-between items-center">
                <span className="text-[11px] text-ink">Sufi Canola Oil x11</span>
                <span className="text-[11px] font-numeric font-semibold text-ink">Rs. 6,545</span>
              </div>
              <div className="px-3 py-2 flex justify-between items-center">
                <span className="text-[11px] text-ink">nurpur butter x16</span>
                <span className="text-[11px] font-numeric font-semibold text-ink">Rs. 11,920</span>
              </div>
              <div className="px-3 py-2 flex justify-between items-center">
                <span className="text-[11px] text-ink">chawal x29, Dall mong x20</span>
                <span className="text-[11px] font-numeric font-semibold text-ink">Rs. 10,875</span>
              </div>
              <div className="px-3 py-2 flex justify-between items-center">
                <span className="text-[11px] text-ink">doodh x3</span>
                <span className="text-[11px] font-numeric font-semibold text-ink">Rs. 600</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <LandingLayout>
      {/* Hero — asymmetric: text left, mockup right */}
      <section className="relative overflow-hidden mesh-gradient-bg">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <motion.div
              variants={heroStagger}
              initial="initial"
              animate="animate"
            >
              <motion.h1
                className="font-heading text-4xl sm:text-5xl lg:text-6xl font-light tracking-[-1.5px] text-ink leading-[1.05]"
                variants={heroItem}
              >
                Sell with your voice.
                <br />
                Track everything.
              </motion.h1>
              <motion.p
                className="font-body text-base sm:text-lg text-ink-mute max-w-lg mt-6 leading-relaxed"
                variants={heroItem}
              >
                VerbaTask turns WhatsApp voice notes into sales records, stock updates, and automated workflows. No app to learn. Just speak.
              </motion.p>
              <motion.div
                className="flex flex-wrap items-center gap-3 mt-10"
                variants={heroItem}
              >
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-pill text-base font-medium hover:bg-primary-deep transition-colors"
                >
                  Get started free
                  <IconArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 text-ink-secondary px-6 py-3 rounded-pill text-base font-medium border border-hairline hover:bg-canvas-soft transition-colors"
                >
                  See how it works
                </a>
              </motion.div>
            </motion.div>

            {/* Right: Dashboard mockup */}
            <motion.div
              className="lg:rotate-[1.5deg]"
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease }}
            >
              <DashboardMockup />
            </motion.div>
          </div>
        </div>
      </section>


      {/* Features — bento grid with varied card sizes */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div className="max-w-2xl mx-auto text-center" {...fadeUp}>
            <p className="font-heading text-xs font-medium uppercase tracking-wider text-primary mb-3">
              What you get
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-light tracking-[-0.96px] text-ink leading-[1.15]">
              Everything a shopkeeper needs, nothing they don't.
            </h2>
            <p className="font-body text-sm text-ink-mute mt-4 leading-relaxed">
              Voice logging, live inventory, automation, approvals, and a visual dashboard. All connected to WhatsApp.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-5 mt-14">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className={`glass-card rounded-xl p-6 border border-hairline shadow-card hover:shadow-float hover:border-primary/40 transition-all duration-300 ${feature.span}`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease }}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${feature.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading text-lg font-light tracking-[-0.26px] text-ink">
                    {feature.title}
                  </h3>
                  <p className="font-body text-sm text-ink-mute mt-2 leading-relaxed">
                    {feature.desc}
                  </p>
                  {feature.extra && <div>{feature.extra}</div>}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works — offset middle step */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-canvas-soft">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div className="max-w-2xl mx-auto text-center" {...fadeUp}>
            <p className="font-heading text-xs font-medium uppercase tracking-wider text-primary mb-3">
              How it works
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-light tracking-[-0.96px] text-ink leading-[1.15]">
              Three steps. Zero training.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mt-14 max-w-5xl mx-auto">
            {[
              {
                num: '1',
                title: 'Set up your shop',
                desc: 'Create an account, add your products, and link your WhatsApp number. Takes 2 minutes.',
              },
              {
                num: '2',
                title: 'Speak naturally',
                desc: 'Send a voice note in Urdu or English. VerbaTask transcribes and logs the sale instantly.',
                offset: true,
              },
              {
                num: '3',
                title: 'Track everything',
                desc: 'Stock deducts, workflows trigger, and your dashboard updates in real time.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                className={`text-center ${step.offset ? 'md:mt-12' : ''}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.12, ease }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-heading text-xl font-medium flex items-center justify-center mx-auto mb-5">
                  {step.num}
                </div>
                <h3 className="font-heading text-lg font-light tracking-[-0.26px] text-ink">
                  {step.title}
                </h3>
                <p className="font-body text-sm text-ink-mute mt-2 leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="py-16 lg:py-20 bg-brand-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: '2s', label: 'To log a sale' },
              { value: '2', label: 'Languages supported' },
              { value: '0', label: 'Apps to install' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
              >
                <p className="font-numeric text-3xl sm:text-4xl lg:text-5xl font-light text-on-primary">{stat.value}</p>
                <p className="text-xs sm:text-sm text-on-primary/60 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div {...fadeUp}>
              <p className="font-heading text-xs font-medium uppercase tracking-wider text-primary mb-3">
                Common questions
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-light tracking-[-0.96px] text-ink leading-[1.15]">
                Frequently asked questions
              </h2>
            </motion.div>
          </div>

          <div className="max-w-2xl mx-auto mt-10 space-y-4">
            {[
              {
                q: 'What is VerbaTask?',
                a: 'VerbaTask is a WhatsApp-first tool for small shopkeepers in Pakistan. You speak a sale in Urdu or English, and it automatically records the order, deducts stock, and triggers any workflows you set up.',
              },
              {
                q: 'Do I need to download an app?',
                a: 'No. VerbaTask works entirely through WhatsApp. You can also use the web dashboard for charts and detailed views.',
              },
              {
                q: 'What languages are supported?',
                a: 'Urdu and English, both written and spoken. Voice notes are transcribed by Whisper AI, which handles Urdu natively.',
              },
            ].map((faq, i) => (
              <motion.div
                key={faq.q}
                className="border border-hairline rounded-lg p-5 bg-canvas"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.06, ease }}
              >
                <h3 className="font-heading text-base font-light text-ink">{faq.q}</h3>
                <p className="font-body text-sm text-ink-mute mt-2 leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Link
              to="/faq"
              className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
            >
              See all FAQs
              <IconArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-canvas-cream">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-heading text-3xl sm:text-4xl font-light tracking-[-0.96px] text-ink leading-[1.15]">
              Ready to simplify your shop?
            </h2>
            <p className="font-body text-base text-ink-mute mt-4 max-w-lg mx-auto leading-relaxed">
              Create an account, link your WhatsApp number, and start logging sales with your voice. Free to use.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-pill text-base font-medium mt-8 hover:bg-primary-deep transition-colors"
            >
              Get started free
              <IconArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </LandingLayout>
  );
}
