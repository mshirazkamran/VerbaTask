// Big + small: a pinned statement on the left, three frictions as a hairline list on the right.
const frictions = [
  {
    title: 'Udhaar lives in someone’s head.',
    body: 'Who took 5 kg rice on credit? Did the hotel pay for the milk? At closing time it’s memory, a torn bahi-khata, and a total nobody fully trusts.',
    ledger: true,
  },
  {
    title: 'Stock runs out in front of the customer.',
    body: 'Nobody notices the oil cartons are gone until someone asks for one. Reordering is a guess, and money sits in stock that doesn’t move.',
  },
  {
    title: 'Counter software wasn’t built for this counter.',
    body: 'Desktop-first, English-only, a form per sale and a barcode gun you don’t own. A busy counter has no time for any of it.',
  },
];

export function Problem() {
  return (
    <section id="problem" className="scroll-mt-20 py-20 sm:py-28">
      <div className="shell grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="display max-w-[14ch] text-[length:var(--fs-2xl)] text-ink sm:text-[length:var(--fs-3xl)]">
            Your shop already runs on WhatsApp. Your records don’t.
          </h2>
          <p className="mt-6 max-w-[30rem] leading-relaxed text-ink-2">
            Orders come in on WhatsApp and payments get confirmed there all day. Then none of it is
            written down anywhere you can add up.
          </p>
        </div>

        <ol className="border-t border-ink/80">
          {frictions.map((f) => (
            <li key={f.title} className="grid gap-3 border-b border-rule py-8 sm:py-10">
              <h3 className="font-display text-[length:var(--fs-md)] font-semibold tracking-tight text-ink sm:text-[length:var(--fs-xl)]">
                {f.title}
              </h3>
              <p className="max-w-[36rem] leading-relaxed text-ink-2">{f.body}</p>

              {f.ledger && (
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                  <div className="rotate-[1deg] rounded-sm border border-dashed border-rule-2 bg-paper-2 p-4">
                    <p className="label">Before · bahi-khata</p>
                    <p className="mt-2 font-mono text-sm text-muted line-through decoration-coral decoration-2">
                      Rashid — 1500?? chawal
                    </p>
                  </div>
                  <div className="rounded-sm border border-rule bg-surface p-4 shadow-[var(--shadow-contact)]">
                    <p className="label">After · one voice note</p>
                    <p className="mt-2 font-mono text-sm text-ink">
                      <span className="hl">Rashid bhai</span> · udhaar · Rs. 1,500
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default Problem;
