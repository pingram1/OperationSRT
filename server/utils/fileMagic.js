/**
 * File-type detection by magic bytes.
 *
 * Multer's `fileFilter` only inspects the (client-supplied) MIME type and
 * filename extension, both of which can be forged. This module reads the
 * first bytes of a file from disk and reports its actual format so a
 * post-upload middleware can reject mismatches and delete the file.
 *
 * Supported categories (kinds) — any new kind must be added here AND to
 * ALLOWED_KIND_FOR_EXT below if you want extension-based validation.
 */

const fs = require('fs').promises;

/**
 * Read the first `n` bytes from a file as a Buffer. Returns shorter buffer
 * if the file is smaller than `n`.
 * @param {string} filePath
 * @param {number} n
 * @returns {Promise<Buffer>}
 */
async function readHead(filePath, n = 32) {
    const fd = await fs.open(filePath, 'r');
    try {
        const buf = Buffer.alloc(n);
        const { bytesRead } = await fd.read(buf, 0, n, 0);
        return buf.subarray(0, bytesRead);
    } finally {
        await fd.close();
    }
}

function startsWith(buf, sig) {
    if (buf.length < sig.length) return false;
    for (let i = 0; i < sig.length; i++) {
        if (buf[i] !== sig[i]) return false;
    }
    return true;
}

/**
 * Detect the kind of a file based on its magic bytes.
 * @param {Buffer} head — first ~32 bytes of the file
 * @returns {'pdf' | 'zip' | 'cfbf' | 'jpeg' | 'png' | 'gif' | 'webp' | 'unknown'}
 */
function detectKind(head) {
    if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2D])) return 'pdf'; // %PDF-
    if (startsWith(head, [0x50, 0x4B, 0x03, 0x04])) return 'zip'; // PK\x03\x04 — DOCX/ODT/PAGES
    if (startsWith(head, [0x50, 0x4B, 0x05, 0x06])) return 'zip'; // empty zip
    if (startsWith(head, [0x50, 0x4B, 0x07, 0x08])) return 'zip'; // spanned zip
    if (startsWith(head, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) return 'cfbf'; // .doc
    if (startsWith(head, [0xFF, 0xD8, 0xFF])) return 'jpeg';
    if (startsWith(head, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return 'png';
    if (startsWith(head, [0x47, 0x49, 0x46, 0x38])) return 'gif'; // GIF87a/89a
    if (
        startsWith(head, [0x52, 0x49, 0x46, 0x46]) // RIFF
        && head.length >= 12
        && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50 // WEBP
    ) return 'webp';
    return 'unknown';
}

/**
 * Map of declared file extension -> the kind(s) we accept on disk.
 * Used by `expectKindForExt` so an .docx that is actually a PDF is rejected.
 */
const ALLOWED_KIND_FOR_EXT = {
    '.pdf': ['pdf'],
    '.docx': ['zip'],
    '.odt': ['zip'],
    '.pages': ['zip'],
    '.doc': ['cfbf'],
    '.jpg': ['jpeg'],
    '.jpeg': ['jpeg'],
    '.png': ['png'],
    '.gif': ['gif'],
    '.webp': ['webp'],
};

/**
 * Returns the set of acceptable detected kinds for a given extension, or
 * `null` if the extension is not in our allowlist.
 * @param {string} ext — lowercase, including leading dot (e.g. '.pdf')
 * @returns {string[] | null}
 */
function expectKindForExt(ext) {
    return ALLOWED_KIND_FOR_EXT[ext] || null;
}

/**
 * Verify that the file at `filePath` matches one of `expected` kinds based
 * on its magic bytes. Returns the detected kind on success or throws an
 * Error with a safe message on mismatch.
 * @param {string} filePath
 * @param {string[]} expected
 * @returns {Promise<string>}
 */
async function verifyMagicBytes(filePath, expected) {
    const head = await readHead(filePath, 32);
    const detected = detectKind(head);
    if (!expected.includes(detected)) {
        const err = new Error(`Uploaded file content does not match its declared type (detected: ${detected}).`);
        err.statusCode = 400;
        err.code = 'MAGIC_BYTE_MISMATCH';
        throw err;
    }
    return detected;
}

module.exports = {
    readHead,
    detectKind,
    expectKindForExt,
    verifyMagicBytes,
    ALLOWED_KIND_FOR_EXT,
};
