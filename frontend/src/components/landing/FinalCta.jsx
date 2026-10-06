import { Link } from 'react-router';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { Logo } from './Logo';
import { Magnet } from '../ui/reactbits/Magnet';

export function FinalCta() {
  return (
    <>
      {/* Final Call to Action Section */}
      <section className="relative px-4 sm:px-6 py-24 sm:py-32 bg-[#287A74] text-white overflow-hidden transition-colors duration-200">
        {/* Atmospheric ambient lighting */}
        <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-[#AEEED3]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 -bottom-32 size-96 rounded-full bg-[#FFF8B0]/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-[#FFF8B0] text-[#3D3400] px-3.5 py-1 text-xs font-bold uppercase tracking-wider mb-6 font-mono">
            Zero Setup Friction
          </span>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12] font-display">
            Send one voice note.{' '}
            <span className="text-[#FFF8B0]">
              Keep a synchronized ledger tonight.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[#EAFBF5] font-body">
            Save the WhatsApp number, speak what you sold today in Urdu or English, and your store
            has verified double-entry records before closing time.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 max-w-sm sm:max-w-none mx-auto">
            <Magnet padding={40} magnetStrength={3}>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#FFF8B0] hover:bg-[#FFF380] text-[#287A74] px-8 py-4 text-sm font-bold shadow-xl transition-all duration-150 active:scale-[0.98] w-full sm:w-auto text-center"
              >
                <WhatsAppIcon className="w-5 h-5 shrink-0" />
                <span>Get Started Free on WhatsApp</span>
              </Link>
            </Magnet>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white px-6 py-4 text-sm font-semibold transition-colors w-full sm:w-auto text-center"
            >
              <span>Merchant Sign In</span>
              <ArrowRight className="w-4 h-4 text-[#FFF8B0] shrink-0" />
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#AEEED3]/90 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#FFF8B0]" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#FFF8B0]" />
              Urdu & Roman Urdu native
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#FFF8B0]" />
              Works on any phone
            </span>
          </div>
        </div>
      </section>

      {/* Hallmark Statement Footer */}
      <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 sm:px-6 py-14 transition-colors duration-200">
        <div className="mx-auto max-w-6xl flex flex-col gap-10">
          <div className="flex flex-col items-start sm:items-center justify-between gap-6 sm:flex-row">
            <Logo />
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-[var(--text-ink-secondary)]">
              <a href="#how-it-works" className="transition-colors hover:text-[#287A74] dark:hover:text-[#AEEED3]">
                How It Works
              </a>
              <a href="#problem" className="transition-colors hover:text-[#287A74] dark:hover:text-[#AEEED3]">
                Problem
              </a>
              <a href="#features" className="transition-colors hover:text-[#287A74] dark:hover:text-[#AEEED3]">
                Features
              </a>
              <a href="#why-whatsapp" className="transition-colors hover:text-[#287A74] dark:hover:text-[#AEEED3]">
                Why WhatsApp
              </a>
              <a href="#pricing" className="transition-colors hover:text-[#287A74] dark:hover:text-[#AEEED3]">
                Pricing
              </a>
              <a href="#faq" className="transition-colors hover:text-[#287A74] dark:hover:text-[#AEEED3]">
                FAQ
              </a>
            </nav>
          </div>

          <div className="pt-6 border-t border-[var(--border-hairline)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[var(--text-ink-mute)]">
            <p>© {new Date().getFullYear()} VerbaTask. Voice-first commerce infrastructure for Pakistani merchants.</p>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-[#287A74]/10 dark:bg-[#AEEED3]/10 text-[#287A74] dark:text-[#AEEED3] px-2 py-0.5 font-mono font-semibold">
                PKR Ready
              </span>
              <span>Lahore • Karachi • Rawalpindi</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default FinalCta;
