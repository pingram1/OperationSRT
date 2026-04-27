/**
 * Unit tests for utils/scrub.js — confirms the shared PII scrubber catches
 * the patterns we promise to redact for both Winston and Sentry.
 */
const { scrub, scrubString, scrubRequestLike } = require('../../utils/scrub');

describe('scrub (key-based redaction)', () => {
    it('redacts sensitive keys regardless of value', () => {
        const out = scrub({
            password: 'Hunter2!',
            authorization: 'Bearer abc.def.ghi',
            apiKey: 'sk_test_123',
            refreshToken: 'rt_value',
            normal: 'keep me',
        });
        expect(out.password).toBe('[REDACTED]');
        expect(out.authorization).toBe('[REDACTED]');
        expect(out.apiKey).toBe('[REDACTED]');
        expect(out.refreshToken).toBe('[REDACTED]');
        expect(out.normal).toBe('keep me');
    });

    it('walks nested objects and arrays', () => {
        const out = scrub({
            user: {
                profile: {
                    password: 'secret',
                    name: 'Alice',
                },
            },
            // Use a parent key that does NOT itself match the sensitive
            // regex so we actually exercise array recursion.
            items: [{ password: 'abc' }, { password: 'def' }],
        });
        expect(out.user.profile.password).toBe('[REDACTED]');
        expect(out.user.profile.name).toBe('Alice');
        expect(out.items[0].password).toBe('[REDACTED]');
        expect(out.items[1].password).toBe('[REDACTED]');
    });

    it('redacts arrays whose parent key is itself sensitive', () => {
        const out = scrub({
            tokens: [{ token: 'abc' }, { token: 'def' }],
        });
        // The whole subtree gets redacted because 'tokens' matches the
        // sensitive-key pattern — fail-closed by design.
        expect(out.tokens).toBe('[REDACTED]');
    });

    it('handles circular references without throwing', () => {
        const cyclic = { a: 1 };
        cyclic.self = cyclic;
        expect(() => scrub(cyclic)).not.toThrow();
        const out = scrub(cyclic);
        expect(out.a).toBe(1);
        expect(out.self).toBe('[Circular]');
    });
});

describe('scrubString (value-based redaction)', () => {
    it('redacts JWT-shaped strings inside text', () => {
        const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.AbCdEfGhIjKl';
        const out = scrubString(`got ${jwt} for user`);
        expect(out).not.toContain(jwt);
        expect(out).toContain('[REDACTED]');
    });

    it('redacts Bearer tokens', () => {
        const out = scrubString('Authorization: Bearer abcdef0123456789');
        expect(out).toContain('Bearer [REDACTED]');
    });

    it('redacts Stripe-style keys', () => {
        const out = scrubString('using sk_test_abcdef0123456 for charge');
        expect(out).toContain('[REDACTED]');
        expect(out).not.toContain('sk_test_abcdef0123456');
    });

    it('partially masks emails', () => {
        const out = scrubString('contact alice@example.com today');
        expect(out).toContain('a***@example.com');
        expect(out).not.toContain('alice@example.com');
    });

    it('redacts credit-card-shaped numbers', () => {
        const out = scrubString('card 4242 4242 4242 4242 charged');
        expect(out).not.toContain('4242 4242 4242 4242');
        expect(out).toContain('[REDACTED]');
    });

    it('truncates very long strings', () => {
        const long = 'x'.repeat(5000);
        const out = scrubString(long);
        expect(out.length).toBeLessThan(long.length);
        expect(out).toContain('[truncated');
    });
});

describe('scrubRequestLike', () => {
    it('produces a serializable, redacted snapshot of an Express-shaped request', () => {
        const req = {
            method: 'POST',
            url: '/api/auth/login',
            path: '/api/auth/login',
            query: { redirect: '/home' },
            params: {},
            body: { email: 'bob@example.com', password: 'topsecret' },
            headers: {
                authorization: 'Bearer abcdef.ghijkl.mnopqr',
                'user-agent': 'jest',
            },
        };
        const out = scrubRequestLike(req);
        expect(out.method).toBe('POST');
        expect(out.headers.authorization).toBe('[REDACTED]');
        expect(out.body.password).toBe('[REDACTED]');
        expect(out.body.email).toBe('b***@example.com');
    });
});
