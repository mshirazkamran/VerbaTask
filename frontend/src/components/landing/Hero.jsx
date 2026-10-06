import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { VoiceLedger } from './VoiceLedger';
import { scrollToHash } from '../../lib/scroll';

// Meter strip: a printed readout of the demo note — heights from two gaussians, never flat.
const TICKS = Array.from({ length: 96 }, (_, i) => {
  const t = i / 95;
  const a = Math.exp(-((t - 0.24) ** 2) / 0.012);
  const b = Math.exp(-((t - 0.61) ** 2) / 0.02) * 0.8;
  const c = Math.exp(-((t - 0.86) ** 2) / 0.006) * 0.55;
  const v = Math.min(1, a + b + c + 0.08 + 0.06 * Math.sin(i * 1.7));
  return { h: Math.round(10 + 90 * v), o: (0.28 + 0.72 * v).toFixed(2) };
});

export function Hero() {
  return (
    <>
      <section className="relative overflow-clip dark:blueprint">
        <div className="shell grid items-start gap-14 pb-16 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="min-w-0">
            <p className="label reveal" style={{ '--i': 0 }}>
              WhatsApp · Urdu · Roman Urdu
            </p>

            <h1
              className="display reveal mt-5 max-w-[11ch] text-[length:var(--text-display)] text-ink"
              style={{ '--i': 1 }}
            >
              Run your shop by <span className="hl hl-draw">talking</span> to&nbsp;it.
            </h1>

            <p
              className="reveal mt-7 max-w-[31rem] text-lg leading-relaxed text-ink-2"
              style={{ '--i': 2 }}
            >
              Send a voice note when you make a sale. VerbaTask logs it, takes it off your stock,
              and asks you only what it couldn’t hear. Built for kiryana stores and pharmacies,
              not for people who like filling in forms.
            </p>

            <div className="reveal mt-9 flex flex-wrap items-center gap-x-7 gap-y-5" style={{ '--i': 3 }}>
              <Link to="/signup" className="btn btn--lg">
                <WhatsAppIcon className="size-5" />
                Start free on WhatsApp
              </Link>
              <a
                href="/#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHash('#how-it-works');
                }}
                className="link-type"
              >
                See how it works
                <ArrowRight className="size-4" />
              </a>
            </div>

            <dl
              className="reveal mt-12 grid max-w-[34rem] grid-cols-3 border-t border-rule pt-5"
              style={{ '--i': 4 }}
            >
              {[
                ['Hardware', 'None'],
                ['Setup', 'One code'],
                ['Asks before', 'Rs. 10,000'],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0 pr-3">
                  <dt className="label">{k}</dt>
                  <dd className="mt-1 font-display text-base font-semibold tracking-tight text-ink sm:text-lg">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="reveal min-w-0 lg:pt-14" style={{ '--i': 3 }}>
            <VoiceLedger />
          </div>
        </div>
      </section>

      {/* Lumen meter strip — full-bleed readout below the hero */}
      <aside aria-label="Voice note readout" className="border-y border-rule bg-paper-2">
        <div className="shell grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-6">
          <p className="label whitespace-nowrap">Signal · 0:07</p>
          <div className="meter__bars" aria-hidden="true">
            {TICKS.map((t, i) => (
              <span key={i} style={{ height: `${t.h}%`, opacity: t.o }} />
            ))}
          </div>
          <p className="label hidden whitespace-nowrap sm:block">Parsed · item · qty · rate · payment</p>
        </div>
      </aside>
    </>
  );
}

export default Hero;
