/**
 * Zero-dependency QR Code generator.
 *
 * Faithful, trimmed port of Project Nayuki's "QR Code generator" library
 * (https://www.nayuki.io/page/qr-code-generator-library) — released into the
 * public domain. We carry our own copy instead of an npm dependency because:
 *   1) the 2FA secret must never transit a third-party QR image service, and
 *   2) it keeps the install footprint zero (matches the server's zero-dep TOTP).
 *
 * Only byte-mode encoding is included (sufficient for `otpauth://` URIs).
 * `generateQrMatrix(text)` returns a square 2D array of booleans where `true`
 * is a dark module. Throws if `text` does not fit in version 40.
 */

const MIN_VERSION = 1;
const MAX_VERSION = 40;

// Error-correction level M (~15% recovery) is the authenticator-app standard.
const ECC_M = { ordinal: 0, formatBits: 0 };

const ECC_CODEWORDS_PER_BLOCK = [
    // Index by [eccLevel.ordinal][version]; version 0 is an unused padding slot.
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
];

const NUM_ERROR_CORRECTION_BLOCKS = [
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
];

function getNumRawDataModules(ver) {
    let result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
        const numAlign = Math.floor(ver / 7) + 2;
        result -= (25 * numAlign - 10) * numAlign - 55;
        if (ver >= 7) result -= 36;
    }
    return result;
}

function getNumDataCodewords(ver) {
    const ord = ECC_M.ordinal;
    return (
        Math.floor(getNumRawDataModules(ver) / 8) -
        ECC_CODEWORDS_PER_BLOCK[ord][ver] * NUM_ERROR_CORRECTION_BLOCKS[ord][ver]
    );
}

// --- Reed-Solomon (GF(2^8) with the QR-standard generator 0x11D) ---

function reedSolomonComputeDivisor(degree) {
    const result = new Uint8Array(degree);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
        for (let j = 0; j < result.length; j++) {
            result[j] = reedSolomonMultiply(result[j], root);
            if (j + 1 < result.length) result[j] ^= result[j + 1];
        }
        root = reedSolomonMultiply(root, 0x02);
    }
    return result;
}

function reedSolomonComputeRemainder(data, divisor) {
    const result = new Uint8Array(divisor.length);
    for (const b of data) {
        const factor = b ^ result[0];
        result.copyWithin(0, 1);
        result[result.length - 1] = 0;
        for (let i = 0; i < result.length; i++) {
            result[i] ^= reedSolomonMultiply(divisor[i], factor);
        }
    }
    return result;
}

function reedSolomonMultiply(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
}

// --- Bit buffer ---

function appendBits(val, len, bb) {
    for (let i = len - 1; i >= 0; i--) {
        bb.push((val >>> i) & 1);
    }
}

// --- Encoding ---

function makeByteSegment(text) {
    const bytes = new TextEncoder().encode(text);
    const bb = [];
    for (const b of bytes) appendBits(b, 8, bb);
    return { mode: 0x4, numChars: bytes.length, bitData: bb };
}

function getTotalBits(seg, version) {
    // Byte mode: 4 mode bits + char-count bits + data bits.
    let ccBits;
    if (version <= 9) ccBits = 8;
    else ccBits = 16;
    return 4 + ccBits + seg.bitData.length;
}

function addEccAndInterleave(data, version) {
    const ord = ECC_M.ordinal;
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ord][version];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ord][version];
    const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocks = [];
    const rsDiv = reedSolomonComputeDivisor(blockEccLen);
    let k = 0;
    for (let i = 0; i < numBlocks; i++) {
        const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
        const dat = Array.from(data.slice(k, k + datLen));
        k += datLen;
        const ecc = reedSolomonComputeRemainder(dat, rsDiv);
        if (i < numShortBlocks) dat.push(0);
        blocks.push(dat.concat(Array.from(ecc)));
    }

    const result = [];
    for (let i = 0; i < blocks[0].length; i++) {
        for (let j = 0; j < blocks.length; j++) {
            if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
                result.push(blocks[j][i]);
            }
        }
    }
    return result;
}

