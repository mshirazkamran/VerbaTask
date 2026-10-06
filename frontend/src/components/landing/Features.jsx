import { useState } from 'react';

/* The one deliberately dense section: a large "it understands you" panel plus a
   linked index of everything else the product does. */

const phrases = [
  { said: 'Do kilo chawal aur ek kilo daal, 500 ka note mila', heard: '2 kg rice · 1 kg daal · cash 500' },
  { said: 'Rashid bhai ne 1500 udhaar liya', heard: 'Rashid · udhaar · Rs. 1,500' },
  { said: 'Do carton Dalda bech diye, cash mil gaya', heard: '2 × Dalda 5L · cash' },
];

const capabilities = [
  { name: 'Low-stock alerts', line: 'A WhatsApp ping when an item drops under the level you set.', tag: 'Workflows' },
  { name: 'Approvals above your limit', line: 'Big sales wait for a yes. Rejecting one restores the stock.', tag: 'Approvals' },
  { name: 'Expiry reminders', line: 'Batches nearing their date show up before they become a loss.', tag: 'Inventory' },
  { name: 'Reports in the chat', line: 'Sales, top sellers, full stock, low stock and expiry, sent to WhatsApp.', tag: 'Reports' },
  { name: 'Read-back on every entry', line: 'Each sale is repeated to you. Reply GALAT and it’s reversed.', tag: 'Safety' },
  { name: 'A dashboard when you want one', line: 'Charts, orders and inventory on the web. Optional, never required.', tag: 'Web' },
];

export function Features() {
  const [active, setActive] = useState(0);

  return (
    <section id="features" className="scroll-mt-16 py-20 sm:py-24">
      <div className="shell grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <div className="min-w-0 rounded-slab bg-ink p-6 text-paper sm:p-10 dark:bg-paper-3 dark:text-ink">
          <h2 className="display max-w-[15ch] text-[length:var(--fs-2xl)] sm:text-[length:var(--fs-3xl)]">
            It speaks the way your counter speaks.
          </h2>
          <p className="mt-5 max-w-[32rem] leading-relaxed opacity-80">
            Kiryana words, Roman Urdu spellings, half-English sentences. Tap a line to see what
            VerbaTask writes down.
          </p>

          <ul className="mt-10 border-t border-current/20" role="tablist" aria-label="Example phrases">
            {phrases.map((p, i) => {
              const on = active === i;
              return (
                <li key={p.said} className="border-b border-current/20">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(i)}
                    className="grid w-full gap-1 py-4 text-left"
                  >
                    <span className={`font-display text-lg font-medium tracking-tight transition-opacity duration-150 sm:text-[1.6rem] ${on ? 'opacity-100' : 'opacity-55 hover:opacity-85'}`}>
                      “{p.said}”
                    </span>
                    <span
                      className={`font-mono text-xs uppercase tracking-[0.08em] text-pear dark:text-pear-deep ${on ? 'block' : 'hidden'}`}
                    >
                      → {p.heard}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <p className="label">Everything else</p>
          <ul className="mt-4 border-t border-ink/80">
            {capabilities.map((c) => (
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
