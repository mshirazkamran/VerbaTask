import { ArrowUpRight } from 'lucide-react';
import { LandingLayout } from '../components/layout/LandingLayout';

const REPO = 'https://github.com/soban-iftikhar/VerbaTask';

const links = [
  { title: 'Source code', desc: 'Read the full codebase or star the repo.', href: REPO, action: 'GitHub' },
  { title: 'Report a bug', desc: 'Something broken? Open an issue and we’ll look at it.', href: `${REPO}/issues`, action: 'Issues' },
  { title: 'Request a feature', desc: 'An idea for VerbaTask? Put it in an issue.', href: `${REPO}/issues`, action: 'Issues' },
  { title: 'Contribute', desc: 'Fork the repo, make a change, open a pull request.', href: `${REPO}/fork`, action: 'Fork' },
];

// Index-first: one giant typographic address, then a hairline index of everywhere else to reach us.
export function ContactPage() {
  return (
    <LandingLayout>
      <section className="py-16 sm:py-24">
        <div className="shell">
          <h1 className="display text-[length:var(--fs-2xl)] text-ink sm:text-[length:var(--text-display)]">Write to us.</h1>
          <p className="mt-6 max-w-[32rem] leading-relaxed text-ink-2">
            Business questions, feedback or help getting set up — email is quickest. VerbaTask is open
            source, so code questions are best on GitHub.
          </p>

          <a
            href="mailto:verbatask.business@gmail.com"
            className="group mt-12 inline-block max-w-full font-display text-[clamp(1.35rem,4.5vw,3.25rem)] font-semibold tracking-[-0.03em] text-ink [overflow-wrap:anywhere]"
          >
            <span className="hl">verbatask.business@gmail.com</span>
            <ArrowUpRight className="ml-2 inline size-[0.8em] align-baseline text-muted transition-transform duration-150 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-ink" />
          </a>

          <ul className="mt-16 border-t-2 border-ink sm:mt-24 lg:ml-[33%]">
            {links.map((l) => (
              <li key={l.title} className="border-b border-rule">
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 py-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]"
                >
                  <span className="font-display text-lg font-semibold tracking-tight text-ink">{l.title}</span>
                  <span className="col-span-2 row-start-2 text-sm text-ink-2 sm:col-span-1 sm:row-start-auto">{l.desc}</span>
                  <span className="label col-start-2 row-start-1 inline-flex items-center gap-1 whitespace-nowrap group-hover:text-ink sm:col-start-auto">
                    {l.action}
                    <ArrowUpRight className="size-3.5 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </LandingLayout>
  );
}

export default ContactPage;
