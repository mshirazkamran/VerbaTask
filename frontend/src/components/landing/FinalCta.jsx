import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { Logo } from './Logo';
import { Reveal } from './glass';

export function FinalCta() {
  return (
    <>
      {/* Final Call to Action Section */}
      <section className="relative px-4 py-16 sm:py-24 bg-slate-50 dark:bg-[#0E1015] border-t border-zinc-200 dark:border-white/10 transition-colors duration-200">
        <Reveal className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 mb-4">
            Zero Setup Barrier
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 dark:text-white font-heading tracking-tight leading-[1.15]">
            Send one voice note.{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-amber-500 dark:from-emerald-400 dark:to-amber-400 bg-clip-text text-transparent">
              Start keeping real records.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            Save the number, speak what you sold today in Urdu or English, and your store has a synchronized ledger by tonight.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 max-w-xs sm:max-w-none mx-auto">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all duration-150 w-full sm:w-auto text-center"
            >
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
              <span>Get Started Free</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white px-6 py-3.5 text-sm font-semibold transition-colors w-full sm:w-auto text-center"
            >
              <span>Merchant Log in</span>
              <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Clean Footer */}
      <footer className="border-t border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0B0D11] px-4 py-12 transition-colors duration-200">
        <div className="mx-auto max-w-6xl flex flex-col gap-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Logo />
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
              <a href="#how-it-works" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                How It Works
              </a>
              <a href="#features" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                Features
              </a>
              <a href="#why-whatsapp" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                Why WhatsApp
              </a>
              <a href="#pricing" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                Pricing
              </a>
              <a href="#faq" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                FAQ
              </a>
            </nav>
          </div>

          <div className="pt-6 border-t border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Contact Email Chip matching user badge */}
            <a
              href="mailto:verbatask.business@gmail.com"
              className="inline-flex items-center gap-3 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group shadow-xs max-w-full"
            >
              <span className="w-8 h-8 rounded-full bg-[#004D40] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                V
              </span>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">VerbaTask</p>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors font-mono leading-tight truncate">
                  verbatask.business@gmail.com
                </p>
              </div>
            </a>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              &copy; {new Date().getFullYear()} VerbaTask. AI Retail Assistant.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default FinalCta;
