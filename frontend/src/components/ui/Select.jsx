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
        <label className="text-xs font-medium text-ink-secondary flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-ruby">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full h-9 px-3 text-xs bg-canvas text-ink border rounded-md flex items-center justify-between transition-all duration-150 cursor-pointer ${
          open
            ? 'border-primary ring-1 ring-primary shadow-xs'
            : 'border-hairline hover:border-hairline/80 hover:bg-canvas-soft/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            open ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Aesthetic Floating Menu */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-canvas/95 backdrop-blur-md rounded-xl shadow-float border border-hairline py-1.5 z-50 max-h-60 overflow-y-auto custom-scrollbar">
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
                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-ink hover:bg-canvas-soft/80'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{option.label}</span>
                  {option.description && (
                    <span className="text-[10px] text-ink-mute truncate">{option.description}</span>
                  )}
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0 stroke-[2.5]" />
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
