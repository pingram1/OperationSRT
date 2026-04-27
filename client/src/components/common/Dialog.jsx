import React, {
    useCallback,
    useEffect,
    useId,
    useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Accessible modal dialog primitive.
 *
 * Implements the standard dialog contract:
 *   - role="dialog", aria-modal="true"
 *   - aria-labelledby pointing at the title node (or aria-label for unlabeled)
 *   - Escape closes (suppress with `escapeClose={false}`)
 *   - First focusable child is focused on open
 *   - Focus trap: Tab cycles within the dialog
 *   - Focus restored to the previously-focused element on close
 *   - Body scroll locked while open
 *   - Backdrop click closes (suppress with `backdropClose={false}`)
 *
 * Rationale: every "modal" in the codebase was hand-rolled and missed at
 * least one of these. Centralizing prevents drift and gets us a real
 * baseline that screen readers + keyboard users can rely on.
 *
 * Usage:
 *   <Dialog isOpen={open} onClose={() => setOpen(false)} title="Confirm">
 *     ...
 *   </Dialog>
 *
 * For dialogs with a custom title node, omit `title` and pass
 * `aria-labelledby` referencing your own heading id.
 */
export default function Dialog({
    isOpen,
    onClose,
    title,
    description,
    children,
    initialFocusRef,
    size = 'md',
    backdropClose = true,
    escapeClose = true,
    showCloseButton = true,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
}) {
    const titleId = useId();
    const descId = useId();
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        previouslyFocusedRef.current = document.activeElement;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const focusTimer = setTimeout(() => {
            if (initialFocusRef?.current) {
                initialFocusRef.current.focus();
            } else {
                const focusable = getFocusable(dialogRef.current);
                (focusable[0] || dialogRef.current)?.focus();
            }
        }, 0);

        const onKey = (e) => {
            if (e.key === 'Escape' && escapeClose) {
                e.stopPropagation();
                onClose?.();
                return;
            }
            if (e.key === 'Tab') {
                trapTab(e, dialogRef.current);
            }
        };

        document.addEventListener('keydown', onKey, true);

        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('keydown', onKey, true);
            document.body.style.overflow = prevOverflow;
            const prev = previouslyFocusedRef.current;
            if (prev && typeof prev.focus === 'function') {
                prev.focus();
            }
        };
    }, [isOpen, escapeClose, initialFocusRef, onClose]);

    const onBackdropMouseDown = useCallback((e) => {
        if (!backdropClose) return;
        if (e.target === e.currentTarget) {
            onClose?.();
        }
    }, [backdropClose, onClose]);

    if (!isOpen) return null;

    const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;
    const labelledBy = ariaLabelledBy || (title ? titleId : undefined);
    const describedBy = ariaDescribedBy || (description ? descId : undefined);

    const dialog = (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
            onMouseDown={onBackdropMouseDown}
            data-testid="dialog-backdrop"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
                tabIndex={-1}
                className={`bg-white rounded-xl shadow-2xl w-full ${sizeClass} max-h-[90vh] flex flex-col focus:outline-none`}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between gap-4 p-6 pb-3 border-b border-gray-200">
                        <div className="min-w-0 flex-1">
                            {title && (
                                <h2 id={titleId} className="text-xl font-semibold text-gray-900 truncate">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p id={descId} className="text-sm text-gray-600 mt-1">
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close dialog"
                                className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <X className="w-5 h-5" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(dialog, document.body);
}

const SIZE_CLASS = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
    );
}

function trapTab(e, root) {
    const focusable = getFocusable(root);
    if (focusable.length === 0) {
        e.preventDefault();
        root?.focus();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
            e.preventDefault();
            last.focus();
        }
    } else if (active === last) {
        e.preventDefault();
        first.focus();
    }
}
