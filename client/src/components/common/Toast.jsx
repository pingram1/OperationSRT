import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Accessible app-wide toast system.
 *
 * Why this exists: blocking `alert()` is jarring, can't be styled, and
 * isn't announced consistently to assistive tech. This primitive renders
 * non-blocking toasts in two ARIA live regions:
 *   - polite (success / info)  → announced after current speech finishes.
 *   - assertive (error / warning) → announced as soon as possible.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Saved');
 *   toast.error('Failed to save', { duration: 8000 });
 *
 *   // Manual:
 *   const id = toast.show({ kind: 'info', message: 'Working…', duration: 0 });
 *   toast.dismiss(id);
 *
 * Notes:
 *   - `duration: 0` keeps the toast until explicitly dismissed.
 *   - Toasts are keyed by an internal id; callers can pass an explicit
 *     `id` to deduplicate (latest wins).
 */

const KIND_DEFAULT_DURATION = {
    success: 4000,
    info: 4000,
    error: 7000,
    warning: 7000,
};

const KIND_THEME = {
    success: {
        Icon: CheckCircle,
        ring: 'ring-green-300',
        bg: 'bg-green-50',
        text: 'text-green-900',
        iconClass: 'text-green-600',
    },
    error: {
        Icon: XCircle,
        ring: 'ring-red-300',
        bg: 'bg-red-50',
        text: 'text-red-900',
        iconClass: 'text-red-600',
    },
    info: {
        Icon: Info,
        ring: 'ring-blue-300',
        bg: 'bg-blue-50',
        text: 'text-blue-900',
        iconClass: 'text-blue-600',
    },
    warning: {
        Icon: AlertTriangle,
        ring: 'ring-amber-300',
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        iconClass: 'text-amber-600',
    },
};

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);
    const timersRef = useRef(new Map());

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const show = useCallback((opts) => {
        const kind = opts?.kind || 'info';
        const message = String(opts?.message ?? '');
        if (!message) return null;
        const id = opts?.id ?? `t_${++idRef.current}`;
        const duration = Number.isFinite(opts?.duration)
            ? opts.duration
            : KIND_DEFAULT_DURATION[kind] ?? 4000;

        setToasts((prev) => {
            const without = prev.filter((t) => t.id !== id);
            return [...without, { id, kind, message, duration }];
        });

        // Reset existing timer if any.
        const prevTimer = timersRef.current.get(id);
        if (prevTimer) clearTimeout(prevTimer);
        if (duration > 0) {
            const handle = setTimeout(() => dismiss(id), duration);
            timersRef.current.set(id, handle);
        }
        return id;
    }, [dismiss]);

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach((t) => clearTimeout(t));
            timers.clear();
        };
    }, []);

    const api = useMemo(() => ({
        show,
        dismiss,
        success: (message, opts) => show({ ...opts, kind: 'success', message }),
        error: (message, opts) => show({ ...opts, kind: 'error', message }),
        info: (message, opts) => show({ ...opts, kind: 'info', message }),
        warning: (message, opts) => show({ ...opts, kind: 'warning', message }),
    }), [show, dismiss]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used inside <ToastProvider>');
    }
    return ctx;
}

function ToastViewport({ toasts, onDismiss }) {
    const polite = toasts.filter((t) => t.kind === 'success' || t.kind === 'info');
    const assertive = toasts.filter((t) => t.kind === 'error' || t.kind === 'warning');

    return (
        <>
            <div
                aria-live="polite"
                aria-atomic="false"
                className="pointer-events-none fixed top-4 right-4 z-[9999] flex flex-col items-end gap-2 max-w-sm w-full"
            >
                {polite.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
                ))}
            </div>
            <div
                aria-live="assertive"
                role="alert"
                aria-atomic="false"
                className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 max-w-sm w-full"
            >
                {assertive.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
                ))}
            </div>
        </>
    );
}

function ToastItem({ toast, onDismiss }) {
    const theme = KIND_THEME[toast.kind] || KIND_THEME.info;
    const { Icon } = theme;
    return (
        <div
            data-testid={`toast-${toast.kind}`}
            className={`pointer-events-auto w-full ${theme.bg} ${theme.text} ring-1 ${theme.ring} shadow-lg rounded-lg p-3 flex items-start gap-3`}
        >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${theme.iconClass}`} aria-hidden="true" />
            <div className="flex-1 text-sm leading-snug whitespace-pre-line">{toast.message}</div>
            <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="flex-shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
            >
                <X className="w-4 h-4" aria-hidden="true" />
            </button>
        </div>
    );
}

export default ToastProvider;
