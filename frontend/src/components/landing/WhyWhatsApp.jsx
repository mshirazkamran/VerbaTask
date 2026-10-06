// F3 tabular spec sheet — no card, hairline rows. Stacks into labelled pairs on phones.
const rows = [
  {
    need: 'Hardware',
    pos: 'Rs. 45,000–120,000 for a PC, touch terminal and barcode gun',
    vt: 'Nothing new. Any Android phone with WhatsApp',
  },
  {
    need: 'Language',
    pos: 'English-only screens, a form per checkout',
    vt: 'Urdu and Roman Urdu voice notes, spoken like you’d talk to staff',
  },
  {
    need: 'Loadshedding',
    pos: 'Needs a UPS or generator to keep the terminal on',
    vt: 'Runs on phone battery and mobile data',
  },
  {
    need: 'Training',
    pos: 'Weeks of cashier training; mistakes end up in the stock count',
    vt: 'If staff can send a voice note, they can use it',
  },
];

export function WhyWhatsApp() {
  return (
    <section id="why-whatsapp" className="scroll-mt-16 border-t border-rule py-20 sm:py-28">
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <h2 className="display max-w-[17ch] text-[length:var(--fs-2xl)] text-ink sm:text-[length:var(--fs-3xl)]">
            A desktop till, or the phone already in your hand.
          </h2>
          <p className="max-w-[28rem] leading-relaxed text-ink-2 lg:justify-self-end">
            Shop software fails when it asks shopkeepers to sit behind a machine. VerbaTask works
            in the chat app you already have open all day.
          </p>
        </div>

        <div className="mt-12 border-t-2 border-ink" role="table" aria-label="Desktop POS compared with VerbaTask">
          <div role="row" className="hidden grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,5fr)] gap-6 border-b border-rule py-3 md:grid">
            <span role="columnheader" className="label">At the counter</span>
            <span role="columnheader" className="label">Desktop POS</span>
            <span role="columnheader" className="label text-ink">VerbaTask on WhatsApp</span>
          </div>
          {rows.map((r) => (
            <div
              key={r.need}
              role="row"
              className="grid gap-3 border-b border-rule py-5 md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,5fr)] md:gap-6"
            >
              <span role="rowheader" className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                {r.need}
              </span>
              <span role="cell" className="text-sm leading-relaxed text-muted">
                <span className="label mr-2 md:hidden">POS</span>
                {r.pos}
              </span>
              <span role="cell" className="text-sm font-medium leading-relaxed text-ink">
                <span className="label mr-2 md:hidden">VerbaTask</span>
                {r.vt}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhyWhatsApp;
