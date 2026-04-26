const express = require('express');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/AuthMiddleware');
const logger = require('../utils/logger');

const UPLOADS_ROOT = path.resolve(path.join(__dirname, '..', 'uploads'));
const PDF_ROOT = path.join(UPLOADS_ROOT, 'pdfs');

/**
 * Resolves `relativePath` inside `baseDir` and returns null if the resolved
 * absolute path escapes the base directory (path traversal protection).
 */
const safeResolveInside = (baseDir, relativePath) => {
    const absBase = path.resolve(baseDir);
    const target = path.resolve(absBase, relativePath);
    if (target !== absBase && !target.startsWith(absBase + path.sep)) {
        return null;
    }
    return target;
};

/**
 * Streams a file from disk if and only if the resolved path lives inside
 * `baseDir`. Responds with 400 on traversal, 404 when missing.
 */
const streamSecureFile = (req, res, baseDir, relativePath) => {
    if (!relativePath || relativePath.length === 0 || relativePath === '/') {
        return res.status(400).json({ message: 'Invalid file path' });
    }

    const resolved = safeResolveInside(baseDir, relativePath);
    if (!resolved) {
        logger.warn('Blocked file access: path traversal attempt', {
            userId: req.user?.id || null,
            requestedPath: relativePath,
        });
        return res.status(400).json({ message: 'Invalid file path' });
    }

    fs.stat(resolved, (err, stats) => {
        if (err || !stats || !stats.isFile()) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.setHeader('Cache-Control', 'private, no-store, max-age=0');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.sendFile(resolved);
    });
};

const methodGuard = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return res.status(405).json({ message: 'Method not allowed' });
    }
    next();
};

const pdfResourceRouter = express.Router();
pdfResourceRouter.use(methodGuard, authMiddleware, (req, res) => {
    const relative = decodeURIComponent(req.path.replace(/^\/+/, ''));
    return streamSecureFile(req, res, PDF_ROOT, relative);
});

const uploadsRouter = express.Router();
uploadsRouter.use(methodGuard, authMiddleware, (req, res) => {
    const relative = decodeURIComponent(req.path.replace(/^\/+/, ''));
    return streamSecureFile(req, res, UPLOADS_ROOT, relative);
});

module.exports = {
    pdfResourceRouter,
    uploadsRouter,
};