class QrMatrix {
    constructor(version, mask) {
        this.version = version;
        this.size = version * 4 + 17;
        this.modules = [];
        this.isFunction = [];
        for (let i = 0; i < this.size; i++) {
            this.modules.push(new Array(this.size).fill(false));
            this.isFunction.push(new Array(this.size).fill(false));
        }
        this.mask = mask;
    }

    setFunctionModule(x, y, isDark) {
        this.modules[y][x] = isDark;
        this.isFunction[y][x] = true;
    }

    drawFinderPattern(x, y) {
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                const xx = x + dx;
                const yy = y + dy;
                if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
                    this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
                }
            }
        }
    }

    drawAlignmentPattern(x, y) {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
            }
        }
    }

    getAlignmentPatternPositions() {
        if (this.version === 1) return [];
        const numAlign = Math.floor(this.version / 7) + 2;
        const step = Math.floor((this.version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
        const result = [6];
        for (let pos = this.size - 7; result.length < numAlign; pos -= step) {
            result.splice(1, 0, pos);
        }
        return result;
    }

    drawFunctionPatterns() {
        for (let i = 0; i < this.size; i++) {
            this.setFunctionModule(6, i, i % 2 === 0);
            this.setFunctionModule(i, 6, i % 2 === 0);
        }
        this.drawFinderPattern(3, 3);
        this.drawFinderPattern(this.size - 4, 3);
        this.drawFinderPattern(3, this.size - 4);

        const alignPos = this.getAlignmentPatternPositions();
        const numAlign = alignPos.length;
        for (let i = 0; i < numAlign; i++) {
            for (let j = 0; j < numAlign; j++) {
                if (!((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0))) {
                    this.drawAlignmentPattern(alignPos[i], alignPos[j]);
                }
            }
        }

        this.drawFormatBits(0);
        this.drawVersion();
    }

    drawFormatBits(mask) {
        const data = (ECC_M.formatBits << 3) | mask;
        let rem = data;
        for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        const bits = ((data << 10) | rem) ^ 0x5412;

        for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, ((bits >>> i) & 1) !== 0);
        this.setFunctionModule(8, 7, ((bits >>> 6) & 1) !== 0);
        this.setFunctionModule(8, 8, ((bits >>> 7) & 1) !== 0);
        this.setFunctionModule(7, 8, ((bits >>> 8) & 1) !== 0);
        for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, ((bits >>> i) & 1) !== 0);

        for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
        for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, ((bits >>> i) & 1) !== 0);
        this.setFunctionModule(8, this.size - 8, true);
    }

    drawVersion() {
        if (this.version < 7) return;
        let rem = this.version;
        for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
        const bits = (this.version << 12) | rem;
        for (let i = 0; i < 18; i++) {
            const bit = ((bits >>> i) & 1) !== 0;
            const a = this.size - 11 + (i % 3);
            const b = Math.floor(i / 3);
            this.setFunctionModule(a, b, bit);
            this.setFunctionModule(b, a, bit);
        }
    }

    drawCodewords(data) {
        let i = 0;
        for (let right = this.size - 1; right >= 1; right -= 2) {
            if (right === 6) right = 5;
            for (let vert = 0; vert < this.size; vert++) {
                for (let j = 0; j < 2; j++) {
                    const x = right - j;
                    const upward = ((right + 1) & 2) === 0;
                    const y = upward ? this.size - 1 - vert : vert;
                    if (!this.isFunction[y][x] && i < data.length * 8) {
                        this.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
                        i++;
                    }
                }
            }
        }
    }

    applyMask(mask) {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.isFunction[y][x]) continue;
                let invert;
                switch (mask) {
                    case 0: invert = (x + y) % 2 === 0; break;
                    case 1: invert = y % 2 === 0; break;
                    case 2: invert = x % 3 === 0; break;
                    case 3: invert = (x + y) % 3 === 0; break;
                    case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
                    case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
                    case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
                    case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
                    default: invert = false;
                }
                if (invert) this.modules[y][x] = !this.modules[y][x];
            }
        }
    }

    getPenaltyScore() {
        let result = 0;
        const size = this.size;
        // Adjacent modules in rows/cols with same color.
        for (let y = 0; y < size; y++) {
            let runColor = false;
            let runX = 0;
            for (let x = 0; x < size; x++) {
                if (this.modules[y][x] === runColor) {
                    runX++;
                    if (runX === 5) result += 3;
                    else if (runX > 5) result++;
                } else {
                    runColor = this.modules[y][x];
                    runX = 1;
                }
            }
        }
        for (let x = 0; x < size; x++) {
            let runColor = false;
            let runY = 0;
            for (let y = 0; y < size; y++) {
                if (this.modules[y][x] === runColor) {
                    runY++;
                    if (runY === 5) result += 3;
                    else if (runY > 5) result++;
                } else {
                    runColor = this.modules[y][x];
                    runY = 1;
                }
            }
        }
        // 2x2 blocks of same color.
        for (let y = 0; y < size - 1; y++) {
            for (let x = 0; x < size - 1; x++) {
                const c = this.modules[y][x];
                if (c === this.modules[y][x + 1] && c === this.modules[y + 1][x] && c === this.modules[y + 1][x + 1]) {
                    result += 3;
                }
            }
        }
        // Proportion of dark modules.
        let dark = 0;
        for (const row of this.modules) for (const cell of row) if (cell) dark++;
        const total = size * size;
        const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
        result += k * 10;
        return result;
    }
}

