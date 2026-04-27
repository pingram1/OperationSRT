/**
 * Unit tests for utils/pagination.js
 */
const {
    parsePagination,
    paginatedResponse,
    DEFAULT_PAGE_SIZE,
    DEFAULT_MAX_PAGE_SIZE,
} = require('../../utils/pagination');

const reqWith = (query = {}) => ({ query });

describe('parsePagination', () => {
    it('returns defaults when query is empty', () => {
        const r = parsePagination(reqWith({}));
        expect(r).toEqual({
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
            skip: 0,
            limit: DEFAULT_PAGE_SIZE,
        });
    });

    it('honors page + pageSize from query', () => {
        const r = parsePagination(reqWith({ page: '3', pageSize: '15' }));
        expect(r.page).toBe(3);
        expect(r.pageSize).toBe(15);
        expect(r.skip).toBe(30);
        expect(r.limit).toBe(15);
    });

    it('clamps page to >= 1', () => {
        expect(parsePagination(reqWith({ page: '0' })).page).toBe(1);
        expect(parsePagination(reqWith({ page: '-5' })).page).toBe(1);
    });

    it('clamps pageSize to maxPageSize', () => {
        const r = parsePagination(reqWith({ pageSize: '9999' }));
        expect(r.pageSize).toBe(DEFAULT_MAX_PAGE_SIZE);
        expect(r.limit).toBe(DEFAULT_MAX_PAGE_SIZE);
    });

    it('clamps pageSize to >= 1', () => {
        expect(parsePagination(reqWith({ pageSize: '0' })).pageSize).toBe(1);
        expect(parsePagination(reqWith({ pageSize: '-3' })).pageSize).toBe(1);
    });

    it('falls back to defaults on garbage input', () => {
        const r = parsePagination(reqWith({ page: 'abc', pageSize: 'NaN' }));
        expect(r.page).toBe(1);
        expect(r.pageSize).toBe(DEFAULT_PAGE_SIZE);
    });

    it('honors caller-provided defaults and caps', () => {
        const r = parsePagination(reqWith({}), { defaultPageSize: 50, maxPageSize: 50 });
        expect(r.pageSize).toBe(50);
        const capped = parsePagination(reqWith({ pageSize: '500' }), { maxPageSize: 50 });
        expect(capped.pageSize).toBe(50);
    });
});

describe('paginatedResponse', () => {
    it('builds the canonical envelope', () => {
        const items = [{ id: 1 }, { id: 2 }];
        const out = paginatedResponse(items, 42, { page: 2, pageSize: 20 });
        expect(out).toEqual({
            data: items,
            page: 2,
            pageSize: 20,
            total: 42,
            totalPages: 3,
            hasMore: true,
        });
    });

    it('hasMore is false on the last page', () => {
        const out = paginatedResponse([{}], 11, { page: 3, pageSize: 5 });
        expect(out.totalPages).toBe(3);
        expect(out.hasMore).toBe(false);
    });

    it('handles total = 0', () => {
        const out = paginatedResponse([], 0, { page: 1, pageSize: 20 });
        expect(out.total).toBe(0);
        expect(out.totalPages).toBe(0);
        expect(out.hasMore).toBe(false);
    });

    it('coerces non-array data to []', () => {
        const out = paginatedResponse(null, 0, { page: 1, pageSize: 10 });
        expect(out.data).toEqual([]);
    });

    it('coerces negative or NaN total to 0', () => {
        expect(paginatedResponse([], -1, { page: 1, pageSize: 10 }).total).toBe(0);
        expect(paginatedResponse([], NaN, { page: 1, pageSize: 10 }).total).toBe(0);
    });
});
