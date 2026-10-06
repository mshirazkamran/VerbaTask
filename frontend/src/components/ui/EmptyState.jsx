import { isValidElement, cloneElement } from 'react';
import { Button } from './Button';

/**
 * Empty state visual container for tables, lists, and search results.
 */
export function EmptyState({
 icon,
 title,
 description,
 actionLabel,
 onAction,
 actionIcon,
 className = '',
}) {
 return (
 <div
 className={`flex flex-col items-center justify-center text-center p-8 md:p-12 w-full ${className}`}
 >
 {icon && (
 <div className="mb-5 grid size-14 place-items-center rounded-pill bg-pear-tint text-ink ring-8 ring-pear-tint/40">
 {isValidElement(icon)
 ? cloneElement(icon, { className: 'w-6 h-6' })
 : icon}
 </div>
 )}

 <h3 className="mb-1.5 font-display text-lg font-semibold tracking-tight text-ink">{title}</h3>
 {description && (
 <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted">
 {description}
 </p>
 )}
 {actionLabel && onAction && (
 <Button onClick={onAction} leftIcon={actionIcon}>
 {actionLabel}
 </Button>
 )}
 </div>
 );
}
