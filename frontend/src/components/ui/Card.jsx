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
 className={`bg-canvas text-ink border border-hairline rounded-xl shadow-card transition-all duration-200 ${
 hoverEffect ? 'hover:shadow-md hover:-translate-y-0.5' : ''
 } ${paddingStyles[padding] || paddingStyles.md} ${className}`}
 {...props}
 >
 {children}
 </div>
 );
}
