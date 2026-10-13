import { Link } from 'react-router';
import { Mail } from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { GithubIcon } from '../ui/GithubIcon';
import { Logo } from './Logo';
import { useUiStore } from '../../lib/store';
import { getTranslations } from '../../lib/translations';

/* Ft5 · Statement footer. Knobs: sentence width=28ch, wordmark=under sentence, rule=hairline.
   The closing CTA lives inside it, so the page ends once instead of twice. */
export function FinalCta({ showCta = true }) {
  const language = useUiStore((s) => s.language);
  const t = getTranslations(language).finalCta;

  return (
    <footer className="bg-ink text-paper dark:border-t dark:border-rule dark:bg-paper-2 dark:text-ink">
      <div className="shell pb-10 pt-20 sm:pt-28">
        <p className="display max-w-[16ch] text-[length:var(--fs-2xl)] sm:text-[length:var(--text-display)]">
          {t.heading}
        </p>

        {showCta && (
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link to="/signup" className="btn btn--lg">
              <WhatsAppIcon className="size-5" />
              {t.ctaPrimary}
            </Link>
            <Link
              to="/login"
              className="whitespace-nowrap font-semibold underline decoration-pear decoration-2 underline-offset-[0.3em] transition-[text-decoration-thickness] hover:decoration-4"
            >
              {t.ctaSecondary}
            </Link>
          </div>
        )}

        <div className="mt-20 flex flex-col gap-8 border-t border-current/15 pt-8 sm:mt-28 md:flex-row md:items-end md:justify-between">
          <div>
            <Logo className="!text-paper [--logo-accent:var(--color-pear)] dark:!text-ink dark:[--logo-accent:var(--color-primary)]" />
            <p className="mt-3 max-w-[22rem] text-sm opacity-70">
              {t.footerDesc}
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link to="/faq" className="whitespace-nowrap opacity-80 hover:opacity-100">{t.faq}</Link>
            <Link to="/contact" className="whitespace-nowrap opacity-80 hover:opacity-100">{t.contact}</Link>
            <a href="mailto:verbatask.business@gmail.com" className="inline-flex items-center gap-1.5 whitespace-nowrap opacity-80 hover:opacity-100">
              <Mail className="size-4" /> {t.email}
            </a>
            <a
              href="https://github.com/soban-iftikhar/VerbaTask"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 whitespace-nowrap opacity-80 hover:opacity-100"
            >
              <GithubIcon className="size-4" /> {t.github}
            </a>
          </nav>
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.1em] opacity-55">
          © {new Date().getFullYear()} {t.copyright}
        </p>
      </div>
    </footer>
  );
}

export { FinalCta as SiteFooter };
export default FinalCta;
