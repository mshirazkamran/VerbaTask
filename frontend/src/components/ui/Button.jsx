import { forwardRef } from 'react';
import { IconLoader2 } from '@tabler/icons-react';

/**
 * Stripe-inspired pill button component with tactile feedback and crisp typography.
 */
export const Button = forwardRef(function Button(

  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-pill transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]';

  const variantStyles = {
    primary:
      'bg-primary text-on-primary hover:bg-primary-deep active:bg-primary-press shadow-sm focus-visible:ring-primary',
    secondary:
      'bg-canvas text-primary border border-primary/30 hover:border-primary hover:bg-primary-subdued/20 active:bg-primary-subdued/30 focus-visible:ring-primary',
    ghost:
      'bg-transparent text-ink hover:bg-primary-subdued/20 text-ink-secondary hover:text-ink active:bg-primary-subdued/30 focus-visible:ring-primary',
    danger:
      'bg-ruby text-white hover:opacity-90 active:opacity-100 shadow-sm focus-visible:ring-ruby',
    outline:
      'bg-canvas text-ink border border-hairline hover:border-ink-mute/50 hover:bg-canvas-soft focus-visible:ring-primary',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-4 py-2 gap-2 h-10',
    lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {loading ? (
        <IconLoader2 className="w-4 h-4 animate-spin text-current" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});
