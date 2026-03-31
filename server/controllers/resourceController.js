const Resource = require('../models/Resource');
const fs = require('fs').promises;
const path = require('path');
const { generateMLACitationGuidePDF } = require('../utils/pdfGenerator');

/**
 * @desc    Create a new resource
 * @route   POST /api/resources
 * @access  Private (Admin only)
 */
const createResource = async (req, res) => {
    try {
        const { title, subject, type, description, content, url, duration, guideType } = req.body;
        const createdBy = req.user.id;

        // Validate required fields
        if (!title || !subject || !type || !description) {
            return res.status(400).json({ message: 'Title, subject, type, and description are required' });
        }

        // Validate type
        const validTypes = ['video', 'article', 'guide', 'pdf', 'document'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid resource type. Must be one of: video, article, guide, pdf, document' });
        }

        // Create resource
        const resource = new Resource({
            title,
            subject,
            type,
            description,
            content: content || '',
            url: url || '',
            duration: duration || '',
            guideType: guideType || '',
            createdBy,
            isActive: true,
        });

        const savedResource = await resource.save();
        await savedResource.populate('createdBy', 'name email');

        console.log(`[createResource] Resource created: ${savedResource._id}`);
        res.status(201).json(savedResource);
    } catch (error) {
        console.error('[createResource] Error:', error);
        res.status(500).json({ message: 'Server error while creating resource', error: error.message });
    }
};

/**
 * @desc    Get all resources
 * @route   GET /api/resources
 * @access  Private
 */
const getAllResources = async (req, res) => {
    try {
        const { type, subject } = req.query;
        
        const query = { isActive: true };
        if (type) query.type = type;
        if (subject) query.subject = subject;

        const resources = await Resource.find(query)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(resources);
    } catch (error) {
        console.error('[getAllResources] Error:', error);
        res.status(500).json({ message: 'Server error while fetching resources', error: error.message });
    }
};

/**
 * @desc    Get all resources (Admin view - includes inactive)
 * @route   GET /api/resources/admin
 * @access  Private (Admin only)
 */
const getAllResourcesAdmin = async (req, res) => {
    try {
        const resources = await Resource.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(resources);
    } catch (error) {
        console.error('[getAllResourcesAdmin] Error:', error);
        res.status(500).json({ message: 'Server error while fetching resources', error: error.message });
    }
};

/**
 * @desc    Get a single resource by ID
 * @route   GET /api/resources/:id
 * @access  Private
 */
const getResourceById = async (req, res) => {
    try {
        const { id } = req.params;

        const resource = await Resource.findById(id)
            .populate('createdBy', 'name email');

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        res.json(resource);
    } catch (error) {
        console.error('[getResourceById] Error:', error);
        res.status(500).json({ message: 'Server error while fetching resource', error: error.message });
    }
};

/**
 * @desc    Update a resource
 * @route   PUT /api/resources/:id
 * @access  Private (Admin only)
 */
const updateResource = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, subject, type, description, content, url, duration, guideType, isActive } = req.body;

        const resource = await Resource.findById(id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update fields if provided
        if (title) resource.title = title;
        if (subject) resource.subject = subject;
        if (type) {
            const validTypes = ['video', 'article', 'guide', 'pdf'];
            if (validTypes.includes(type)) {
                resource.type = type;
            }
        }
        if (description) resource.description = description;
        if (content !== undefined) resource.content = content;
        if (url !== undefined) resource.url = url;
        if (duration !== undefined) resource.duration = duration;
        if (guideType !== undefined) resource.guideType = guideType;
        if (typeof isActive === 'boolean') resource.isActive = isActive;

        const updatedResource = await resource.save();
        await updatedResource.populate('createdBy', 'name email');

        console.log(`[updateResource] Resource updated: ${id}`);
        res.json(updatedResource);
    } catch (error) {
        console.error('[updateResource] Error:', error);
        res.status(500).json({ message: 'Server error while updating resource', error: error.message });
    }
};

/**
 * @desc    Delete a resource
 * @route   DELETE /api/resources/:id
 * @access  Private (Admin only)
 */
