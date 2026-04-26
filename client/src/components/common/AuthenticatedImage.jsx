import { useState, useEffect, useRef } from 'react';
import { getSecureToken } from '../../api/authStorage.js';

const FALLBACK_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='12'%3EBadge%3C/text%3E%3C/svg%3E";

/**
 * Renders an image. Relative URLs (e.g. /uploads/...) are loaded with
 * Authorization: Bearer <token> because server routes are auth-gated.
 * Absolute http(s) URLs are loaded as a normal <img> without a fetch.
 */
export function AuthenticatedImage({ src, alt, className, ...rest }) {
  const [displaySrc, setDisplaySrc] = useState(() =>
    typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://')) ? src : FALLBACK_SVG
  );
  const objectUrlRef = useRef(null);
  const aborterRef = useRef(null);

  useEffect(() => {
    if (aborterRef.current) {
      aborterRef.current.abort();
    }

    if (!src || typeof src !== 'string') {
      setDisplaySrc(FALLBACK_SVG);
      return;
    }

    if (src.startsWith('http://') || src.startsWith('https://')) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setDisplaySrc(src);
      return;
    }

    const token = getSecureToken();
    if (!token) {
      setDisplaySrc(FALLBACK_SVG);
      return;
    }

    const path = src.startsWith('/') ? src : `/${src}`;
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const fetchUrl = apiBase ? `${apiBase}${path}` : path;

    const controller = new AbortController();
    aborterRef.current = controller;

    (async () => {
      try {
        const res = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          setDisplaySrc(FALLBACK_SVG);
          return;
        }
        const blob = await res.blob();
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setDisplaySrc(objectUrl);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        setDisplaySrc(FALLBACK_SVG);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [src]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    []
  );

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = FALLBACK_SVG;
      }}
      {...rest}
    />
  );
}
