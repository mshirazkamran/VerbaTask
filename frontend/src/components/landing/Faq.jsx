import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { useUiStore } from '../../lib/store';
import { getTranslations } from '../../lib/translations';

export function FaqList({ items, defaultOpen = 0 }) {
  const [open, setOpen] = useState(defaultOpen);
  const language = useUiStore((s) => s.language);
  const t = getTranslations(language).faq;
  const list = items || t.items;

  return (
    <ul className="border-t-2 border-ink">
      {list.map((f, i) => {
        const isOpen = open === i;
        const id = `faq-${i}`;
        return (
          <li key={f.q} className="border-b border-rule">
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={id}
                className="group flex w-full items-start justify-between gap-6 py-5 text-start"
              >
                <span className="font-display text-lg font-semibold tracking-tight text-ink sm:text-[1.4rem]">{f.q}</span>
                <span
                  className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-pill border transition-[transform,background-color,border-color] duration-200 ${
                    isOpen ? 'rotate-45 border-pear bg-pear text-on-pear' : 'border-rule-2 text-ink-2 group-hover:border-ink'
                  }`}
                  style={{ transitionTimingFunction: 'var(--ease-out)' }}
                  aria-hidden="true"
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>
            <div id={id} className="accordion-panel" data-open={isOpen}>
              <div>
                <p className="max-w-[44rem] pb-6 pe-12 leading-relaxed text-ink-2">{f.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// S3 sticky-pinned head beside the questions.
export function Faq() {
  const language = useUiStore((s) => s.language);
  const t = getTranslations(language).faq;

  return (
    <section id="faq" className="scroll-mt-16 py-20 sm:py-28">
      <div className="shell grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="display max-w-[12ch] text-[length:var(--fs-2xl)] text-ink sm:text-[length:var(--fs-3xl)]">
            {t.heading}
          </h2>
          <p className="mt-5 max-w-[22rem] leading-relaxed text-ink-2">
            {t.subheading}{' '}
            <Link to="/contact" className="link-type">
              {t.writeToUs}
            </Link>
          </p>
        </div>
        <FaqList />
      </div>
    </section>
  );
}

export default Faq;