function buildMatrix(dataCodewords, version) {
    const qr = new QrMatrix(version, 0);
    qr.drawFunctionPatterns();
    const allCodewords = addEccAndInterleave(dataCodewords, version);
    qr.drawCodewords(allCodewords);

    // Choose the mask with the lowest penalty.
    let bestMask = 0;
    let minPenalty = Infinity;
    for (let mask = 0; mask < 8; mask++) {
        qr.applyMask(mask);
        qr.drawFormatBits(mask);
        const penalty = qr.getPenaltyScore();
        if (penalty < minPenalty) {
            minPenalty = penalty;
            bestMask = mask;
        }
        qr.applyMask(mask); // Undo (XOR is its own inverse).
    }
    qr.applyMask(bestMask);
    qr.drawFormatBits(bestMask);
    return qr.modules;
}

/**
 * Encode `text` (UTF-8 bytes) as a QR code.
 * @param {string} text
 * @returns {boolean[][]} square matrix; `true` = dark module.
 */
export function generateQrMatrix(text) {
    const seg = makeByteSegment(text);

    // Pick the smallest version that fits at ECC level M.
    let version = MIN_VERSION;
    for (; ; version++) {
        if (version > MAX_VERSION) {
            throw new Error('Data too long for a QR code');
        }
        const capacityBits = getNumDataCodewords(version) * 8;
        if (getTotalBits(seg, version) <= capacityBits) break;
    }

    const ccBits = version <= 9 ? 8 : 16;
    const bb = [];
    appendBits(seg.mode, 4, bb);
    appendBits(seg.numChars, ccBits, bb);
    for (const b of seg.bitData) bb.push(b);

    const dataCapacityBits = getNumDataCodewords(version) * 8;
    appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb); // Terminator.
    appendBits(0, (8 - (bb.length % 8)) % 8, bb); // Byte align.

    // Pad with alternating bytes.
    for (let padByte = 0xec; bb.length < dataCapacityBits; padByte ^= 0xec ^ 0x11) {
        appendBits(padByte, 8, bb);
    }

    const dataCodewords = new Uint8Array(bb.length / 8);
    for (let i = 0; i < bb.length; i++) {
        dataCodewords[i >>> 3] |= bb[i] << (7 - (i & 7));
    }

    return buildMatrix(dataCodewords, version);
}
