import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

/* The hero apparatus: one voice note in, one ledger line out.
   Built from tokens + DOM — no image, no device frame. The pear recording dot
   is the page's single reacting character: it pulses at rest and bursts a coral
   star when the note is played. Values are the demo sale used across the page. */

const BARS = Array.from({ length: 38 }, (_, i) => {
  const t = i / 37;
  const env = Math.exp(-((t - 0.32) ** 2) / 0.03) * 0.75 + Math.exp(-((t - 0.72) ** 2) / 0.02) * 0.6;
  const wobble = 0.5 + 0.5 * Math.sin(i * 2.3);
  return Math.round(18 + 82 * Math.min(1, env * (0.65 + 0.35 * wobble)));
});

const DURATION_MS = 3200;

export function VoiceLedger() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [printed, setPrinted] = useState(true);
  const [bursts, setBursts] = useState([]);
  const raf = useRef(0);
  const dotRef = useRef(null);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const toggle = () => {
    if (playing) {
      cancelAnimationFrame(raf.current);
      setPlaying(false);
      return;
    }
    const id = Date.now();
    setBursts((b) => [...b, id]);
    setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 460);

    setPrinted(false);
    setPlaying(true);
    const start = performance.now() - progress * DURATION_MS;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / DURATION_MS);
      setProgress(p);
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
        setPrinted(true);
        setTimeout(() => setProgress(0), 900);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const seconds = Math.round(progress * 7);

  return (
    <figure className="relative mx-auto w-full max-w-[25rem] lg:mr-0" aria-label="A voice note becoming a ledger entry">
      {/* emission behind the instrument — night only, smaller than the apparatus */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-10 bottom-10 hidden rounded-[40px] dark:block"
        style={{ background: 'radial-gradient(60% 55% at 50% 40%, var(--color-glow), transparent 70%)' }}
      />

      {/* 1 · the voice note */}
      <div className="relative rounded-slab border border-rule bg-surface p-4 shadow-[var(--shadow-lift)] sm:p-5">
        <div className="flex items-center justify-between">
          <p className="label">Voice note · Urdu</p>
          <p className="label font-tabular">0:{String(playing || progress ? seconds : 7).padStart(2, '0')}</p>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            className="relative grid size-14 shrink-0 place-items-center rounded-pill bg-ink text-paper transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5"
            aria-label={playing ? 'Pause the voice note' : 'Play the voice note'}
          >
            {playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
            <span ref={dotRef} className="rec-dot absolute -right-0.5 -top-0.5 size-3.5" aria-hidden="true" />
            {bursts.map((id) => (
              <span key={id} className="star-burst" style={{ right: '-18px', top: '-6px' }} aria-hidden="true" />
            ))}
          </button>

          <div className="flex h-12 min-w-0 flex-1 items-center gap-[3px]" aria-hidden="true">
            {BARS.map((h, i) => {
              const lit = i / BARS.length <= progress && progress > 0;
              return (
                <span
                  key={i}
                  className="flex-1 rounded-pill transition-colors duration-100"
                  style={{
                    height: `${h}%`,
                    minWidth: 2,
                    background: lit ? 'var(--color-primary)' : 'var(--color-rule-2)',
                  }}
                />
              );
            })}
          </div>
        </div>

        <p className="mt-4 border-t border-dashed border-rule-2 pt-3 text-sm text-ink-2">
          “Do carton Dalda bech diye, cash mil gaya.”
        </p>
      </div>

      {/* connector */}
      <div aria-hidden="true" className="mx-auto h-8 w-px bg-rule-2" />

      {/* 2 · the ledger line — the one tilted card */}
      <div
        className={`relative rotate-[-1.5deg] rounded-card border border-rule bg-paper-2 p-4 font-mono text-[13px] text-ink shadow-[var(--shadow-ambient)] transition-[opacity,transform] duration-500 sm:p-5 ${
          printed ? 'opacity-100' : 'translate-y-2 opacity-40'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-out)' }}
      >
        <div className="flex items-center justify-between">
          <span className="label">Ord-2842 · 11:15</span>
          <span className="rounded-pill bg-pear px-2 py-0.5 text-[11px] font-semibold text-on-pear">Logged</span>
        </div>
        <dl className="mt-3 space-y-1.5 font-tabular">
          <div className="flex justify-between gap-3">
            <dt className="truncate">Dalda Oil 5L × 2</dt>
            <dd className="shrink-0">5,300</dd>
          </div>
          <div className="flex justify-between gap-3 text-muted">
            <dt>Paid</dt>
            <dd>Cash</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-dashed border-rule-2 pt-1.5">
            <dt>Stock left</dt>
            <dd className="text-coral-deep dark:text-coral">3 cartons</dd>
          </div>
        </dl>
      </div>

      {/* leader-line callouts — desktop only; the same facts are in the copy for mobile */}
      <ul aria-hidden="true" className="pointer-events-none absolute inset-0 hidden xl:block">
        <Callout top="44%" text="Heard · Roman Urdu" />
        <Callout top="68%" text="Rate · confirmed" />
        <Callout top="88%" text="Stock · −2 cartons" />
      </ul>
    </figure>
  );
}

function Callout({ top, text }) {
  return (
    <li
      className="absolute flex flex-row-reverse items-center gap-2"
      style={{ top, right: 'calc(100% + 0.5rem)' }}
    >
      <span className="h-px w-7 bg-rule-2" />
      <span className="size-1.5 rounded-pill bg-primary" />
      <span className="label whitespace-nowrap">{text}</span>
    </li>
  );
}

export default VoiceLedger;
