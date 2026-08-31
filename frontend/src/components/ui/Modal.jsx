import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconX } from '@tabler/icons-react';


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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
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
            className="fixed inset-0 bg-brand-dark/40 backdrop-blur-xs"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidth} bg-canvas text-ink border border-hairline rounded-lg shadow-float p-6 z-10 overflow-hidden`}
          >
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  {title && (
                    <h3 className="text-lg font-medium text-ink leading-snug">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs text-ink-mute mt-1">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-ink-mute hover:text-ink p-1 rounded-sm hover:bg-canvas-soft transition-colors cursor-pointer"
                    aria-label="Close modal"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            <div className="mt-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
