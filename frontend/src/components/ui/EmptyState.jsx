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
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          {isValidElement(icon)
            ? cloneElement(icon, { className: 'w-6 h-6' })
            : icon}
        </div>
      )}

      <h3 className="text-base font-medium text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ink-mute max-w-sm mb-6 leading-relaxed">
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
