import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import Dialog from './Dialog.jsx';

/**
 * App-wide confirmation dialog primitive.
 *
 * Replaces blocking `window.confirm()` with an accessible, styled, async
 * dialog. The hook returns a function that resolves to `true` if the user
 * confirms or `false` if they cancel / dismiss / press Escape.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *       title: 'Delete user?',
 *       message: 'This cannot be undone.',
 *       confirmLabel: 'Delete',
 *       danger: true,
 *   });
 *   if (!ok) return;
 *   await deleteUser(...);
 */

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null);
    const resolverRef = useRef(null);

    const confirm = useCallback((opts = {}) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setState({
                title: opts.title || 'Are you sure?',
                message: opts.message || '',
                confirmLabel: opts.confirmLabel || 'Confirm',
                cancelLabel: opts.cancelLabel || 'Cancel',
                danger: !!opts.danger,
            });
        });
    }, []);

    const close = useCallback((value) => {
        setState(null);
        const resolver = resolverRef.current;
        resolverRef.current = null;
        resolver?.(!!value);
    }, []);

    const value = useMemo(() => ({ confirm }), [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            <Dialog
                isOpen={!!state}
                onClose={() => close(false)}
                title={state?.title}
                description={state?.message}
                size="sm"
                showCloseButton={false}
            >
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
                    <button
                        type="button"
                        onClick={() => close(false)}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                    >
                        {state?.cancelLabel}
                    </button>
                    <button
                        type="button"
                        autoFocus
                        onClick={() => close(true)}
                        className={`px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                            state?.danger
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                        }`}
                    >
                        {state?.confirmLabel}
                    </button>
                </div>
            </Dialog>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error('useConfirm must be used inside <ConfirmProvider>');
    }
    return ctx.confirm;
}

export default ConfirmProvider;
