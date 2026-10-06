import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Ultra-aesthetic custom Select dropdown matching Stripe/Tailwind dark & light design system.
 */
export function Select({
  options = [],
  value,
  onChange,
  label,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  leftIcon,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Handle keyboard escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className={`w-full flex flex-col gap-1.5 text-left relative ${className}`} ref={containerRef}>
      {label && (
        <label className="flex items-center gap-1 text-xs font-semibold text-ink-2">
          <span>{label}</span>
          {required && <span className="text-coral" aria-hidden="true">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-input border bg-surface px-3.5 text-sm text-ink transition-colors duration-150 ${
          open ? 'border-ink' : 'border-rule-2 hover:border-muted'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          {leftIcon && <span className="text-ink-mute shrink-0">{leftIcon}</span>}
          {selectedOption ? (
            <span className="truncate font-medium text-ink">{selectedOption.label}</span>
          ) : (
            <span className="text-ink-mute truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-ink-mute shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-ink' : ''
          }`}
        />
      </button>

      {/* Aesthetic Floating Menu */}
      {open && (
        <div role="listbox" className="custom-scrollbar absolute left-0 top-full z-[100] mt-1.5 max-h-64 w-full overflow-y-auto rounded-input border border-rule bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={isSelected}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2.5 text-left text-sm transition-colors ${
                  isSelected ? 'bg-pear-tint font-semibold text-ink' : 'text-ink hover:bg-paper-2'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{option.label}</span>
                  {option.description && (
                    <span className="truncate text-xs text-muted">{option.description}</span>
                  )}
                </div>

                {isSelected && (
                  <Check className="size-4 shrink-0 stroke-[2.5] text-ink" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Select;
