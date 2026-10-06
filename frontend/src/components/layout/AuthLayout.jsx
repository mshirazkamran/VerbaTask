import { Link } from 'react-router';
import { Logo } from '../landing/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

const TICKS = Array.from({ length: 48 }, (_, i) => {
  const t = i / 47;
  const v = Math.min(1, Math.exp(-((t - 0.3) ** 2) / 0.02) + Math.exp(-((t - 0.72) ** 2) / 0.015) * 0.7 + 0.1);
  return Math.round(14 + 86 * v);
});

/**
 * Auth shell, split 5/7: an ink slab carrying the product's one idea on the left,
 * the form left-aligned on paper to the right. Phones get the form alone.
 */
export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="grid min-h-screen min-h-[100dvh] bg-paper lg:grid-cols-12">
      <aside className="relative hidden flex-col justify-between overflow-clip bg-ink p-10 text-paper lg:col-span-5 lg:flex xl:p-14 dark:border-r dark:border-rule dark:bg-paper-2 dark:text-ink">
        <Link to="/" className="self-start rounded-sm" title="Back to the VerbaTask site">
          <Logo className="!text-paper [--logo-accent:var(--color-pear)] dark:!text-ink dark:[--logo-accent:var(--color-primary)]" />
        </Link>

        <div>
          <div className="flex h-16 items-end gap-[3px]" aria-hidden="true">
            {TICKS.map((h, i) => (
              <span key={i} className="flex-1 rounded-pill bg-pear" style={{ height: `${h}%`, opacity: 0.35 + (h / 100) * 0.65 }} />
            ))}
          </div>
          <p className="display mt-10 max-w-[13ch] text-[length:var(--fs-2xl)] xl:text-[length:var(--fs-3xl)]">
            One voice note in. One ledger line out.
          </p>
          <p className="mt-5 max-w-[26rem] text-sm leading-relaxed opacity-70">
            Sales, stock and approvals for your shop, kept straight from the WhatsApp chat you already use.
          </p>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.1em] opacity-55">
          © {new Date().getFullYear()} VerbaTask
        </p>
      </aside>

      <div className="flex min-w-0 flex-col px-4 py-6 sm:px-10 lg:col-span-7 lg:px-16 xl:px-24">
        <header className="flex items-center justify-between">
          <Link to="/" className="rounded-sm lg:invisible" title="Back to the VerbaTask site">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10 sm:py-14">
          {title && (
            <div className="mb-8">
              <h1 className="display text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)]">{title}</h1>
              {subtitle && <p className="mt-3 text-sm leading-relaxed text-ink-2">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export default AuthLayout;