const deleteResource = async (req, res) => {
    try {
        const { id } = req.params;

        const resource = await Resource.findById(id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // If resource has a PDF, delete the PDF file
        if (resource.pdfPath) {
            try {
                const pdfFullPath = path.join(__dirname, '..', 'uploads', 'pdfs', resource.pdfPath);
                await fs.unlink(pdfFullPath);
            } catch (error) {
                console.error(`[deleteResource] Error deleting PDF file: ${error.message}`);
            }
        }
        // If resource has an uploaded document, delete it
        if (resource.documentPath) {
            try {
                const docFullPath = path.join(__dirname, '..', 'uploads', 'documents', resource.documentPath);
                await fs.unlink(docFullPath);
            } catch (error) {
                console.error(`[deleteResource] Error deleting document file: ${error.message}`);
            }
        }

        await Resource.findByIdAndDelete(id);

        console.log(`[deleteResource] Resource deleted: ${id}`);
        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        console.error('[deleteResource] Error:', error);
        res.status(500).json({ message: 'Server error while deleting resource', error: error.message });
    }
};

/**
 * @desc    Get PDF file for a resource
 * @route   GET /api/resources/:id/pdf
 * @access  Private
 */
const getResourcePDF = async (req, res) => {
    try {
        const { id } = req.params;

        const resource = await Resource.findById(id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        if (!resource.pdfPath) {
            return res.status(404).json({ message: 'PDF not available for this resource' });
        }

        const pdfPath = path.join(__dirname, '..', 'uploads', 'pdfs', resource.pdfPath);

        // Check if file exists
        try {
            await fs.access(pdfPath);
        } catch {
            return res.status(404).json({ message: 'PDF file not found' });
        }

        // Read and send PDF file
        const pdfBuffer = await fs.readFile(pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${resource.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('[getResourcePDF] Error:', error);
        res.status(500).json({ message: 'Server error while fetching PDF', error: error.message });
    }
};

/**
 * @desc    Generate MLA Citation Guide PDF and create resource
 * @route   POST /api/resources/generate-mla-pdf
 * @access  Private (Admin only)
 */
const generateMLAPDFResource = async (req, res) => {
    try {
        const createdBy = req.user.id;
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'pdfs');
        
        // Ensure uploads directory exists
        await fs.mkdir(uploadsDir, { recursive: true });

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `mla-citation-guide-${timestamp}.pdf`;
        const pdfPath = path.join(uploadsDir, filename);

        // Try to find logo
        const logoPath = path.join(__dirname, '..', '..', 'client', 'public', 'logo.jpg');
        let actualLogoPath = null;
        try {
            await fs.access(logoPath);
            actualLogoPath = logoPath;
        } catch {
            // Logo not found, continue without it
            console.log('[generateMLAPDFResource] Logo not found, generating PDF without logo');
        }

        // Generate PDF
        await generateMLACitationGuidePDF(pdfPath, actualLogoPath);

        // Create resource record
        const resource = new Resource({
            title: 'MLA Citation Guide',
            subject: 'English',
            type: 'pdf',
            description: 'A quick reference for properly citing sources in MLA 9th Edition format for your essays.',
            content: 'MLA 9th Edition Citation Guide - Complete reference for Works Cited pages and in-text citations.',
            url: '',
            duration: 'Quick Guide',
            guideType: 'Quick Guide',
            pdfPath: filename,
            createdBy,
            isActive: true,
        });

        const savedResource = await resource.save();
        await savedResource.populate('createdBy', 'name email');

        console.log(`[generateMLAPDFResource] MLA PDF resource created: ${savedResource._id}`);
        res.status(201).json({
            resource: savedResource,
            message: 'MLA Citation Guide PDF generated successfully',
        });
    } catch (error) {
        console.error('[generateMLAPDFResource] Error:', error);
        res.status(500).json({ message: 'Server error while generating MLA PDF', error: error.message });
    }
};

/**
 * @desc    Create a resource with uploaded document (PDF, DOCX, Pages, etc.)
 * @route   POST /api/resources/upload
 * @access  Private (Admin only)
 */
const createResourceWithDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Document file is required' });
        }

        const { title, subject, description, duration } = req.body;
        const createdBy = req.user.id;

        if (!title || !subject || !description) {
            return res.status(400).json({ message: 'Title, subject, and description are required' });
        }

        const resource = new Resource({
            title,
            subject,
            type: 'document',
            description,
            content: '',
            url: '',
            duration: duration || '',
            guideType: '',
            documentPath: req.file.filename,
            createdBy,
            isActive: true,
        });

        const savedResource = await resource.save();
        await savedResource.populate('createdBy', 'name email');

        console.log(`[createResourceWithDocument] Document resource created: ${savedResource._id}`);
        res.status(201).json(savedResource);
    } catch (error) {
        console.error('[createResourceWithDocument] Error:', error);
        res.status(500).json({ message: 'Server error while creating resource', error: error.message });
    }
};

/**
 * @desc    Get uploaded document file for a resource
 * @route   GET /api/resources/:id/document
 * @access  Private
 */
const getResourceDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const resource = await Resource.findById(id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        let fullPath;
        let filePath;
        if (resource.documentPath) {
            fullPath = path.join(__dirname, '..', 'uploads', 'documents', resource.documentPath);
            filePath = resource.documentPath;
        } else if (resource.pdfPath) {
            fullPath = path.join(__dirname, '..', 'uploads', 'pdfs', resource.pdfPath);
            filePath = resource.pdfPath;
        } else {
            return res.status(404).json({ message: 'Document not available for this resource' });
        }

        try {
            await fs.access(fullPath);
        } catch {
            return res.status(404).json({ message: 'Document file not found' });
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.odt': 'application/vnd.oasis.opendocument.text',
            '.pages': 'application/vnd.apple.pages',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const disposition = ext === '.pdf' ? 'inline' : 'attachment';

        const buffer = await fs.readFile(fullPath);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${(resource.title || 'document').replace(/[^a-z0-9]/gi, '_')}${ext}"`);
        res.send(buffer);
    } catch (error) {
        console.error('[getResourceDocument] Error:', error);
        res.status(500).json({ message: 'Server error while fetching document', error: error.message });
    }
};

module.exports = {
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
};

