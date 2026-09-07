/**
 * TOTP (RFC 6238) two-factor authentication helpers — zero external deps.
 *
 * Implemented with Node's built-in `crypto` (HMAC-SHA1) plus a small RFC 4648
 * base32 codec, so we don't depend on otplib/qrcode being installable. The
 * client renders the QR from the returned `otpauth://` URL (standard pattern;
 * compatible with Google Authenticator, Authy, 1Password, etc.).
 *
 * Replaces the previous "fake 2FA" that only flipped a boolean: a real secret
 * is generated, provisioned via otpauth URL, and verified on enrollment + login
 * with a ±1 step window to tolerate clock skew.
 */
const crypto = require('crypto');

const ISSUER = process.env.TOTP_ISSUER || 'Start Right Tutoring';
const DIGITS = 6;
const PERIOD = 30; // seconds
const WINDOW = 1; // accept current ± 1 step

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Encode a Buffer to RFC 4648 base32 (no padding). */
function base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < buffer.length; i += 1) {
        value = (value << 8) | buffer[i];
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
}

/** Decode an RFC 4648 base32 string (case-insensitive, padding tolerated). */
function base32Decode(input) {
    const clean = String(input).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (let i = 0; i < clean.length; i += 1) {
        const idx = BASE32_ALPHABET.indexOf(clean[i]);
        if (idx === -1) {
            throw new Error('Invalid base32 character in TOTP secret');
        }
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}

/** Generate a new base32 TOTP secret (160 bits of entropy). */
function generateSecret() {
    return base32Encode(crypto.randomBytes(20));
}

/** HOTP value for a given counter (RFC 4226). */
function hotp(secretBuffer, counter) {
    const buf = Buffer.alloc(8);
    // 64-bit big-endian counter.
    buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buf.writeUInt32BE(counter >>> 0, 4);

    const hmac = crypto.createHmac('sha1', secretBuffer).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary = ((hmac[offset] & 0x7f) << 24)
        | ((hmac[offset + 1] & 0xff) << 16)
        | ((hmac[offset + 2] & 0xff) << 8)
        | (hmac[offset + 3] & 0xff);
    const code = binary % 10 ** DIGITS;
    return String(code).padStart(DIGITS, '0');
}

/**
 * Build the otpauth:// provisioning URI for an authenticator app.
 * @param {string} accountName - usually the user's email.
 * @param {string} secret - base32 secret from generateSecret().
 */
function buildOtpAuthUrl(accountName, secret) {
    const label = encodeURIComponent(`${ISSUER}:${accountName}`);
    const params = new URLSearchParams({
        secret,
        issuer: ISSUER,
        algorithm: 'SHA1',
        digits: String(DIGITS),
        period: String(PERIOD),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Verify a user-supplied 6-digit code against the stored base32 secret,
 * allowing a ±WINDOW step tolerance for clock skew.
 * @returns {boolean}
 */
function verifyToken(token, secret) {
    if (!token || !secret) return false;
    const normalized = String(token).replace(/\s+/g, '');
    if (!/^\d{6}$/.test(normalized)) return false;

    let secretBuffer;
    try {
        secretBuffer = base32Decode(secret);
    } catch {
        return false;
    }

    const counter = Math.floor(Date.now() / 1000 / PERIOD);
    for (let errorWindow = -WINDOW; errorWindow <= WINDOW; errorWindow += 1) {
        const candidate = hotp(secretBuffer, counter + errorWindow);
        // Constant-time comparison to avoid leaking timing information.
        if (
            candidate.length === normalized.length &&
            crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(normalized))
        ) {
            return true;
        }
    }
    return false;
}

module.exports = {
    generateSecret,
    buildOtpAuthUrl,
    verifyToken,
    base32Encode,
    base32Decode,
    ISSUER,
    DIGITS,
    PERIOD,
};
