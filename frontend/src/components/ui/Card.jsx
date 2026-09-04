/**
 * Frosted Glass Card container with specular top bevel and backdrop blur.
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
      className={`glass-card text-ink transition-all duration-200 ${
        hoverEffect ? 'hover:-translate-y-0.5' : ''
      } ${paddingStyles[padding] || paddingStyles.md} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
