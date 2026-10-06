/* The VerbaTask mark: the chat bubble + tick from the favicon, drawn in tokens.
   The dot is the "voice note sent" signal — static here; the page's one reacting
   character lives in the hero apparatus. */
export function LogoMark({ size = 34, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="VerbaTask"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M9.5 5.5h13a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5h-8.2l-5.6 3.9v-3.9H9.5a5 5 0 0 1-5-5v-8a5 5 0 0 1 5-5Z"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="m10.6 14.6 3.7 3.7L28.5 3.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5.2" cy="27.4" r="2.6" fill="var(--logo-accent, var(--color-primary))" />
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
    <span className={`inline-flex items-center gap-2.5 text-ink select-none ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={`font-display ${textSize} font-bold leading-none tracking-[-0.04em]`}
        >
          Verba<span style={{ color: 'var(--logo-accent, var(--color-primary))' }}>Task</span>
        </span>
      )}
    </span>
  );
}

export default Logo;
