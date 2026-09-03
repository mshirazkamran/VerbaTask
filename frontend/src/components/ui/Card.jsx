/**
 * Card surface container styled per Stripe DESIGN.md specifications.
 */

export function Card({
  children,
  className = '',
  hoverEffect = false,
  padding = 'md',
  ...props
}) {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`bg-canvas/80 dark:bg-canvas/70 backdrop-blur-md text-ink border border-hairline/80 dark:border-white/10 rounded-xl shadow-card transition-all duration-200 ${
        hoverEffect ? 'hover:shadow-float hover:-translate-y-0.5' : ''
      } ${paddingStyles[padding] || paddingStyles.md} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
