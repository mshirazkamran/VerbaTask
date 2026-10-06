import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router';

const faqs = [
  {
    q: 'Do I have to change how I run my counter?',
    a: 'No. You serve customers the way you do today. The only new habit is a quick voice note or text to the VerbaTask chat: “2 carton oil bech diye, cash mil gaya.”',
  },
  {
    q: 'What if it gets an amount or item wrong?',
    a: 'Every entry is read back to you with the item, quantity, rate and total. If anything is off, reply GALAT or type the correction and it’s reversed. Sales above your limit wait for your approval before they’re recorded.',
  },
  {
    q: 'Does it really understand Roman Urdu and mixed sentences?',
    a: 'Yes. “Do kilo chawal aur ek kilo daal, 500 ka note mila” becomes items, quantities and a cash payment. Urdu voice notes are transcribed and matched against your own inventory list.',
  },
  {
    q: 'Who can see my sales and stock?',
    a: 'Only you, and anyone you give dashboard access to. Your records are tied to your verified WhatsApp number and are never shared or sold.',
  },
  {
    q: 'Do I need the web dashboard?',
    a: 'No. The WhatsApp chat handles daily sales and stock checks on its own. The dashboard is there when you want charts, printable reports or to manage payment methods.',
  },
  {
    q: 'What if my phone loses signal?',
    a: 'WhatsApp holds your message and sends it when the signal comes back. VerbaTask then processes messages in order, so nothing is skipped.',
  },
];

export function FaqList({ items = faqs, defaultOpen = 0 }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <ul className="border-t-2 border-ink">
      {items.map((f, i) => {
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
                className="group flex w-full items-start justify-between gap-6 py-5 text-left"
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
                <p className="max-w-[44rem] pb-6 pr-12 leading-relaxed text-ink-2">{f.a}</p>
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
  return (
    <section id="faq" className="scroll-mt-16 py-20 sm:py-28">
      <div className="shell grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="display max-w-[12ch] text-[length:var(--fs-2xl)] text-ink sm:text-[length:var(--fs-3xl)]">
            Questions shopkeepers ask.
          </h2>
          <p className="mt-5 max-w-[22rem] leading-relaxed text-ink-2">
            Something else on your mind?{' '}
            <Link to="/contact" className="link-type">
              Write to us
            </Link>
          </p>
        </div>
        <FaqList />
      </div>
    </section>
  );
}

export default Faq;
