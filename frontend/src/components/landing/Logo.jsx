/* The BolDukan mark: Voice-first retail identity featuring a microphone capsule,
   acoustic soundwaves ("Bol"), and a conversational speech frame ("Dukan")
   harmonized across light and dark tokens. */
export function LogoMark({ size = 34, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="BolDukan"
      className={`shrink-0 ${className}`}
    >
      {/* Conversational speech frame */}
      <path
        d="M15 3.5C8.65 3.5 3.5 8.65 3.5 15c0 2.25.65 4.35 1.78 6.12L3.5 27.5l6.45-1.42A11.4 11.4 0 0 0 15 26.5c6.35 0 11.5-5.15 11.5-11.5 0-1.88-.45-3.66-1.25-5.22"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Microphone capsule in brand accent color */}
      <rect
        x="12"
        y="7"
        width="6"
        height="9.5"
        rx="3"
        fill="var(--logo-accent, var(--color-primary))"
      />
      {/* Microphone pickup cradle */}
      <path
        d="M8.5 12.5v.8a6.5 6.5 0 0 0 13 0v-.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Microphone stand & base */}
      <path
        d="M15 19.8v3.7M11.5 23.5h7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Radiating voice soundwaves */}
      <path
        d="M23.5 6.5a6 6 0 0 1 4.2 4.2"
        stroke="var(--logo-accent, var(--color-primary))"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M26 3a10 10 0 0 1 5 5"
        stroke="var(--logo-accent, var(--color-primary))"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className = '',
  showWordmark = true,
  size = 32,
  textSize = 'text-[1.35rem]',
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={`font-display ${textSize} font-bold leading-none tracking-[-0.03em]`}
        >
          <span className="text-current opacity-90">Bol</span>
          <span style={{ color: 'var(--logo-accent, var(--color-primary))' }}>Dukan</span>
        </span>
      )}
    </span>
  );
}

export default Logo;
