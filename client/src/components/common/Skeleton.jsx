import React from 'react';

/**
 * Skeleton — lightweight, accessible placeholder for content that is
 * still loading. Reduces layout shift versus a centered spinner because
 * the placeholder occupies the same vertical space as the real content.
 *
 * The placeholder is decorative (the surrounding region should expose its
 * own aria-busy state); we set role="presentation" + aria-hidden="true"
 * so screen readers do not announce it.
 */
function Skeleton({
    className = '',
    width,
    height,
    rounded = 'md',
    as: Tag = 'span',
    style: styleProp,
}) {
    const radius =
        rounded === 'full'
            ? 'rounded-full'
            : rounded === 'lg'
            ? 'rounded-lg'
            : rounded === 'sm'
            ? 'rounded-sm'
            : rounded === 'none'
            ? 'rounded-none'
            : 'rounded-md';

    const inlineStyle = {
        ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : null),
        ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : null),
        ...(styleProp || null),
    };

    return (
        <Tag
            role="presentation"
            aria-hidden="true"
            className={`block bg-gray-200 ${radius} animate-pulse ${className}`}
            style={inlineStyle}
        />
    );
}

/**
 * Convenience wrapper that renders a vertical stack of text-like skeleton
 * lines. The last line is rendered narrower for a more natural look.
 */
export function SkeletonText({ lines = 3, className = '' }) {
    const safeLines = Math.max(1, Number.isFinite(lines) ? lines : 1);
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: safeLines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height={12}
                    className={i === safeLines - 1 ? 'w-2/3' : 'w-full'}
                />
            ))}
        </div>
    );
}

export default Skeleton;
