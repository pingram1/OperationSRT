/**
 * Canonical pagination contract.
 *
 * Query string:
 *   ?page=1&pageSize=20    (1-indexed page, capped pageSize)
 *
 * Response envelope from `paginatedResponse(items, total, { page, pageSize })`:
 *
 *   {
 *     data: T[],
 *     page: number,
 *     pageSize: number,
 *     total: number,
 *     totalPages: number,
 *     hasMore: boolean
 *   }
 *
 * For new list endpoints, prefer this shape. For existing endpoints that
 * return a bare array (e.g. `getTransactions`, `getMyPayoutRequests`,
 * `getLedger` with `{ items, total, limit, skip }`), do NOT migrate
 * casually — clients consume the existing shape via `Array.isArray(data)`
 * checks. Migrate them deliberately, in the same PR that updates the
 * client consumer.
 *
 * Caveats:
 *   - `pageSize` is hard-capped at `maxPageSize` (default 100). Anything
 *     larger is silently clamped.
 *   - `page < 1` is clamped to 1.
 *   - Non-numeric / NaN inputs fall back to the defaults.
 */

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGE_SIZE = 100;

/**
 * Parse a query value as an integer. Returns `fallback` only when the input
 * is missing or not parseable (NaN). Out-of-range integers (0, negative,
 * huge) are still returned and clamped by the caller — that lets us
 * distinguish "garbage input → use default" from "valid but out-of-range
 * input → clamp to range".
 */
function parseIntOrFallback(raw, fallback) {
    if (raw === undefined || raw === null || raw === '') return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse `page` / `pageSize` from `req.query`, with caps and defaults.
 *
 * @param {import('express').Request} req
 * @param {{ defaultPageSize?: number, maxPageSize?: number }} [opts]
 * @returns {{ page: number, pageSize: number, skip: number, limit: number }}
 */
function parsePagination(req, opts = {}) {
    const defaultPageSize = opts.defaultPageSize || DEFAULT_PAGE_SIZE;
    const maxPageSize = opts.maxPageSize || DEFAULT_MAX_PAGE_SIZE;

    const rawPage = req.query?.page;
    const rawPageSize = req.query?.pageSize;

    const page = Math.max(1, parseIntOrFallback(rawPage, 1));
    const pageSize = Math.min(
        maxPageSize,
        Math.max(1, parseIntOrFallback(rawPageSize, defaultPageSize)),
    );

    return {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        limit: pageSize,
    };
}

/**
 * Build the canonical paginated response envelope.
 *
 * @template T
 * @param {T[]} data
 * @param {number} total
 * @param {{ page: number, pageSize: number }} pagination
 * @returns {{ data: T[], page: number, pageSize: number, total: number, totalPages: number, hasMore: boolean }}
 */
function paginatedResponse(data, total, { page, pageSize }) {
    const safeTotal = Math.max(0, Number(total) || 0);
    const totalPages = pageSize > 0 ? Math.ceil(safeTotal / pageSize) : 0;
    return {
        data: Array.isArray(data) ? data : [],
        page,
        pageSize,
        total: safeTotal,
        totalPages,
        hasMore: page < totalPages,
    };
}

module.exports = {
    parsePagination,
    paginatedResponse,
    DEFAULT_PAGE_SIZE,
    DEFAULT_MAX_PAGE_SIZE,
};
