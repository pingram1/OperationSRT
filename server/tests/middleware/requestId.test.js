/**
 * Unit tests for middleware/requestId.js
 */
const {
    requestIdMiddleware,
    isValidIncomingId,
    generateRequestId,
} = require('../../middleware/requestId');

const fakeReq = (incoming) => {
    const headers = {};
    if (incoming !== undefined) headers['x-request-id'] = incoming;
    return {
        get(name) {
            return headers[String(name).toLowerCase()];
        },
    };
};

const fakeRes = () => {
    const headers = {};
    return {
        setHeader: vi.fn((name, value) => {
            headers[name] = value;
        }),
        _headers: headers,
    };
};

describe('isValidIncomingId', () => {
    it('accepts UUIDs and ULIDs', () => {
        expect(isValidIncomingId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(isValidIncomingId('01HZ1A2B3C4D5E6F7G8H9JKLMN')).toBe(true);
    });

    it('rejects empty / non-string / control chars', () => {
        expect(isValidIncomingId('')).toBe(false);
        expect(isValidIncomingId(null)).toBe(false);
        expect(isValidIncomingId(undefined)).toBe(false);
        expect(isValidIncomingId(12345)).toBe(false);
        expect(isValidIncomingId('has space')).toBe(false);
        expect(isValidIncomingId('drop\rtable')).toBe(false);
    });

    it('rejects strings longer than 128 chars', () => {
        expect(isValidIncomingId('a'.repeat(129))).toBe(false);
        expect(isValidIncomingId('a'.repeat(128))).toBe(true);
    });
});

describe('generateRequestId', () => {
    it('produces non-empty unique ids', () => {
        const a = generateRequestId();
        const b = generateRequestId();
        expect(a).toBeTruthy();
        expect(typeof a).toBe('string');
        expect(a).not.toBe(b);
    });
});

describe('requestIdMiddleware', () => {
    it('generates an id when no header is provided', () => {
        const req = fakeReq();
        const res = fakeRes();
        const next = vi.fn();
        requestIdMiddleware(req, res, next);
        expect(req.requestId).toBeTruthy();
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('reuses a safe incoming X-Request-Id header', () => {
        const incoming = '550e8400-e29b-41d4-a716-446655440000';
        const req = fakeReq(incoming);
        const res = fakeRes();
        requestIdMiddleware(req, res, vi.fn());
        expect(req.requestId).toBe(incoming);
    });

    it('rejects unsafe incoming ids and generates a fresh one', () => {
        const req = fakeReq('drop\ntable users');
        const res = fakeRes();
        requestIdMiddleware(req, res, vi.fn());
        expect(req.requestId).not.toBe('drop\ntable users');
        expect(req.requestId).toBeTruthy();
    });
});
