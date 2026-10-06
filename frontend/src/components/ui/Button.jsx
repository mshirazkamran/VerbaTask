import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button on the shared `.btn` system (app.css): primary is the pear push button —
 * it lifts on hover and physically presses down on click. Secondary is soft,
 * outline sweeps a fill up on hover, ghost is text-weight.
 */
const VARIANTS = {
  primary: 'btn',
  teal: 'btn btn--primary',
  secondary: 'btn btn--soft',
  outline: 'btn btn--outline',
  ghost: 'btn btn--ghost',
  danger: 'btn btn--danger',
  ink: 'btn btn--ink',
};

const SIZES = {
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
};

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
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      data-state={loading ? 'loading' : undefined}
      aria-busy={loading || undefined}
      className={`${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] ?? ''} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      ) : leftIcon ? (
        <span className="inline-flex shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
});

export default Button;
