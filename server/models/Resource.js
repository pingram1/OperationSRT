const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Mongoose Schema for Learning Resources.
 * Resources can be videos, articles, guides, PDFs, etc.
 */
const ResourceSchema = new Schema({
    /**
     * The title of the resource
     */
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        trim: true,
    },
    
    /**
     * The subject/category of the resource
     */
    subject: {
        type: String,
        required: [true, 'Please provide a subject'],
        trim: true,
    },
    
    /**
     * The type of resource (video, article, guide, pdf, document)
     */
    type: {
        type: String,
        enum: ['video', 'article', 'guide', 'pdf', 'document'],
        required: true,
    },
    
    /**
     * The description of the resource
     */
    description: {
        type: String,
        required: [true, 'Please provide a description'],
        trim: true,
    },
    
    /**
     * The content/body of the resource (for articles, guides)
     * For PDFs, this can contain the HTML content that was used to generate the PDF
     */
    content: {
        type: String,
        default: '',
    },
    
    /**
     * URL or path to the resource (video URL, PDF path, etc.)
     */
    url: {
        type: String,
        default: '',
    },
    
    /**
     * Duration or reading time (e.g., "15:30 min", "12 min read")
     */
    duration: {
        type: String,
        default: '',
    },
    
    /**
     * For guides, a quick reference type
     */
    guideType: {
        type: String,
        default: '',
    },
    
    /**
     * PDF file path (if the resource is a PDF - generated or uploaded)
     */
    pdfPath: {
        type: String,
        default: '',
    },
    
    /**
     * Uploaded document file path (PDF, DOCX, Pages, etc.)
     * Stored in uploads/documents/
     */
    documentPath: {
        type: String,
        default: '',
    },
    
    /**
     * Whether the resource is active/visible
     */
    isActive: {
        type: Boolean,
        default: true,
    },
    
    /**
     * The user who created this resource (admin)
     */
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});

// Create and export the Resource model
module.exports = mongoose.model('Resource', ResourceSchema);

