import { motion } from 'motion/react';
import {
  Mic,
  Check,
  CheckCheck,
  Phone,
  Video,
} from 'lucide-react';

export function WhatsAppMock({
  title = 'VerbaTask AI',
  bubbles = [],
  className = '',
}) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#12151C] overflow-hidden shadow-xl dark:shadow-2xl ${className}`}>
      {/* WhatsApp Header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-[#181C26] px-4 py-3">
        <img
          src="/favicon_io-light/android-chrome-192x192.png"
          alt="VerbaTask AI"
          className="size-9 rounded-full object-cover shrink-0 shadow-xs dark:hidden"
        />
        <img
          src="/favicon_io-dark/android-chrome-192x192.png"
          alt="VerbaTask AI"
          className="size-9 rounded-full object-cover shrink-0 shadow-xs hidden dark:block"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{title}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            online
          </p>
        </div>
        <Video className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        <Phone className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
      </div>

      {/* WhatsApp Chat Thread */}
      <div className="space-y-3 px-4 py-5 bg-[#F0EBE3] dark:bg-[#0D1017] transition-colors duration-200">
        {bubbles.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: 0.15 + i * 0.22, type: 'spring', stiffness: 120, damping: 16 }}
            className={`flex ${b.from === 'merchant' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                b.from === 'merchant'
                  ? 'rounded-br-xs bg-[#D9FDD3] border border-emerald-300 text-emerald-950 dark:bg-emerald-700/30 dark:border-emerald-500/30 dark:text-emerald-100'
                  : 'rounded-bl-xs border border-zinc-200 bg-white text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-100'
              }`}
            >
              {b.voice ? (
                <span className="flex items-center gap-2.5 py-1">
                  <span className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Mic className="w-4 h-4" />
                  </span>
                  <span className="flex h-6 items-end gap-[3px]">
                    {[6, 12, 18, 9, 20, 14, 8, 16, 11, 19, 7, 13].map((h, k) => (
                      <span
                        key={k}
                        style={{ height: `${h}px` }}
                        className="w-[3px] rounded-full bg-emerald-500/80 dark:bg-emerald-400/80"
                      />
                    ))}
                  </span>
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 ml-1">0:07</span>
                </span>
              ) : (
                <span>{b.text}</span>
              )}
              {b.sub && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 italic">{b.sub}</p>}
              <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span>{b.time}</span>
                {b.from === 'merchant' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default WhatsAppMock;
