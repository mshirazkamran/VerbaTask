/**
 * Status and tag badges. Every variant resolves to a token tint + token ink, so
 * both themes stay legible. Status strings from the API (pending_approval,
 * completed, rejected, voice, guided…) map directly to a variant.
 */
const VARIANTS = {
  neutral: 'bg-paper-3 text-ink-2',
  primary: 'bg-primary-tint text-primary-deep dark:text-primary',
  success: 'bg-success-tint text-success-ink',
  warning: 'bg-pear-tint text-warn-ink',
  danger: 'bg-coral-tint text-danger-ink',
  info: 'bg-sky-tint text-sky-ink',
  ink: 'bg-ink text-paper',
};

const ALIASES = {
  mint: 'success',
  completed: 'success',
  approved: 'success',
  confirmed: 'success',
  paid: 'success',
  butter: 'warning',
  pending: 'warning',
  pending_approval: 'warning',
  rejected: 'danger',
  cancelled: 'danger',
  failed: 'danger',
  voice: 'primary',
  dashboard: 'neutral',
  guided: 'info',
  text: 'info',
};

const DOTS = {
  neutral: 'bg-muted',
  primary: 'bg-primary',
  success: 'bg-success-ink',
  warning: 'bg-pear-deep',
  danger: 'bg-coral',
  info: 'bg-sky',
  ink: 'bg-paper',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  shape = 'pill',
  className = '',
  ...props
}) {
  const key = VARIANTS[variant] ? variant : ALIASES[variant] || 'neutral';

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-[11px] px-2 py-0.5 gap-1.5',
    lg: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const shapeStyles = {
    rounded: 'rounded-xs',
    pill: 'rounded-pill',
    square: 'rounded-xs',
  };

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap font-mono font-medium uppercase tracking-[0.06em] select-none ${
        shapeStyles[shape] || shapeStyles.pill
      } ${sizeStyles[size] || sizeStyles.md} ${VARIANTS[key]} ${className}`}
      {...props}
    >
      {dot && <span className={`size-1.5 shrink-0 rounded-pill ${DOTS[key]}`} />}
      <span>{typeof children === 'string' ? children.replace(/_/g, ' ') : children}</span>
    </span>
  );
}

export default Badge;
