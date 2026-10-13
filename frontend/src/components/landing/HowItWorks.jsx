import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { WhatsAppMock } from './WhatsAppMock';
import { useUiStore } from '../../lib/store';
import { getTranslations } from '../../lib/translations';

/* Narrative Workflow spine — four real stages, each with its own accent surface
   and a working miniature of the product. Numerals hang into the gutter on desktop. */

function LinkCode({ t }) {
  return (
    <div>
      <p className="label">{t.linkCodeLabel}</p>
      <div className="mt-3 flex gap-1.5 sm:gap-2" dir="ltr">
        {'482917'.split('').map((d, i) => (
          <span
            key={i}
            className="grid h-14 min-w-0 flex-1 place-items-center rounded-input border border-rule-2 bg-surface font-mono text-2xl font-semibold text-ink shadow-[var(--shadow-contact)] sm:h-16"
          >
            {d}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-2">
        {t.linkCodeHelp}
      </p>
    </div>
  );
}

function SpeakIt({ isUrdu }) {
  return (
    <WhatsAppMock
      bubbles={
        isUrdu
          ? [
              { from: 'merchant', voice: true, time: '2:30 PM' },
              {
                from: 'bot',
                text: '5 کلو صوفی چاول اور 2 کاٹن ڈالڈا۔\nٹوٹل 6,800 روپے — کیش یا جاز کیش؟',
                sub: 'سنا گیا: “5 کلو چاول اور 2 کاٹن گھی بیچ دیے”',
                time: '2:30 PM',
              },
              { from: 'merchant', text: 'کیش', time: '2:31 PM' },
            ]
          : [
              { from: 'merchant', voice: true, time: '2:30 PM' },
              {
                from: 'bot',
                text: '5 kg Sufi rice aur 2 carton Dalda.\nTotal PKR 6,800 — cash ya JazzCash?',
                sub: 'heard: “5 kilo chawal aur 2 carton ghee bech diye”',
                time: '2:30 PM',
              },
              { from: 'merchant', text: 'Cash', time: '2:31 PM' },
            ]
      }
    />
  );
}

const stockEn = [
  { name: 'Dalda Cooking Oil 5L', qty: '3 cartons', low: true },
  { name: 'Sufi Basmati Rice', qty: '42 kg' },
  { name: 'Tapal Danedar 900g', qty: '4 packs', low: true },
  { name: 'Olpers Milk 1L', qty: '64 packs' },
];

const stockUr = [
  { name: 'ڈالڈا کوکنگ آئل 5 لیٹر', qty: '3 کاٹن', low: true },
  { name: 'صوفی باسمتی چاول', qty: '42 کلو' },
  { name: 'ٹپال دانے دار 900 گرام', qty: '4 پیک', low: true },
  { name: 'اولپرز دودھ 1 لیٹر', qty: '64 پیک' },
];

function StockAndApproval({ t, isUrdu }) {
  const [decision, setDecision] = useState(null);
  const items = isUrdu ? stockUr : stockEn;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div>
        <p className="label">{t.shelfLive}</p>
        <ul className="mt-3 divide-y divide-rule rounded-input border border-rule bg-surface">
          {items.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="truncate text-ink">{s.name}</span>
              <span
                className={`shrink-0 font-mono text-xs ${
                  s.low ? 'rounded-pill bg-coral-tint px-2 py-0.5 text-danger-ink' : 'text-muted'
                }`}
              >
                {s.qty}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="self-end rounded-card border border-rule bg-surface p-4 shadow-[var(--shadow-ambient)] sm:-mb-2 sm:rotate-[1.25deg]">
        <div className="flex items-center justify-between">
          <span className="label">{t.sampleOrder}</span>
          <span className="font-mono text-sm font-semibold text-ink">{t.sampleOrderAmount}</span>
        </div>
        <p className="mt-2 text-sm text-ink">{t.sampleOrderPrompt}</p>
        {decision ? (
          <p className="mt-4 font-mono text-xs text-muted" role="status">
            {decision === 'approve' ? t.approvedStatus : t.rejectedStatus}{' '}
            <button type="button" onClick={() => setDecision(null)} className="ms-1 text-ink underline underline-offset-2">
              {t.undo}
            </button>
          </p>
        ) : (
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setDecision('approve')} className="btn btn--primary btn--sm flex-1">
              <Check className="size-3.5" /> {t.approveBtn}
            </button>
            <button type="button" onClick={() => setDecision('reject')} className="btn btn--soft btn--sm flex-1">
              <X className="size-3.5" /> {t.rejectBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CloseTheDay({ t }) {
  const [rail, setRail] = useState('easypaisa');
  return (
    <div>
      <p className="label">{t.paidByLabel}</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
        {t.rails.map((r) => {
          const on = rail === r.id;
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setRail(r.id)}
              className={`whitespace-nowrap rounded-pill border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
                on ? 'border-ink bg-ink text-paper' : 'border-rule-2 bg-surface text-ink-2 hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-dashed border-rule-2 pt-4">
        <p className="text-sm text-ink-2">{t.dayReportLabel}</p>
        <p className="font-mono text-sm font-semibold text-ink" dir="ltr">{t.dayReportTime}</p>
      </div>
    </div>
  );
}

const stageVisuals = [
  { tint: 'bg-primary-tint', numeral: 'text-primary', Visual: LinkCode },
  { tint: 'bg-pear-tint', numeral: 'text-pear-deep', Visual: SpeakIt },
  { tint: 'bg-coral-tint', numeral: 'text-coral', Visual: StockAndApproval },
  { tint: 'bg-sky-tint', numeral: 'text-sky', Visual: CloseTheDay },
];

export function HowItWorks() {
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';
  const t = getTranslations(language).howItWorks;

  return (
    <section id="how-it-works" className="scroll-mt-16 border-t border-rule bg-paper-2 py-20 sm:py-28">
      <div className="shell">
        <h2 className="display max-w-[16ch] text-[length:var(--fs-2xl)] text-ink sm:text-[length:var(--fs-3xl)]">
          {t.heading}
        </h2>

        <ol className="relative mt-14 sm:mt-20">
          {/* the rail */}
          <span aria-hidden="true" className="absolute bottom-6 start-[1.1rem] top-6 w-px bg-rule-2 lg:hidden" />

          {t.stages.map((stageData, idx) => {
            const flip = idx % 2 === 1;
            const style = stageVisuals[idx] || stageVisuals[0];
            const { Visual, tint, numeral } = style;
            return (
              <li
                key={stageData.num}
                className="relative grid gap-8 pb-16 ps-12 last:pb-0 sm:pb-20 lg:grid-cols-12 lg:gap-x-10 lg:ps-0"
              >
                <span aria-hidden="true" className="absolute start-[0.8rem] top-3 size-[0.6rem] rounded-pill bg-ink lg:hidden" />

                <div className={`min-w-0 lg:col-span-5 ${flip ? 'lg:order-2 lg:col-start-8' : ''}`}>
                  <p
                    aria-hidden="true"
                    dir="ltr"
                    className={`display font-tabular text-[length:var(--fs-3xl)] leading-none lg:-ms-2 lg:text-[length:var(--text-numeral)] ${numeral}`}
                  >
                    {stageData.num}
                  </p>
                  <p className="label mt-4">
                    {isUrdu ? `مرحلہ ${stageData.num} · ${stageData.word}` : `Step ${stageData.num} · ${stageData.word}`}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
                    {stageData.title}
                  </h3>
                  <p className="mt-3 max-w-[30rem] leading-relaxed text-ink-2">{stageData.body}</p>
                </div>

                <div
                  className={`min-w-0 self-center rounded-slab p-5 sm:p-7 lg:col-span-6 ${tint} ${
                    flip ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-7'
                  }`}
                >
                  <Visual t={t} isUrdu={isUrdu} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
