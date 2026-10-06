import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

/**
 * Animated modal dialog component with backdrop blur and keyboard escape listener.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-md',
  showCloseButton = true,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[400] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--color-scrim)]"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8, transition: { duration: 0.16 } }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={`relative z-10 flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-slab border border-rule bg-surface p-5 text-ink shadow-[var(--shadow-pop)] sm:rounded-slab sm:p-7`}
          >
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
                <div>
                  {title && (
                    <h3 className="font-display text-xl font-semibold leading-snug tracking-tight text-ink">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="mt-1.5 text-sm text-muted">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-pill border border-rule text-muted transition-colors hover:bg-paper-2 hover:text-ink"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            <div className="mt-2 overflow-y-auto pr-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
