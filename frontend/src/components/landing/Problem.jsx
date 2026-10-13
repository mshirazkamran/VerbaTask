import { useUiStore } from '../../lib/store';
import { getTranslations } from '../../lib/translations';

export function Problem() {
  const language = useUiStore((s) => s.language);
  const t = getTranslations(language).problem;

  return (
    <section id="problem" className="scroll-mt-20 py-20 sm:py-28">
      <div className="shell grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="display max-w-[14ch] text-[length:var(--fs-2xl)] text-ink sm:text-[length:var(--fs-3xl)]">
            {t.heading}
          </h2>
          <p className="mt-6 max-w-[30rem] leading-relaxed text-ink-2">
            {t.subheading}
          </p>
        </div>

        <ol className="border-t border-ink/80">
          {t.frictions.map((f) => (
            <li key={f.title} className="grid gap-3 border-b border-rule py-8 sm:py-10">
              <h3 className="font-display text-[length:var(--fs-md)] font-semibold tracking-tight text-ink sm:text-[length:var(--fs-xl)]">
                {f.title}
              </h3>
              <p className="max-w-[36rem] leading-relaxed text-ink-2">{f.body}</p>

              {f.ledger && (
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                  <div className="rotate-[1deg] rounded-sm border border-dashed border-rule-2 bg-paper-2 p-4">
                    <p className="label">{t.beforeLabel}</p>
                    <p className="mt-2 font-mono text-sm text-muted line-through decoration-coral decoration-2">
                      {t.beforeSample}
                    </p>
                  </div>
                  <div className="rounded-sm border border-rule bg-surface p-4 shadow-[var(--shadow-contact)]">
                    <p className="label">{t.afterLabel}</p>
                    <p className="mt-2 font-mono text-sm text-ink">
                      <span className="hl">{t.afterName}</span> · {t.afterDetail}
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default Problem;
