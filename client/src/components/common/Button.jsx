import React from 'react';
import { Loader2 } from 'lucide-react';

// `md` intentionally omits an explicit text-size so call sites that style
// surrounding text continue to control the button label size. `sm` and `lg`
// are opt-in shrink/grow modifiers.
const SIZE_CLASSES = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-5 py-2.5 text-base',
};

const VARIANT_CLASSES = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400',
    outline:
        'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 focus:ring-gray-400',
};

/**
 * A highly reusable and customizable button component.
 *
 * Variants and sizes are deliberately small so the rest of the app can
 * stop hand-rolling its own button styles.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {('primary'|'secondary'|'success'|'danger'|'ghost'|'outline')} [props.variant='primary']
 * @param {('sm'|'md'|'lg')} [props.size='md']
 * @param {React.ElementType} [props.Icon] Icon component (e.g. lucide-react).
 * @param {boolean} [props.isLoading=false] Shows a spinner and disables the button.
 * @param {boolean} [props.iconOnly=false] When true, drops the right margin
 *   on the leading icon and removes the children gap (square buttons).
 * @param {string} [props.className]
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement>} [props...rest]
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    Icon,
    isLoading = false,
    iconOnly = false,
    className = '',
    ...rest
}) {
    const baseStyles =
        'inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const sizeStyles = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
    const variantStyles = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary;
    const disabledStyles =
        'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-gray-300';

    const iconSpacing = iconOnly ? '' : 'mr-2 -ml-1';
    const iconClass = `w-5 h-5 ${iconSpacing}`.trim();

    return (
        <button
            className={`${baseStyles} ${sizeStyles} ${variantStyles} ${disabledStyles} ${className}`.trim()}
            disabled={isLoading || rest.disabled}
            {...rest}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
                <>
                    {Icon && <Icon className={iconClass} aria-hidden="true" />}
                    {children}
                </>
            )}
        </button>
    );
}
