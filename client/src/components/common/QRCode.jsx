import React, { useMemo } from 'react';
import { generateQrMatrix } from '../../utils/qrcode.js';

/**
 * Renders a QR code as a crisp, scalable SVG using the in-repo zero-dependency
 * encoder. The encoded value (e.g. an `otpauth://` URI containing a TOTP secret)
 * never leaves the browser.
 *
 * @param {object} props
 * @param {string} props.value - The string to encode.
 * @param {number} [props.size=192] - Rendered pixel size (square).
 * @param {number} [props.margin=2] - Quiet-zone width in modules.
 * @param {string} [props.className]
 */
export default function QRCode({ value, size = 192, margin = 2, className = '' }) {
    const matrix = useMemo(() => {
        if (!value) return null;
        try {
            return generateQrMatrix(value);
        } catch {
            return null;
        }
    }, [value]);

    if (!matrix) {
        return (
            <div
                className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs rounded ${className}`}
                style={{ width: size, height: size }}
                role="img"
                aria-label="QR code unavailable"
            >
                QR unavailable
            </div>
        );
    }

    const count = matrix.length;
    const dim = count + margin * 2;

    // Build a single path string for all dark modules (one DOM node, fast paint).
    let path = '';
    for (let y = 0; y < count; y++) {
        for (let x = 0; x < count; x++) {
            if (matrix[y][x]) {
                path += `M${x + margin},${y + margin}h1v1h-1z`;
            }
        }
    }

    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox={`0 0 ${dim} ${dim}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label="Two-factor authentication setup QR code"
        >
            <rect width={dim} height={dim} fill="#ffffff" />
            <path d={path} fill="#000000" />
        </svg>
    );
}
