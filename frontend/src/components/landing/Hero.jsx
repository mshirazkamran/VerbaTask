import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Mic,
} from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { WhatsAppMock } from './WhatsAppMock';
import { Magnet } from '../ui/reactbits/Magnet';
import { SplitText } from '../ui/reactbits/SplitText';
import LightRays from '../ui/LightRays';
import { useUiStore } from '../../lib/store';

export function Hero() {
  const { theme } = useUiStore();
  const isDark = theme === 'dark';
  const raysColor = isDark ? '#287A74' : '#55A9A0';

  return (
    <section className="relative overflow-hidden px-4 sm:px-6 pb-24 pt-32 sm:pt-40 bg-[var(--bg-canvas)] transition-colors duration-200">
      {/* React Bits LightRays Atmospheric WebGL Canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60 dark:opacity-35 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor={raysColor}
          raysSpeed={1.8}
          lightSpread={0.9}
          rayLength={3.0}
          pulsating={false}
          fadeDistance={2.4}
          saturation={isDark ? 0.9 : 1.2}
          followMouse={true}
          mouseInfluence={0.05}
          noiseAmount={0.0}
          distortion={0.02}
          lightMode={!isDark}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Asymmetric Staggered Grid */}
        <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left Hero Column */}
          <div className="pt-2">
            {/* Tagline Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#287A74]/30 bg-[#287A74]/10 dark:bg-[#287A74]/20 px-3.5 py-1.5 text-xs font-semibold text-[#1B524E] dark:text-[#AEEED3] mb-6"
            >
              <span className="flex size-2 rounded-full bg-[#287A74] dark:bg-[#AEEED3] animate-pulse" />
              <span>Voice Commerce for Pakistani Retail</span>
              <span className="rounded-md bg-[#FFF8B0] text-[#4E4300] px-1.5 py-0.2 text-[10px] font-bold">
                Urdu & Roman Urdu
              </span>
            </motion.div>

            {/* Display Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[var(--text-ink)] leading-[1.08] font-display">
              <SplitText
                text="Run your shop by talking to it."
                tag="span"
                delay={0.04}
                className="text-[var(--text-ink)]"
              />
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.4 }}
              className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[var(--text-ink-secondary)] font-body"
            >
              Log sales, reconcile daily cash, and track inventory stockouts simply by sending
              WhatsApp voice notes or text. Built for Kiryana stores, pharmacies, and merchants
              who don't have time for clunky POS software.
            </motion.p>

            {/* Dual CTAs with Magnet tactile physics */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.4 }}
              className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5"
            >
              <Magnet padding={50} magnetStrength={3}>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#287A74] hover:bg-[#1E5C58] px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-150 w-full sm:w-auto text-center"
                >
                  <WhatsAppIcon className="w-5 h-5 shrink-0" />
                  <span>Start Free on WhatsApp</span>
                </Link>
              </Magnet>

              <a
                href="#problem"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas-soft)] hover:bg-[var(--color-anchor)]/10 text-[var(--text-ink)] px-5 py-3.5 text-sm font-medium transition-colors w-full sm:w-auto text-center"
              >
                <span>See the comparison</span>
                <ArrowRight className="w-4 h-4 text-[#287A74] dark:text-[#AEEED3] shrink-0" />
              </a>
            </motion.div>

            {/* Micro Telemetry Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-10 pt-6 border-t border-[var(--border-hairline)] flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[var(--text-ink-mute)] font-medium"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#287A74] dark:text-[#AEEED3]" />
                Zero hardware cost
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#287A74] dark:text-[#AEEED3]" />
                Urdu voice note transcription
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#287A74] dark:text-[#AEEED3]" />
                Rs. 10,000+ safety approvals
              </span>
            </motion.div>
          </div>

          {/* Right Hero Column: Offset by +48px downwards breaking the baseline */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, type: 'spring', damping: 20, stiffness: 85 }}
            className="relative lg:translate-y-12"
          >
            {/* Tactile Highlight Pill floating top-right */}
            <div className="absolute -top-4 -right-2 sm:-right-4 z-20 rounded-xl border border-[#287A74]/30 bg-[#FFF8B0] text-[#3D3400] px-3.5 py-1.5 text-xs font-semibold shadow-md flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-[#287A74]" />
              <span>Tap to hear voice note demo</span>
            </div>

            {/* Offset Floating Phone Mockup */}
            <WhatsAppMock
              title="VerbaTask Shop AI"
              bubbles={[
                {
                  from: 'merchant',
                  text: '',
                  voice: true,
                  time: '11:14 AM',
                },
                {
                  from: 'bot',
                  text: 'Rate PKR 2,650 per carton theek hai? Aur payment cash thi ya Easypaisa?',
                  sub: 'Transcribed from voice note: "Do carton Dalda oil bech diye"',
                  time: '11:14 AM',
                },
                {
                  from: 'merchant',
                  text: 'Haan bhai, cash mil gaya poora',
                  time: '11:15 AM',
                },
                {
                  from: 'bot',
                  text: 'ORD-2842 darj ho gaya! ✅\nPKR 5,300 Cash wasool.\n📦 Dalda Oil stock: 3 cartons bache hain.',
                  time: '11:15 AM',
                },
              ]}
              className="w-full max-w-md mx-auto"
            />

            {/* Asymmetric Overhanging Stat Pill */}
            <div className="mt-4 -ml-2 sm:-ml-6 inline-flex items-center gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/95 dark:bg-[#111D1C]/95 p-3 shadow-lg">
              <div className="size-8 rounded-lg bg-[#AEEED3]/30 text-[#174845] dark:text-[#AEEED3] flex items-center justify-center font-bold text-xs font-mono">
                -2
              </div>
              <div className="text-xs">
                <p className="font-semibold text-[var(--text-ink)]">Stock Automatically Deducted</p>
                <p className="text-[var(--text-ink-mute)]">Web dashboard updated simultaneously</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
