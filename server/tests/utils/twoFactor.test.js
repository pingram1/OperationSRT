/**
 * TOTP 2FA helper unit tests (RFC 6238 / RFC 4648).
 * Security: a real second factor must accept only valid, time-current codes.
 * Pattern: Arrange-Act-Assert (AAA).
 */
const crypto = require('crypto');
const {
    generateSecret,
    buildOtpAuthUrl,
    verifyToken,
    base32Encode,
    base32Decode,
    DIGITS,
    PERIOD,
} = require('../../utils/twoFactor');

/** Recompute the expected TOTP for a secret at "now" (mirrors the impl). */
function currentCode(secret, stepOffset = 0) {
    const secretBuffer = base32Decode(secret);
    const counter = Math.floor(Date.now() / 1000 / PERIOD) + stepOffset;
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buf.writeUInt32BE(counter >>> 0, 4);
    const hmac = crypto.createHmac('sha1', secretBuffer).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary = ((hmac[offset] & 0x7f) << 24)
        | ((hmac[offset + 1] & 0xff) << 16)
        | ((hmac[offset + 2] & 0xff) << 8)
        | (hmac[offset + 3] & 0xff);
    return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

describe('twoFactor (TOTP)', () => {
    describe('base32 codec', () => {
        it('round-trips arbitrary bytes', () => {
            const original = crypto.randomBytes(20);
            const decoded = base32Decode(base32Encode(original));
            expect(decoded.equals(original)).toBe(true);
        });
    });

    describe('generateSecret', () => {
        it('produces a non-trivial base32 secret', () => {
            const secret = generateSecret();
            expect(secret).toMatch(/^[A-Z2-7]+$/);
            expect(secret.length).toBeGreaterThanOrEqual(32);
        });
    });

    describe('buildOtpAuthUrl', () => {
        it('emits a valid otpauth URL with issuer + secret', () => {
            const url = buildOtpAuthUrl('jane@example.com', 'JBSWY3DPEHPK3PXP');
            expect(url).toContain('otpauth://totp/');
            expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
            expect(url).toContain('issuer=');
            expect(url).toContain('digits=6');
        });
    });

    describe('verifyToken', () => {
        it('accepts the current valid code', () => {
            const secret = generateSecret();
            expect(verifyToken(currentCode(secret), secret)).toBe(true);
        });

        it('accepts a code one step off (clock skew tolerance)', () => {
            const secret = generateSecret();
            expect(verifyToken(currentCode(secret, -1), secret)).toBe(true);
        });

        it('rejects an obviously wrong code', () => {
            const secret = generateSecret();
            const wrong = currentCode(secret) === '000000' ? '111111' : '000000';
            expect(verifyToken(wrong, secret)).toBe(false);
        });

        it('rejects malformed / empty input', () => {
            const secret = generateSecret();
            expect(verifyToken('', secret)).toBe(false);
            expect(verifyToken('abc', secret)).toBe(false);
            expect(verifyToken('12345', secret)).toBe(false);
            expect(verifyToken(currentCode(secret), '')).toBe(false);
        });
    });
});
