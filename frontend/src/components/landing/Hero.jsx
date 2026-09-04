import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { WhatsAppMock } from './WhatsAppMock';
import { CountUp } from './glass';
import LightRays from '../ui/LightRays';
import { useUiStore } from '../../lib/store';

export function Hero() {
  const { theme } = useUiStore();
  const isDark = theme === 'dark';
  const raysColor = isDark ? '#10B981' : '#047857';

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:pt-36 bg-white dark:bg-[#0B0D11] transition-colors duration-200">
      {/* React Bits LightRays atmospheric WebGL lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-90 dark:opacity-50 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor={raysColor}
          raysSpeed={2.2}
          lightSpread={0.85}
          rayLength={3.2}
          pulsating={false}
          fadeDistance={2.6}
          saturation={isDark ? 1.0 : 1.3}
          followMouse={true}
          mouseInfluence={0.06}
          noiseAmount={0.0}
          distortion={0.03}
          lightMode={!isDark}
        />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {/* Tagline Badge */}
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            AI-Powered Voice Commerce for Pakistani Retail
          </motion.span>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, type: 'spring', stiffness: 70, damping: 17 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white font-heading leading-[1.1]"
          >
            Run your shop by{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 dark:from-emerald-400 dark:via-emerald-300 dark:to-amber-400 bg-clip-text text-transparent">
              talking to it
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-zinc-600 dark:text-zinc-300"
          >
            Log sales, track stock, and manage udhaar by sending WhatsApp voice notes or text
            in Urdu, Roman Urdu, or English. No complicated POS hardware, no forms to fill.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-sm sm:max-w-none"
          >
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all duration-150 w-full sm:w-auto text-center"
            >
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
              <span>Get Started Free</span>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white px-5 py-3.5 text-sm font-semibold transition-colors w-full sm:w-auto text-center"
            >
              <span>See how it works</span>
              <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </a>
          </motion.div>

          {/* Realistic Verified Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-10 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-x-10 sm:gap-y-4 border-t border-zinc-200 dark:border-white/10 pt-6"
          >
            <div>
              <p className="text-lg sm:text-2xl font-bold text-zinc-950 dark:text-white font-heading">
                <CountUp value={3} suffix=" Langs" />
              </p>
              <p className="mt-0.5 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">Urdu, Roman, EN</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-zinc-950 dark:text-white font-heading">
                <CountUp value={2} prefix="< " suffix=" Sec" />
              </p>
              <p className="mt-0.5 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">AI voice speed</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-heading">
                PKR 0
              </p>
              <p className="mt-0.5 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">Free for merchants</p>
            </div>
          </motion.div>

          {/* Value Bullets */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              High-value sales require merchant confirmation
            </span>
            <span className="inline-flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              Works on low-speed 3G/4G on any Android phone
            </span>
          </motion.div>
        </div>

        {/* Hero Interactive WhatsApp Demo Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 60, damping: 16 }}
          className="relative"
        >
          <WhatsAppMock
            bubbles={[
              {
                from: 'merchant',
                text: 'Aaj 10 kg chawal 480 ke hisaab se bech diye, cash mil gaya',
                time: '10:02 AM',
              },
              {
                from: 'bot',
                text: 'Order ORD-1042 logged! Sufi Basmati Rice 10 kg @ PKR 480. Total PKR 4,800 paid in Cash. Stock left: 42 kg.',
                time: '10:02 AM',
              },
              {
                from: 'merchant',
                text: '',
                voice: true,
                time: '10:04 AM',
              },
              {
                from: 'bot',
                text: 'Voice note understood: "Dalda oil 2 carton udhaar pe bech diye". Recorded as Pending Payment (Udhaar). Remaining stock: 4 carton.',
                sub: 'Transcribed from Urdu voice note',
                time: '10:04 AM',
              },
            ]}
          />
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
