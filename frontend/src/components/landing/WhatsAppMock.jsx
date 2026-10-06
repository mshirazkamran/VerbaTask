import { Mic, CheckCheck } from 'lucide-react';

/* A chat transcript, not a phone. No fake header, no call buttons — the
   reader's own phone is the chrome. Each bubble: { from: 'merchant' | 'bot', text, voice, sub, time }. */
export function WhatsAppMock({ bubbles = [], label = 'Thread · VerbaTask', className = '' }) {
  return (
    <figure className={`min-w-0 ${className}`}>
      <figcaption className="label mb-3">{label}</figcaption>
      <ol className="space-y-2.5">
        {bubbles.map((b, i) => {
          const mine = b.from === 'merchant';
          return (
            <li key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] rounded-[18px] px-3.5 py-2.5 text-sm leading-relaxed ${
                  mine
                    ? 'rounded-br-[6px] bg-ink text-paper'
                    : 'rounded-bl-[6px] border border-rule bg-surface text-ink'
                }`}
              >
                {b.voice ? (
                  <span className="inline-flex items-center gap-2.5">
                    <Mic className="size-4 shrink-0 text-pear" />
                    <span className="flex h-4 items-center gap-[2px]" aria-hidden="true">
                      {[5, 11, 15, 8, 14, 10, 6, 13, 9, 12, 5, 9].map((h, k) => (
                        <span key={k} className="w-[2px] rounded-pill bg-current opacity-70" style={{ height: h }} />
                      ))}
                    </span>
                    <span className="font-mono text-xs opacity-80">0:07</span>
                  </span>
                ) : (
                  <span className="whitespace-pre-line">{b.text}</span>
                )}
                {b.sub && <span className="mt-1.5 block font-mono text-[11px] text-muted">{b.sub}</span>}
                {b.time && (
                  <span className={`mt-1 flex items-center justify-end gap-1 font-mono text-[10px] ${mine ? 'opacity-60' : 'text-muted'}`}>
                    {b.time}
                    {mine && <CheckCheck className="size-3" />}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

export default WhatsAppMock;
