import { Link } from 'react-router';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { useUiStore } from '../../lib/store';
import { getTranslations } from '../../lib/translations';

export function Pricing() {
  const language = useUiStore((s) => s.language);
  const t = getTranslations(language).pricing;

  return (
    <section id="pricing" className="scroll-mt-16 bg-pear text-on-pear dark:border-y dark:border-rule dark:bg-paper-2 dark:text-ink">
      <div className="shell grid gap-12 py-20 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-on-pear/15 dark:bg-pear/20 text-on-pear dark:text-pear mb-3">
            {t.badge}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{t.heading}</h2>
          <p className="mt-4 text-base opacity-90 leading-relaxed max-w-sm">
            {t.subheading}
          </p>
        </div>

        <div className="min-w-0 lg:pt-4">
          <p className="max-w-[34rem] text-lg leading-relaxed">
            {t.description}
          </p>
          <ul className="mt-8 grid border-t border-on-pear/25 dark:border-rule sm:grid-cols-2 sm:gap-x-8">
            {t.included.map((item) => (
              <li key={item} className="border-b border-on-pear/25 dark:border-rule py-3 text-sm font-medium">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link to="/signup" className="btn btn--ink btn--lg">
              <WhatsAppIcon className="size-5" />
              {t.cta}
            </Link>
            <span className="text-sm">{t.note}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Pricing;
