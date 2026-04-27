const fs = require('fs');
const os = require('os');
const path = require('path');

const { detectKind, verifyMagicBytes, expectKindForExt } = require('../../utils/fileMagic');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srt-magic-'));

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeTmp(name, bytes) {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, Buffer.from(bytes));
    return p;
}

describe('fileMagic.detectKind', () => {
    it('detects PDF by %PDF- signature', () => {
        const head = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
        expect(detectKind(head)).toBe('pdf');
    });

    it('detects ZIP-based docx/odt/pages by PK\\x03\\x04', () => {
        expect(detectKind(Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]))).toBe('zip');
    });

    it('detects legacy DOC by CFBF header', () => {
        expect(detectKind(Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]))).toBe('cfbf');
    });

    it('detects JPEG, PNG, GIF, WEBP', () => {
        expect(detectKind(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]))).toBe('jpeg');
        expect(detectKind(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))).toBe('png');
        expect(detectKind(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe('gif');
        expect(detectKind(Buffer.from([
            0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
            0x57, 0x45, 0x42, 0x50,
        ]))).toBe('webp');
    });

    it('returns "unknown" for arbitrary content (e.g. PE binary, plain text)', () => {
        expect(detectKind(Buffer.from('MZ\x90\x00\x03'))).toBe('unknown'); // PE/EXE
        expect(detectKind(Buffer.from('hello world'))).toBe('unknown');
    });
});

describe('fileMagic.verifyMagicBytes (security boundary)', () => {
    it('rejects a .pdf-named file whose content is actually a script', async () => {
        const p = writeTmp('forged.pdf', Buffer.from('#!/bin/sh\nrm -rf /\n'));
        await expect(verifyMagicBytes(p, expectKindForExt('.pdf'))).rejects.toMatchObject({
            statusCode: 400,
            code: 'MAGIC_BYTE_MISMATCH',
        });
    });

    it('accepts a real PDF', async () => {
        const p = writeTmp('real.pdf', Buffer.from('%PDF-1.4\nrest of file...'));
        await expect(verifyMagicBytes(p, expectKindForExt('.pdf'))).resolves.toBe('pdf');
    });

    it('rejects a .png whose content is actually a PDF', async () => {
        const p = writeTmp('liar.png', Buffer.from('%PDF-1.4\nrest of file...'));
        await expect(verifyMagicBytes(p, expectKindForExt('.png'))).rejects.toMatchObject({
            code: 'MAGIC_BYTE_MISMATCH',
        });
    });

    it('accepts ZIP-based formats for docx/odt/pages', async () => {
        const p = writeTmp('doc.docx', Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14]));
        await expect(verifyMagicBytes(p, expectKindForExt('.docx'))).resolves.toBe('zip');
    });
});
