import { Languages } from 'lucide-react';
import { useUiStore } from '../../lib/store';

export function LanguageToggle({ className = '', variant = 'button' }) {
  const language = useUiStore((s) => s.language);
  const toggleLanguage = useUiStore((s) => s.toggleLanguage);
  const isUrdu = language === 'ur';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-pill border border-rule bg-surface text-ink transition-colors hover:bg-paper-2 ${className}`}
        aria-label={isUrdu ? 'Switch to English' : 'اردو میں دیکھیں'}
        title={isUrdu ? 'Switch to English' : 'اردو میں دیکھیں'}
      >
        <span className={!isUrdu ? 'font-bold text-primary dark:text-pear' : 'opacity-60'}>EN</span>
        <span className="opacity-30">/</span>
        <span className={isUrdu ? 'font-bold text-primary dark:text-pear' : 'opacity-60'}>اردو</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex h-10 px-3 shrink-0 items-center justify-center gap-1.5 rounded-pill border border-rule bg-surface text-xs font-semibold text-ink-2 transition-colors duration-150 hover:bg-paper-2 hover:text-ink ${className}`}
      aria-label={isUrdu ? 'Switch to English' : 'اردو میں دیکھیں'}
      title={isUrdu ? 'Switch to English' : 'اردو میں دیکھیں'}
    >
      <Languages className="size-3.5 text-ink-muted" />
      <span className="font-medium tracking-tight">{isUrdu ? 'English' : 'اردو'}</span>
    </button>
  );
}

export default LanguageToggle;
