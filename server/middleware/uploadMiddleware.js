const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Allowed file types
const ALLOWED_FILE_TYPES = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
};

// Document types for resource uploads (PDF, DOCX, etc.)
const ALLOWED_DOCUMENT_TYPES = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'application/vnd.oasis.opendocument.text': ['.odt'],
    'application/vnd.apple.pages': ['.pages'],
    'application/x-iwork-pages-sffpages': ['.pages'],
    'application/zip': ['.pages'], // .pages is sometimes detected as zip
};

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Configure storage
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'pdfs');
        
        // Create directory if it doesn't exist
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Sanitize filename to prevent path traversal
        const sanitizedFilename = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/\.\./g, '_')
            .substring(0, 255); // Limit filename length
        
        // Add timestamp to prevent overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${sanitizedFilename}`);
    },
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Check file type
    if (ALLOWED_FILE_TYPES[file.mimetype]) {
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ALLOWED_FILE_TYPES[file.mimetype];
        
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file extension. Allowed: ${allowedExts.join(', ')}`), false);
        }
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter: fileFilter,
});

// Middleware to handle upload errors
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Too many files' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};

// Badge image upload configuration (images only)
const badgeStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'badges');
        
        // Create directory if it doesn't exist
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Sanitize filename to prevent path traversal
        const sanitizedFilename = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/\.\./g, '_')
            .substring(0, 255);
        
        // Add timestamp to prevent overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${sanitizedFilename}`);
    },
});

// Badge file filter (images only)
const badgeFileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (allowedImageTypes.includes(file.mimetype)) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file extension. Allowed: ${allowedExts.join(', ')}`), false);
        }
    } else {
        cb(new Error(`Invalid file type. Only images are allowed (${allowedImageTypes.join(', ')})`), false);
    }
};

// Badge upload middleware
const uploadBadge = multer({
    storage: badgeStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB for images
    },
    fileFilter: badgeFileFilter,
});

// Document upload for resources (PDF, DOCX, Pages, etc.)
const documentStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'documents');
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const sanitizedFilename = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/\.\./g, '_')
            .substring(0, 255);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${sanitizedFilename}`);
    },
});

const documentFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.docx', '.doc', '.odt', '.pages'];
    if (allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file extension. Allowed: ${allowedExts.join(', ')}`), false);
    }
};

const uploadDocument = multer({
    storage: documentStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB for documents
    fileFilter: documentFileFilter,
});

module.exports = {
    upload,
    uploadBadge,
    uploadDocument,
    handleUploadError,
    MAX_FILE_SIZE,
    ALLOWED_FILE_TYPES,
    ALLOWED_DOCUMENT_TYPES,
};


