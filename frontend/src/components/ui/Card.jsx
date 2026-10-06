/**
 * App card. Day: hairline + layered contact/ambient shadow. Night: hairline + a
 * faint inner pear emission (lit from within, never a glow around it).
 * `tone="flat"` gives a borderless tinted block for secondary groupings.
 */
export function Card({
  children,
  className = '',
  hoverEffect = false,
  padding = 'md',
  tone = 'raised',
  as: Tag = 'div',
  ...props
}) {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <Tag
      className={`${tone === 'flat' ? 'surface-flat' : 'surface-card'} text-ink ${
        hoverEffect ? 'transition-transform duration-200 hover:-translate-y-0.5' : ''
      } ${paddingStyles[padding] || paddingStyles.md} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default Card;
