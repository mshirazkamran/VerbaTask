import { forwardRef } from 'react';

/**
 * Input with explicit label, helper text and error. Focus ring shows instantly
 * (never animated); error state carries text, not colour alone.
 */
export const Input = forwardRef(function Input(
  {
    label,
    id,
    error,
    helperText,
    type = 'text',
    leftIcon,
    rightIcon,
    className = '',
    required,
    ...props
  },
  ref
) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="flex items-center gap-1 text-xs font-semibold text-ink-2">
          <span>{label}</span>
          {required && <span className="text-coral" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 flex items-center justify-center text-muted">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-input border bg-surface text-[15px] text-ink transition-colors duration-150 placeholder:text-muted/70 hover:border-muted focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-not-allowed disabled:bg-paper-2 disabled:opacity-60 ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
            error ? 'border-coral focus:border-coral' : 'border-rule-2'
          } ${className}`}
          {...props}
        />

        {rightIcon && (
          <span className="absolute right-3.5 flex items-center justify-center text-muted">{rightIcon}</span>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger-ink" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-help`} className="text-xs text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
