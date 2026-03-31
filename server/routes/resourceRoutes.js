const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
const { uploadDocument, handleUploadError } = require('../middleware/uploadMiddleware');
const {
    createResource,
    createResourceWithDocument,
    getAllResources,
    getAllResourcesAdmin,
    getResourceById,
    updateResource,
    deleteResource,
    getResourcePDF,
    getResourceDocument,
    generateMLAPDFResource,
} = require('../controllers/resourceController');

/**
 * @route   GET /api/resources
 * @desc    Get all active resources
 * @access  Private
 */
router.get('/', authMiddleware, getAllResources);

/**
 * @route   GET /api/resources/admin
 * @desc    Get all resources (Admin view - includes inactive)
 * @access  Private (Admin only)
 */
router.get('/admin', authMiddleware, authorize('admin'), getAllResourcesAdmin);

/**
 * @route   GET /api/resources/:id/pdf
 * @desc    Get PDF file for a resource
 * @access  Private
 */
router.get('/:id/pdf', authMiddleware, getResourcePDF);

/**
 * @route   GET /api/resources/:id/document
 * @desc    Get uploaded document file (PDF, DOCX, Pages, etc.)
 * @access  Private
 */
router.get('/:id/document', authMiddleware, getResourceDocument);

/**
 * @route   GET /api/resources/:id
 * @desc    Get a single resource by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, getResourceById);

/**
 * @route   POST /api/resources/generate-mla-pdf
 * @desc    Generate MLA Citation Guide PDF and create resource
 * @access  Private (Admin only)
 */
router.post('/generate-mla-pdf', authMiddleware, authorize('admin'), generateMLAPDFResource);

/**
 * @route   POST /api/resources/upload
 * @desc    Create a resource with uploaded document (PDF, DOCX, Pages, etc.)
 * @access  Private (Admin only)
 */
router.post('/upload', authMiddleware, authorize('admin'), uploadDocument.single('document'), handleUploadError, createResourceWithDocument);

/**
 * @route   POST /api/resources
 * @desc    Create a new resource
 * @access  Private (Admin only)
 */
router.post('/', authMiddleware, authorize('admin'), createResource);

/**
 * @route   PUT /api/resources/:id
 * @desc    Update a resource
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, authorize('admin'), updateResource);

/**
 * @route   DELETE /api/resources/:id
 * @desc    Delete a resource
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, authorize('admin'), deleteResource);

module.exports = router;

