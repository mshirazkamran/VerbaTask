import { Shuffle } from '../ui/Shuffle';

export function LogoMark({ size = 38, className = '' }) {
  const iconSize = Math.max(18, Math.round(size * 0.66));

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 dark:border-emerald-400/25 shadow-xs shadow-emerald-500/15 group-hover:scale-105 group-hover:border-emerald-500/50 transition-all duration-200 ${className}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        role="img"
        aria-label="VerbaTask mark"
        className="transition-transform duration-200 group-hover:rotate-6"
      >
        <path
          d="M16 3.2c7.07 0 12.8 4.8 12.8 10.72 0 5.92-5.73 10.72-12.8 10.72-1.36 0-2.67-.18-3.9-.5l-5.9 3.3a.7.7 0 0 1-1.03-.75l1.02-4.66C3.9 20.1 3.2 17.1 3.2 13.92 3.2 8 8.93 3.2 16 3.2Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
          className="text-emerald-600/70 dark:text-emerald-400/60"
        />
        <path
          d="M10.4 14.6l3.9 3.9L23 9.8"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-600 dark:text-emerald-400"
        />
        <path
          d="M18.4 9.8H23v4.6"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-600 dark:text-emerald-400"
        />
      </svg>
    </div>
  );
}

export function Logo({
  className = '',
  showWordmark = true,
  size = 38,
  textSize = 'text-xl sm:text-[1.55rem]',
}) {
  return (
    <span className={`inline-flex items-center gap-3 sm:gap-3.5 group cursor-pointer select-none ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={`font-heading ${textSize} font-extrabold tracking-normal text-zinc-950 dark:text-white inline-flex items-center leading-none gap-1`}>
          <Shuffle
            text="Verba"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.03}
            threshold={0}
            rootMargin="0px"
            triggerOnce={true}
            triggerOnHover={true}
            loop={true}
            loopDelay={2.2}
            respectReducedMotion={true}
            className="tracking-normal"
          />
          <Shuffle
            text="Task"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.03}
            threshold={0}
            rootMargin="0px"
            triggerOnce={true}
            triggerOnHover={true}
            loop={true}
            loopDelay={2.2}
            respectReducedMotion={true}
            className="text-emerald-600 dark:text-emerald-400 font-extrabold tracking-normal"
          />
        </span>
      )}
    </span>
  );
}

export default Logo;
