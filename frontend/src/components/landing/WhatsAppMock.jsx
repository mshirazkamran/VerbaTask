import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Mic,
  Play,
  Pause,
  Check,
  CheckCheck,
  Phone,
  Video,
} from 'lucide-react';

export function WhatsAppMock({
  title = 'VerbaTask Shop AI',
  bubbles = [],
  className = '',
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 5;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className={`rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] dark:bg-[#111D1C] overflow-hidden shadow-xl dark:shadow-2xl ${className}`}>
      {/* WhatsApp Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas-soft)] dark:bg-[#162523] px-4 py-3">
        <div className="size-9 rounded-full bg-[#287A74] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
          VT
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-ink)]">{title}</p>
          <p className="text-xs text-[#287A74] dark:text-[#AEEED3] flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#287A74] dark:bg-[#AEEED3] animate-pulse" />
            online (Instant Voice Response)
          </p>
        </div>
        <Video className="w-4 h-4 text-[var(--text-ink-mute)]" />
        <Phone className="w-4 h-4 text-[var(--text-ink-mute)]" />
      </div>

      {/* WhatsApp Chat Thread */}
      <div className="space-y-3 px-4 py-5 bg-[#EFE9DF] dark:bg-[#0A1211] transition-colors duration-200">
        {bubbles.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: 0.12 + i * 0.18, type: 'spring', stiffness: 120, damping: 16 }}
            className={`flex ${b.from === 'merchant' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                b.from === 'merchant'
                  ? 'rounded-br-xs bg-[#D5F5E3] border border-[#287A74]/20 text-[#0E2824] dark:bg-[#174845]/60 dark:border-[#AEEED3]/30 dark:text-[#EAFBF5]'
                  : 'rounded-bl-xs border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-ink)] dark:bg-[#162523] dark:text-zinc-100'
              }`}
            >
              {b.voice ? (
                <div className="flex flex-col gap-1 py-1">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="size-8 rounded-full bg-[#287A74] text-white flex items-center justify-center hover:bg-[#1E5C58] transition-colors shrink-0 cursor-pointer shadow-xs"
                      aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex h-5 items-end gap-[3px]">
                        {[6, 14, 18, 10, 20, 16, 8, 18, 12, 19, 9, 15, 7, 13].map((h, k) => {
                          const isBarActive = (k / 14) * 100 <= progress;
                          return (
                            <span
                              key={k}
                              style={{ height: `${isPlaying ? Math.max(4, (h * (progress % 20 + 10)) / 20) : h}px` }}
                              className={`w-[3px] rounded-full transition-all duration-150 ${
                                isBarActive
                                  ? 'bg-[#287A74] dark:bg-[#AEEED3]'
                                  : 'bg-[#287A74]/30 dark:bg-[#AEEED3]/30'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-ink-mute)] font-mono">
                        <span>{isPlaying ? `0:0${Math.floor(progress / 20)}` : '0:07'}</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#287A74] dark:text-[#AEEED3] font-semibold">
                          Urdu Voice Note
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-line">{b.text}</div>
              )}
              {b.sub && (
                <p className="mt-1.5 text-xs text-[#287A74] dark:text-[#AEEED3] font-medium bg-[var(--bg-canvas-soft)] dark:bg-[#0A1211]/60 px-2 py-1 rounded-md">
                  {b.sub}
                </p>
              )}
              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[var(--text-ink-mute)]">
                <span>{b.time}</span>
                {b.from === 'merchant' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-[#287A74] dark:text-[#AEEED3]" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default WhatsAppMock;
