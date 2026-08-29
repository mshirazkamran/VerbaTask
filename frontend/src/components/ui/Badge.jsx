/**
 * Status and tag badges styled per Stripe micro-cap pill specifications.
 */

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  const variantStyles = {
    neutral: 'bg-canvas-soft text-ink-secondary border border-hairline',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    pending_approval: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    danger: 'bg-ruby/10 text-ruby border border-ruby/20',
    rejected: 'bg-ruby/10 text-ruby border border-ruby/20',
    voice: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    guided: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    dashboard: 'bg-primary/10 text-primary border border-primary/20',
  };

  const dotColors = {
    neutral: 'bg-ink-mute',
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    completed: 'bg-emerald-500',
    approved: 'bg-emerald-500',
    warning: 'bg-amber-500',
    pending: 'bg-amber-500',
    pending_approval: 'bg-amber-500',
    danger: 'bg-ruby',
    rejected: 'bg-ruby',
    voice: 'bg-purple-500',
    guided: 'bg-blue-500',
    dashboard: 'bg-primary',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-[11px] px-2.5 py-0.5 gap-1.5',
    lg: 'text-xs px-3 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded-pill tracking-tight select-none ${
        sizeStyles[size] || sizeStyles.md
      } ${variantStyles[variant] || variantStyles.neutral} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            dotColors[variant] || dotColors.neutral
          }`}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
