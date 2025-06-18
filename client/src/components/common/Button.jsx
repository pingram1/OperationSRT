import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * A highly reusable and customizable button component.
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The content to display inside the button.
 * @param {('primary'|'secondary'|'danger')} [props.variant='primary'] - The visual style of the button.
 * @param {React.ElementType} [props.Icon] - An optional icon component (e.g., from lucide-react) to display.
 * @param {boolean} [props.isLoading=false] - If true, shows a loading spinner and disables the button.
 * @param {string} [props.className] - Additional Tailwind CSS classes to apply.
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement>} [props...rest] - All other standard button props (e.g., onClick, disabled, type).
 */
export default function Button({ 
    children, 
    variant = 'primary', 
    Icon, 
    isLoading = false, 
    className = '', 
    ...rest 
}) {
    // Base styles for all buttons
    const baseStyles = 'flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    // Styles specific to each variant
    const variantStyles = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    // Disabled state styles
    const disabledStyles = 'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed';

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`}
            disabled={isLoading || rest.disabled}
            {...rest}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    {Icon && <Icon className="w-5 h-5 mr-2 -ml-1" />}
                    {children}
                </>
            )}
        </button>
    );
}
