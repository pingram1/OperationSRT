import React from 'react';

const PADDING_CLASSES = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    responsive: 'p-4 sm:p-6',
};

const HOVER_CLASSES = {
    none: '',
    subtle: 'transition-all duration-200 hover:shadow-lg',
    lift: 'transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
};

/**
 * Card — a single source of truth for the surface used across pages.
 *
 * Replaces the per-page inline `Card` declarations that all converged on
 * `bg-white rounded-xl shadow-md p-*` with optional hover treatments.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] Extra classes appended to the surface.
 * @param {('none'|'sm'|'md'|'lg'|'responsive')} [props.padding='md']
 *   Inner padding. 'responsive' is `p-4 sm:p-6` for mobile-friendly layouts.
 * @param {('none'|'subtle'|'lift')} [props.hover='none']
 *   Hover treatment. 'subtle' bumps shadow only, 'lift' adds a 1.02 scale
 *   for clickable lists (challenges, resources).
 * @param {React.ElementType} [props.as] Tag to render. Defaults to <div>.
 *   Pass 'button' or 'a' when the card itself is interactive so screen
 *   readers get the right role.
 */
export default function Card({
    children,
    className = '',
    padding = 'md',
    hover = 'none',
    as: Tag = 'div',
    ...rest
}) {
    const padClass = PADDING_CLASSES[padding] ?? PADDING_CLASSES.md;
    const hoverClass = HOVER_CLASSES[hover] ?? HOVER_CLASSES.none;
    return (
        <Tag
            className={`bg-white rounded-xl shadow-md ${padClass} ${hoverClass} ${className}`.trim()}
            {...rest}
        >
            {children}
        </Tag>
    );
}
