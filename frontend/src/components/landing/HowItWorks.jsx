import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { WhatsAppMock } from './WhatsAppMock';

/* Narrative Workflow spine — four real stages, each with its own accent surface
   and a working miniature of the product. Numerals hang into the gutter on desktop. */

function LinkCode() {
  return (
    <div>
      <p className="label">Your link code</p>
      <div className="mt-3 flex gap-1.5 sm:gap-2">
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
        Send it to the VerbaTask number on WhatsApp. That’s the whole setup.
      </p>
    </div>
  );
}

function SpeakIt() {
  return (
    <WhatsAppMock
      bubbles={[
        { from: 'merchant', voice: true, time: '2:30 PM' },
        {
          from: 'bot',
          text: '5 kg Sufi rice aur 2 carton Dalda.\nTotal PKR 6,800 — cash ya JazzCash?',
          sub: 'heard: “5 kilo chawal aur 2 carton ghee bech diye”',
          time: '2:30 PM',
        },
        { from: 'merchant', text: 'Cash', time: '2:31 PM' },
      ]}
    />
  );
}

const stock = [
  { name: 'Dalda Cooking Oil 5L', qty: '3 cartons', low: true },
  { name: 'Sufi Basmati Rice', qty: '42 kg' },
  { name: 'Tapal Danedar 900g', qty: '4 packs', low: true },
  { name: 'Olpers Milk 1L', qty: '64 packs' },
];

function StockAndApproval() {
  const [decision, setDecision] = useState(null);
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div>
        <p className="label">Shelf · live</p>
        <ul className="mt-3 divide-y divide-rule rounded-input border border-rule bg-surface">
          {stock.map((s) => (
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
          <span className="label">Ord-9021</span>
          <span className="font-mono text-sm font-semibold text-ink">18,500</span>
        </div>
        <p className="mt-2 text-sm text-ink">10 cartons of oil for Al-Madina Hotel?</p>
        {decision ? (
          <p className="mt-4 font-mono text-xs text-muted" role="status">
            {decision === 'approve' ? 'Approved · stock reserved' : 'Rejected · stock restored'}{' '}
            <button type="button" onClick={() => setDecision(null)} className="ml-1 text-ink underline underline-offset-2">
              Undo
            </button>
          </p>
        ) : (
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setDecision('approve')} className="btn btn--primary btn--sm flex-1">
              <Check className="size-3.5" /> Approve
            </button>
            <button type="button" onClick={() => setDecision('reject')} className="btn btn--soft btn--sm flex-1">
              <X className="size-3.5" /> Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const rails = [
  { id: 'cash', label: 'Cash' },
  { id: 'easypaisa', label: 'Easypaisa' },
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'bank', label: 'Bank transfer' },
  { id: 'udhaar', label: 'Udhaar' },
];

function CloseTheDay() {
  const [rail, setRail] = useState('easypaisa');
  return (
    <div>
      <p className="label">Paid by</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
        {rails.map((r) => {
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
        <p className="text-sm text-ink-2">Day report on WhatsApp</p>
        <p className="font-mono text-sm font-semibold text-ink">10:00 PM</p>
      </div>
    </div>
  );
}

const stages = [
  {
    num: '1.0',
    word: 'Link',
    title: 'Pair your WhatsApp number.',
    body: 'Sign up, then send the six-digit code to the VerbaTask number. No app to install, nothing to configure.',
    tint: 'bg-primary-tint',
    numeral: 'text-primary',
    Visual: LinkCode,
  },
  {
    num: '2.0',
    word: 'Speak',
    title: 'Say the sale the way you’d say it.',
    body: 'Urdu, Roman Urdu or English, voice or text. If the rate or payment is missing, it asks for that one thing and nothing else.',
    tint: 'bg-pear-tint',
    numeral: 'text-pear-deep',
    Visual: SpeakIt,
  },
  {
    num: '3.0',
    word: 'Sync',
    title: 'Stock moves. Big sales wait for you.',
    body: 'Every order comes off the shelf count straight away. Anything above your limit waits for your approve or reject, and a rejection puts the stock back.',
    tint: 'bg-coral-tint',
    numeral: 'text-coral',
    Visual: StockAndApproval,
  },
  {
    num: '4.0',
    word: 'Close',
    title: 'Close the day against the drawer.',
    body: 'Each sale is tagged by how the money came in, so cash, wallets and udhaar add up separately. The dashboard has the charts when you want them.',
    tint: 'bg-sky-tint',
    numeral: 'text-sky',
    Visual: CloseTheDay,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t border-rule bg-paper-2 py-20 sm:py-28">
      <div className="shell">
        <h2 className="display max-w-[16ch] text-[length:var(--fs-2xl)] text-ink sm:text-[length:var(--fs-3xl)]">
          Four steps. Three of them happen in WhatsApp.
        </h2>

        <ol className="relative mt-14 sm:mt-20">
          {/* the rail */}
          <span aria-hidden="true" className="absolute bottom-6 left-[1.1rem] top-6 w-px bg-rule-2 lg:hidden" />

          {stages.map((s, idx) => {
            const flip = idx % 2 === 1;
            const { Visual } = s;
            return (
              <li
                key={s.num}
                className="relative grid gap-8 pb-16 pl-12 last:pb-0 sm:pb-20 lg:grid-cols-12 lg:gap-x-10 lg:pl-0"
              >
                <span aria-hidden="true" className="absolute left-[0.8rem] top-3 size-[0.6rem] rounded-pill bg-ink lg:hidden" />

                <div className={`min-w-0 lg:col-span-5 ${flip ? 'lg:order-2 lg:col-start-8' : ''}`}>
                  <p
                    aria-hidden="true"
                    className={`display font-tabular text-[length:var(--fs-3xl)] leading-none lg:-ml-2 lg:text-[length:var(--text-numeral)] ${s.numeral}`}
                  >
                    {s.num}
                  </p>
                  <p className="label mt-4">
                    Step {s.num} · {s.word}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-[30rem] leading-relaxed text-ink-2">{s.body}</p>
                </div>

                <div
                  className={`min-w-0 self-center rounded-slab p-5 sm:p-7 lg:col-span-6 ${s.tint} ${
                    flip ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-7'
                  }`}
                >
                  <Visual />
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
