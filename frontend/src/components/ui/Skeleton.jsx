/**
 * Skeleton shimmer loading placeholders matching component layout dimensions.
 */

export function Skeleton({ className = '', variant = 'text', count = 1 }) {
  const variantStyles = {
    text: 'h-4 w-full rounded-xs',
    title: 'h-6 w-1/3 rounded-xs',
    circle: 'rounded-full w-10 h-10',
    stat: 'h-24 w-full rounded-lg',
    card: 'h-48 w-full rounded-lg',
    button: 'h-10 w-24 rounded-pill',
    tableRow: 'h-12 w-full rounded-none',
  };

  const baseStyle =
    'bg-gradient-to-r from-hairline via-hairline/40 to-hairline bg-[length:400%_100%] animate-[shimmer_1.5s_infinite] shrink-0';

  if (count > 1) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className={`${baseStyle} ${variantStyles[variant] || ''} ${className}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`${baseStyle} ${variantStyles[variant] || ''} ${className}`} />
  );
}
