import { useState } from 'react';
import { useUiStore } from '../../lib/store';
import { getTranslations } from '../../lib/translations';

/* The one deliberately dense section: a large "it understands you" panel plus a
   linked index of everything else the product does. */

export function Features() {
  const [active, setActive] = useState(0);
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';
  const t = getTranslations(language).features;

  return (
    <section id="features" className="scroll-mt-16 py-20 sm:py-24">
      <div className="shell grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <div className="min-w-0 rounded-slab bg-ink p-6 text-paper sm:p-10 dark:bg-paper-3 dark:text-ink">
          <h2 className="display max-w-[15ch] text-[length:var(--fs-2xl)] sm:text-[length:var(--fs-3xl)]">
            {t.title}
          </h2>
          <p className="mt-5 max-w-[32rem] leading-relaxed opacity-80">
            {t.body}
          </p>

          <ul className="mt-10 border-t border-current/20" role="tablist" aria-label="Example phrases">
            {t.phrases.map((p, i) => {
              const on = active === i;
              return (
                <li key={p.said} className="border-b border-current/20">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(i)}
                    className="grid w-full gap-1 py-4 text-start"
                  >
                    <span className={`font-display text-lg font-medium tracking-tight transition-opacity duration-150 sm:text-[1.6rem] ${on ? 'opacity-100' : 'opacity-55 hover:opacity-85'}`}>
                      “{p.said}”
                    </span>
                    <span
                      className={`font-mono text-xs uppercase tracking-[0.08em] text-pear dark:text-pear-deep ${on ? 'block' : 'hidden'}`}
                    >
                      {isUrdu ? '← ' : '→ '}{p.heard}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <p className="label">{t.everythingElse}</p>
          <ul className="mt-4 border-t border-ink/80">
            {t.capabilities.map((c) => (
              <li key={c.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-rule py-4">
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">{c.name}</h3>
                <span className="label self-center">{c.tag}</span>
                <p className="col-span-2 text-sm leading-relaxed text-ink-2">{c.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default Features;
