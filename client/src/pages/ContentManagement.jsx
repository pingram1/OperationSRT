import React, { useState, useEffect } from 'react';
import { Edit3, Trash2, PlusCircle, BookOpen, Trophy, AlertCircle, Plus, Minus, FileText, File } from 'lucide-react';
import { getAllChallenges, createChallenge, updateChallenge, deleteChallenge } from '../api/challenges';
import { getAllResourcesAdmin, createResource, createResourceWithDocument, updateResource, deleteResource, generateMLAPDF } from '../api/resources';
import { getSubjects } from '../api/systemConfig';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast.jsx';
import { useConfirm } from '../components/common/ConfirmDialog.jsx';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Dialog from '../components/common/Dialog.jsx';

// --- Main Content Management Page Component ---
export default function ContentManagementPage() {
    const { user } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState('resources');
    const [challenges, setChallenges] = useState([]);
    const [resources, setResources] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState(null);
    const [editingResource, setEditingResource] = useState(null);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch subjects from system config
    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const data = await getSubjects();
            setSubjects(data.subjects || []);
        } catch (error) {
            console.error('Failed to fetch subjects:', error);
            setSubjects([]);
        }
    };

    // Fetch data on mount and when tab changes
    useEffect(() => {
        if (activeTab === 'challenges') {
            fetchChallenges();
        } else if (activeTab === 'resources') {
            fetchResources();
        }
    }, [activeTab]);

    const fetchChallenges = async () => {
        try {
            setIsLoading(true);
            setError('');
            // Fetch all challenges (including inactive ones for admin)
            const data = await getAllChallenges({ includeInactive: 'true' });
            setChallenges(data || []);
        } catch (err) {
            console.error('Failed to fetch challenges:', err);
            setError('Failed to load challenges. Please refresh the page.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateNew = () => {
        setEditingChallenge({
            title: '',
            description: '',
            subject: subjects.length > 0 ? subjects[0] : '',
            difficulty: 'Easy',
            challengeType: 'speed-run',
            xpReward: 25,
            timeLimit: null,
            questions: [],
            passingScore: 70,
            gradeLevels: [],
            isActive: true,
            estimatedDuration: 10,
        });
        setIsModalOpen(true);
        setError('');
    };

    const handleEdit = (challenge) => {
        setEditingChallenge({ ...challenge });
        setIsModalOpen(true);
        setError('');
    };

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Delete challenge?',
            message: 'Are you sure you want to delete this challenge? This action cannot be undone.',
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!ok) {
            return;
        }

        try {
            await deleteChallenge(id);
            setChallenges(challenges.filter(c => c._id !== id));
        } catch (err) {
            console.error('Failed to delete challenge:', err);
            toast.error('Failed to delete challenge. Please try again.');
        }
    };

    const fetchResources = async () => {
        try {
            setIsLoading(true);
            setError('');
            const data = await getAllResourcesAdmin();
            setResources(data || []);
        } catch (err) {
            console.error('Failed to fetch resources:', err);
            setError('Failed to load resources. Please refresh the page.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateResource = () => {
        setEditingResource({
            title: '',
            subject: subjects.length > 0 ? subjects[0] : '',
            type: 'article',
            description: '',
            content: '',
            url: '',
            duration: '',
            guideType: '',
            isActive: true,
        });
        setIsResourceModalOpen(true);
        setError('');
    };

    const handleEditResource = (resource) => {
        setEditingResource({ ...resource });
        setIsResourceModalOpen(true);
        setError('');
    };

    const handleDeleteResource = async (id) => {
        const ok = await confirm({
            title: 'Delete resource?',
            message: 'Are you sure you want to delete this resource? This action cannot be undone.',
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!ok) {
            return;
        }

        try {
            await deleteResource(id);
            setResources(resources.filter(r => r._id !== id));
        } catch (err) {
            console.error('Failed to delete resource:', err);
            toast.error('Failed to delete resource. Please try again.');
        }
    };

    const handleGenerateMLAPDF = async () => {
        try {
            setIsSaving(true);
            setError('');
            const response = await generateMLAPDF();
            await fetchResources();
            // Show success message
            toast.success('MLA Citation Guide PDF generated successfully!');
        } catch (err) {
            console.error('Failed to generate MLA PDF:', err);
            const errorMessage = err.message || 'Failed to generate MLA PDF. Please try again.';
            setError(errorMessage);
            // Don't close modal on error, let user see the error
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveResource = async (resourceData, documentFile = null) => {
        try {
            setIsSaving(true);
            setError('');

            if (resourceData.type === 'document' && !editingResource._id && !documentFile) {
                setError('Please select a document file to upload.');
                setIsSaving(false);
                return;
            }

            if (editingResource._id) {
                // Update existing resource (document upload on edit not yet supported)
                const updated = await updateResource(editingResource._id, resourceData);
                setResources(resources.map(r => r._id === updated._id ? updated : r));
            } else if (resourceData.type === 'document' && documentFile) {
                // Create resource with uploaded document
                const formData = new FormData();
                formData.append('document', documentFile);
                formData.append('title', resourceData.title);
                formData.append('subject', resourceData.subject);
                formData.append('description', resourceData.description);
                if (resourceData.duration) formData.append('duration', resourceData.duration);
                const created = await createResourceWithDocument(formData);
                setResources([...resources, created]);
            } else {
                // Create new resource (video, article, guide, pdf)
                const created = await createResource(resourceData);
                setResources([...resources, created]);
            }

            setIsResourceModalOpen(false);
            setEditingResource(null);
        } catch (err) {
            console.error('Failed to save resource:', err);
            setError(err.message || 'Failed to save resource. Please check all required fields.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (challengeData) => {
        try {
            setIsSaving(true);
            setError('');

            if (editingChallenge._id) {
                // Update existing challenge
                const updated = await updateChallenge(editingChallenge._id, challengeData);
                setChallenges(challenges.map(c => c._id === updated._id ? updated : c));
            } else {
                // Create new challenge
                const created = await createChallenge(challengeData);
                setChallenges([...challenges, created]);
            }

            setIsModalOpen(false);
            setEditingChallenge(null);
        } catch (err) {
            console.error('Failed to save challenge:', err);
            setError(err.message || 'Failed to save challenge. Please check all required fields.');
        } finally {
            setIsSaving(false);
        }
    };

    // Check if user is admin or super_admin
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-600">Only administrators can access content management.</p>
            </div>
        );
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Content Management</h1>
                <p className="text-gray-600">Create, edit, and manage all learning materials and challenges.</p>
            </header>

            <div className="flex border-b mb-6">
                <button
                    onClick={() => setActiveTab('resources')}
                    className={`flex items-center px-4 py-2 text-sm font-semibold ${
                        activeTab === 'resources'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500'
                    }`}
                >
                    <BookOpen className="w-5 h-5 mr-2" /> Learning Resources
                </button>
                <button
                    onClick={() => setActiveTab('challenges')}
                    className={`flex items-center px-4 py-2 text-sm font-semibold ${
                        activeTab === 'challenges'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500'
                    }`}
                >
                    <Trophy className="w-5 h-5 mr-2" /> Challenges
                </button>
            </div>

            {activeTab === 'challenges' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Challenges</h2>
                        <Button Icon={PlusCircle} onClick={handleCreateNew}>
                            Create New
                        </Button>
                    </div>

                    {error && !isModalOpen && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading challenges...</p>
                        </div>
                    ) : (
                        <ChallengesTable
                            challenges={challenges}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    )}
                </Card>
            )}

            {activeTab === 'resources' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Learning Resources</h2>
                        <Button Icon={PlusCircle} onClick={handleCreateResource}>
                            Create New
                        </Button>
                    </div>

                    {error && !isResourceModalOpen && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading resources...</p>
                        </div>
                    ) : (
                        <ResourcesTable
                            resources={resources}
                            onEdit={handleEditResource}
                            onDelete={handleDeleteResource}
                        />
                    )}
                </Card>
            )}

            {isModalOpen && (
                <ChallengeModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingChallenge(null);
                        setError('');
                    }}
                    onSave={handleSave}
                    challenge={editingChallenge}
                    error={error}
                    isSaving={isSaving}
                    subjects={subjects}
                />
            )}

            {isResourceModalOpen && (
                <ResourceModal
                    isOpen={isResourceModalOpen}
                    onClose={() => {
                        setIsResourceModalOpen(false);
                        setEditingResource(null);
                        setError('');
                    }}
                    onSave={handleSaveResource}
                    onGenerateMLA={handleGenerateMLAPDF}
                    resource={editingResource}
                    error={error}
                    isSaving={isSaving}
                    subjects={subjects}
                />
            )}
        </div>
    );
}

// --- Resources Table Component ---
const ResourcesTable = ({ resources, onEdit, onDelete }) => {
    if (resources.length === 0) {
        return (
            <div className="text-center py-16 text-gray-500">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="font-semibold">No resources yet.</p>
                <p>Click "Create New" to add your first resource!</p>
            </div>
        );
    }

    const getTypeIcon = (type) => {
        switch (type) {
            case 'video':
                return '🎥';
            case 'article':
                return '📄';
            case 'guide':
                return '📖';
            case 'pdf':
                return '📑';
            case 'document':
                return '📎';
            default:
                return '📌';
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                    <tr>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Subject</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {resources.map((resource) => (
                        <tr key={resource._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <span className="text-2xl">{getTypeIcon(resource.type)}</span>
                            </td>
                            <td className="px-6 py-4 font-medium">{resource.title}</td>
                            <td className="px-6 py-4">{resource.subject}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                                {resource.description}
                            </td>
                            <td className="px-6 py-4">
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        resource.isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    {resource.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => onEdit(resource)}
                                    className="p-2 text-gray-500 hover:text-blue-600 mr-2"
                                    title="Edit"
                                >
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => onDelete(resource._id)}
                                    className="p-2 text-gray-500 hover:text-red-600"
                                    title="Delete"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- Resource Modal Component ---
const ResourceModal = ({ isOpen, onClose, onSave, resource, error, isSaving, onGenerateMLA, subjects = [] }) => {
    const [formData, setFormData] = useState(resource || {});
    const [showTemplateOptions, setShowTemplateOptions] = useState(false);
    const [documentFile, setDocumentFile] = useState(null);

    useEffect(() => {
        setFormData(resource || {});
        setDocumentFile(null);
        setShowTemplateOptions(!resource?._id);
    }, [resource]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleUseMLATemplate = () => {
        setFormData({
            title: 'MLA Citation Guide',
            subject: 'English',
            type: 'pdf',
            description: 'A quick reference for properly citing sources in MLA 9th Edition format for your essays.',
            content: 'MLA 9th Edition Citation Guide - Complete reference for Works Cited pages and in-text citations.',
            url: '',
            duration: 'Quick Guide',
            guideType: 'Quick Guide',
            isActive: true,
        });
        setShowTemplateOptions(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Check if this is an MLA PDF generation request (new resource with MLA title and PDF type)
        if (formData.type === 'pdf' && 
            formData.title === 'MLA Citation Guide' && 
            !resource?._id && 
            onGenerateMLA) {
            // Use the MLA PDF generation endpoint
            try {
                await onGenerateMLA();
                onClose();
                return;
            } catch (error) {
                // Error is handled by parent component
                return;
            }
        }
        
        // Regular resource creation/update
        if (!formData.title || !formData.subject || !formData.type || !formData.description) {
            return;
        }
        if (formData.type === 'document' && !resource?._id && !documentFile) {
            return; // Validation: show message in UI
        }
        onSave(formData, documentFile);
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={resource?._id ? 'Edit Resource' : 'Create New Resource'}
        >
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Template Options for New Resources */}
                    {showTemplateOptions && !resource?._id && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="text-sm font-semibold text-blue-900 mb-2">Quick Templates</h3>
                            <p className="text-xs text-blue-700 mb-3">Start with a pre-filled template or create from scratch:</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleUseMLATemplate}
                                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                                >
                                    <FileText className="w-4 h-4 mr-1" />
                                    MLA Citation Guide PDF
                                </button>
                            </div>
                            <p className="text-xs text-blue-600 mt-2 italic">
                                Note: Using the MLA template will automatically generate the PDF when you click "Create Resource"
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subject <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="subject"
                                value={formData.subject || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-white"
                                required
                            >
                                <option value="">Select a subject</option>
                                {subjects.map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="type"
                                value={formData.type || ''}
                                onChange={(e) => {
                                    handleChange(e);
                                    setDocumentFile(null);
                                }}
                                className="w-full p-2 border rounded-md bg-white"
                                required
                            >
                                <option value="video">Video</option>
                                <option value="article">Article</option>
                                <option value="guide">Guide</option>
                                <option value="pdf">PDF</option>
                                <option value="document">Document (Upload)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Duration / Type
                            </label>
                            <input
                                type="text"
                                name="duration"
                                value={formData.duration || ''}
                                onChange={handleChange}
                                placeholder="e.g., 15:30 min, 12 min read, Quick Guide"
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            rows="3"
                            className="w-full p-2 border rounded-md"
                            required
                        />
                    </div>

                    {(formData.type === 'video' || formData.type === 'article' || formData.type === 'guide') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                URL (for videos, external links)
                            </label>
                            <input
                                type="url"
                                name="url"
                                value={formData.url || ''}
                                onChange={handleChange}
                                placeholder="https://... (e.g. YouTube, Google Docs, etc.)"
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                    )}

                    {formData.type === 'document' && !resource?._id && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Upload Document <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="file"
                                accept=".pdf,.docx,.doc,.odt,.pages"
                                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                                className="w-full p-2 border rounded-md"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Supported: PDF, DOCX, DOC, ODT, Pages (max 25MB)
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Content (for articles, guides)
                        </label>
                        <textarea
                            name="content"
                            value={formData.content || ''}
                            onChange={handleChange}
                            rows="6"
                            className="w-full p-2 border rounded-md"
                            placeholder="Enter content here..."
                        />
                    </div>

                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive !== false}
                                onChange={handleChange}
                                className="mr-2"
                            />
                            <span className="text-sm font-medium text-gray-700">Active (visible to students)</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSaving}>
                            {resource?._id ? 'Update Resource' : 'Create Resource'}
                        </Button>
                    </div>
                </form>
        </Dialog>
    );
};

// --- Challenges Table Component ---
const ChallengesTable = ({ challenges, onEdit, onDelete }) => {
    if (challenges.length === 0) {
        return (
            <div className="text-center py-16 text-gray-500">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="font-semibold">No challenges yet.</p>
                <p>Create your first challenge to get started!</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                    <tr>
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Subject</th>
                        <th className="px-6 py-3">Difficulty</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">XP Reward</th>
                        <th className="px-6 py-3">Questions</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {challenges.map((challenge) => (
                        <tr key={challenge._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{challenge.title}</td>
                            <td className="px-6 py-4">{challenge.subject}</td>
                            <td className="px-6 py-4">
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        challenge.difficulty === 'Easy'
                                            ? 'bg-green-100 text-green-700'
                                            : challenge.difficulty === 'Medium'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                    }`}
                                >
                                    {challenge.difficulty}
                                </span>
                            </td>
                            <td className="px-6 py-4 capitalize">{challenge.challengeType || 'N/A'}</td>
                            <td className="px-6 py-4">{challenge.xpReward} XP</td>
                            <td className="px-6 py-4">{challenge.questions?.length || 0}</td>
                            <td className="px-6 py-4">
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        challenge.isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    {challenge.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => onEdit(challenge)}
                                    className="p-2 text-gray-500 hover:text-blue-600 mr-2"
                                    title="Edit"
                                >
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => onDelete(challenge._id)}
                                    className="p-2 text-gray-500 hover:text-red-600"
                                    title="Delete"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const QUESTION_TYPE_OPTIONS = [
    { value: 'multiple_choice', label: 'Multiple choice' },
    { value: 'true_false', label: 'True / False' },
    { value: 'fill_in_the_blank', label: 'Fill in the blank' },
    { value: 'matching', label: 'Matching' },
    { value: 'error_detection', label: 'Error detection (click wrong word)' },
];

function applyQuestionTypeDefaults(q, newType) {
    const next = { ...q, questionType: newType };
    if (newType === 'multiple_choice') {
        if (!next.options || next.options.filter((o) => o && o.trim()).length < 2) {
            next.options = ['', '', '', ''];
        }
        if (typeof next.correctAnswer === 'boolean') {
            next.correctAnswer = '';
        }
    } else if (newType === 'true_false') {
        next.options = [];
        if (typeof next.correctAnswer !== 'boolean') {
            next.correctAnswer = true;
        }
    } else if (newType === 'fill_in_the_blank') {
        next.options = [];
        if (!next.fillTemplate?.trim()) {
            next.fillTemplate = next.question?.trim()
                ? `${next.question.trim()} {{blank}}`
                : '{{blank}}';
        }
        if (next.caseSensitive === undefined) {
            next.caseSensitive = false;
        }
    } else if (newType === 'matching') {
        next.options = [];
        if (!next.matchingPairs || next.matchingPairs.length < 2) {
            next.matchingPairs = [
                { left: '', right: '' },
                { left: '', right: '' },
            ];
        }
    } else if (newType === 'error_detection') {
        next.options = [];
        if (!next.errorSentence?.trim() && next.question?.trim()) {
            next.errorSentence = next.question.trim();
        }
        if (next.errorWordIndex === undefined || next.errorWordIndex === null || Number.isNaN(next.errorWordIndex)) {
            next.errorWordIndex = 0;
        }
    }
    return next;
}

function cleanQuestionForSave(q) {
    const qt = q.questionType || 'multiple_choice';
    const common = {
        question: (q.question || '').trim(),
        questionType: qt,
        explanation: q.explanation?.trim() || undefined,
        points: parseInt(q.points, 10) || 1,
    };

    if (qt === 'multiple_choice') {
        return {
            ...common,
            options: (q.options || []).filter((opt) => opt && opt.trim() !== ''),
            correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer.trim() : String(q.correctAnswer ?? ''),
        };
    }
    if (qt === 'true_false') {
        return {
            ...common,
            options: [],
            correctAnswer: q.correctAnswer === true || q.correctAnswer === 'true',
        };
    }
    if (qt === 'fill_in_the_blank') {
        return {
            ...common,
            options: [],
            fillTemplate: (q.fillTemplate || '').trim(),
            caseSensitive: !!q.caseSensitive,
            correctAnswer: String(q.correctAnswer ?? '').trim(),
        };
    }
    if (qt === 'matching') {
        return {
            ...common,
            options: [],
            matchingPairs: (q.matchingPairs || [])
                .filter((p) => p.left?.trim() && p.right?.trim())
                .map((p) => ({ left: p.left.trim(), right: p.right.trim() })),
        };
    }
    if (qt === 'error_detection') {
        return {
            ...common,
            options: [],
            errorSentence: (q.errorSentence || '').trim(),
            errorWordIndex: Math.max(0, parseInt(q.errorWordIndex, 10) || 0),
        };
    }
    return { ...common, options: [], correctAnswer: q.correctAnswer };
}

// --- Challenge Modal Component ---
const ChallengeModal = ({ isOpen, onClose, onSave, challenge, error, isSaving, subjects = [] }) => {
    const [formData, setFormData] = useState(challenge || {});
    const [questionErrors, setQuestionErrors] = useState({});

    useEffect(() => {
        setFormData(challenge || {});
        setQuestionErrors({});
    }, [challenge]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value === '' ? null : parseInt(value, 10),
        });
    };

    const handleQuestionChange = (index, field, value) => {
        const questions = [...(formData.questions || [])];
        questions[index] = { ...questions[index], [field]: value };
        setFormData({ ...formData, questions });
        // Clear error for this question
        if (questionErrors[index]) {
            const newErrors = { ...questionErrors };
            delete newErrors[index];
            setQuestionErrors(newErrors);
        }
    };

    const handleAddQuestion = () => {
        const questions = [...(formData.questions || [])];
        questions.push({
            question: '',
            questionType: 'multiple_choice',
            options: ['', '', '', ''],
            correctAnswer: '',
            explanation: '',
            points: 1,
        });
        setFormData({ ...formData, questions });
    };

    const handleRemoveQuestion = (index) => {
        const questions = [...(formData.questions || [])];
        questions.splice(index, 1);
        setFormData({ ...formData, questions });
    };

    const handleOptionChange = (questionIndex, optionIndex, value) => {
        const questions = [...(formData.questions || [])];
        if (!questions[questionIndex].options) {
            questions[questionIndex].options = [];
        }
        questions[questionIndex].options[optionIndex] = value;
        setFormData({ ...formData, questions });
    };

    const handleAddOption = (questionIndex) => {
        const questions = [...(formData.questions || [])];
        if (!questions[questionIndex].options) {
            questions[questionIndex].options = [];
        }
        questions[questionIndex].options.push('');
        setFormData({ ...formData, questions });
    };

    const handleRemoveOption = (questionIndex, optionIndex) => {
        const questions = [...(formData.questions || [])];
        if (!questions[questionIndex].options) return;
        questions[questionIndex].options.splice(optionIndex, 1);
        setFormData({ ...formData, questions });
    };

    const handleMatchingPairChange = (questionIndex, pairIndex, field, value) => {
        const questions = [...(formData.questions || [])];
        const pairs = [...(questions[questionIndex].matchingPairs || [])];
        pairs[pairIndex] = { ...pairs[pairIndex], [field]: value };
        questions[questionIndex] = { ...questions[questionIndex], matchingPairs: pairs };
        setFormData({ ...formData, questions });
    };

    const handleAddMatchingPair = (questionIndex) => {
        const questions = [...(formData.questions || [])];
        const pairs = [...(questions[questionIndex].matchingPairs || [])];
        pairs.push({ left: '', right: '' });
        questions[questionIndex] = { ...questions[questionIndex], matchingPairs: pairs };
        setFormData({ ...formData, questions });
    };

    const handleRemoveMatchingPair = (questionIndex, pairIndex) => {
        const questions = [...(formData.questions || [])];
        const pairs = [...(questions[questionIndex].matchingPairs || [])];
        pairs.splice(pairIndex, 1);
        questions[questionIndex] = { ...questions[questionIndex], matchingPairs: pairs };
        setFormData({ ...formData, questions });
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.title?.trim()) errors.title = 'Title is required';
        if (!formData.description?.trim()) errors.description = 'Description is required';
        if (!formData.subject) errors.subject = 'Subject is required';
        if (!formData.difficulty) errors.difficulty = 'Difficulty is required';
        if (!formData.challengeType) errors.challengeType = 'Challenge type is required';
        if (!formData.xpReward || formData.xpReward < 1) errors.xpReward = 'XP reward must be at least 1';
        if (!formData.questions || formData.questions.length === 0) {
            errors.questions = 'At least one question is required';
        } else {
            formData.questions.forEach((q, index) => {
                if (!q.question?.trim()) {
                    errors[`question_${index}`] = 'Question text is required';
                }
                const qt = q.questionType || 'multiple_choice';
                if (qt === 'multiple_choice') {
                    const filled = (q.options || []).filter((o) => o && o.trim());
                    if (filled.length < 2) {
                        errors[`options_${index}`] = 'At least 2 options are required';
                    }
                    if (!q.correctAnswer || !String(q.correctAnswer).trim()) {
                        errors[`answer_${index}`] = 'Correct answer is required';
                    } else if (
                        filled.length > 0 &&
                        !filled.some((o) => o.trim() === String(q.correctAnswer).trim())
                    ) {
                        errors[`answer_${index}`] = 'Correct answer must match one of the options';
                    }
                } else if (qt === 'true_false') {
                    if (q.correctAnswer !== true && q.correctAnswer !== false) {
                        errors[`answer_${index}`] = 'Select whether the statement is true or false';
                    }
                } else if (qt === 'fill_in_the_blank') {
                    const tmpl = (q.fillTemplate || '').trim();
                    if (!tmpl.includes('{{blank}}')) {
                        errors[`fill_${index}`] = 'Template must include {{blank}}';
                    }
                    if (!q.correctAnswer || !String(q.correctAnswer).trim()) {
                        errors[`answer_${index}`] = 'Correct answer is required';
                    }
                } else if (qt === 'matching') {
                    const pairs = q.matchingPairs || [];
                    const valid = pairs.filter((p) => p.left?.trim() && p.right?.trim());
                    if (valid.length < 2) {
                        errors[`match_${index}`] = 'Add at least two complete left/right pairs';
                    }
                } else if (qt === 'error_detection') {
                    const sent = (q.errorSentence || '').trim();
                    if (!sent) {
                        errors[`errsent_${index}`] = 'Sentence is required';
                    } else {
                        const words = sent.split(/\s+/).filter(Boolean);
                        const wi = parseInt(q.errorWordIndex, 10);
                        if (Number.isNaN(wi) || wi < 0 || wi >= words.length) {
                            errors[`erridx_${index}`] = 'Error word index must be within the sentence';
                        }
                    }
                }
            });
        }

        if (Object.keys(errors).length > 0) {
            setQuestionErrors(errors);
            return false;
        }
        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        const cleanedData = {
            ...formData,
            questions: formData.questions.map((q) => cleanQuestionForSave(q)),
            xpReward: parseInt(formData.xpReward, 10),
            passingScore: parseInt(formData.passingScore || 70, 10),
            timeLimit: formData.timeLimit ? parseInt(formData.timeLimit, 10) : null,
            estimatedDuration: parseInt(formData.estimatedDuration || 10, 10),
        };

        onSave(cleanedData);
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            title={challenge?._id ? 'Edit Challenge' : 'Create New Challenge'}
        >
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md"
                                required
                            />
                            {questionErrors.title && (
                                <p className="text-red-500 text-xs mt-1">{questionErrors.title}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subject <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="subject"
                                value={formData.subject || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-white"
                                required
                            >
                                <option value="">Select a subject</option>
                                {subjects.map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Difficulty <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="difficulty"
                                value={formData.difficulty || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-white"
                                required
                            >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Challenge Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="challengeType"
                                value={formData.challengeType || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-white"
                                required
                            >
                                <option value="speed-run">Speed Run</option>
                                <option value="accuracy">Accuracy Gauntlet</option>
                                <option value="identification">Identification Drill</option>
                                <option value="matching">Matching/Sorting</option>
                                <option value="troubleshooting">Troubleshooter</option>
                                <option value="analysis">Analysis</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                XP Reward <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="xpReward"
                                value={formData.xpReward || 25}
                                onChange={handleNumberChange}
                                min="1"
                                className="w-full p-2 border rounded-md"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Passing Score (%)
                            </label>
                            <input
                                type="number"
                                name="passingScore"
                                value={formData.passingScore || 70}
                                onChange={handleNumberChange}
                                min="0"
                                max="100"
                                className="w-full p-2 border rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Time Limit (seconds, optional)
                            </label>
                            <input
                                type="number"
                                name="timeLimit"
                                value={formData.timeLimit || ''}
                                onChange={handleNumberChange}
                                min="1"
                                className="w-full p-2 border rounded-md"
                                placeholder="Leave empty for no time limit"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estimated Duration (minutes)
                            </label>
                            <input
                                type="number"
                                name="estimatedDuration"
                                value={formData.estimatedDuration || 10}
                                onChange={handleNumberChange}
                                min="1"
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            rows="3"
                            className="w-full p-2 border rounded-md"
                            required
                        />
                    </div>

                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive !== false}
                                onChange={handleChange}
                                className="mr-2"
                            />
                            <span className="text-sm font-medium text-gray-700">Active (visible to students)</span>
                        </label>
                    </div>

                    {/* Questions Section */}
                    <div className="border-t pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Questions</h3>
                            <Button
                                type="button"
                                variant="secondary"
                                Icon={Plus}
                                onClick={handleAddQuestion}
                            >
                                Add Question
                            </Button>
                        </div>

                        {questionErrors.questions && (
                            <p className="text-red-500 text-sm mb-2">{questionErrors.questions}</p>
                        )}

                        {(formData.questions || []).map((question, qIndex) => {
                            const qType = question.questionType || 'multiple_choice';
                            const errWords = (question.errorSentence || '')
                                .trim()
                                .split(/\s+/)
                                .filter(Boolean);
                            return (
                            <div key={qIndex} className="mb-6 p-4 border rounded-lg bg-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold">Question {qIndex + 1}</h4>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveQuestion(qIndex)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Question type
                                        </label>
                                        <select
                                            value={qType}
                                            onChange={(e) => {
                                                const questions = [...(formData.questions || [])];
                                                questions[qIndex] = applyQuestionTypeDefaults(
                                                    questions[qIndex],
                                                    e.target.value
                                                );
                                                setFormData({ ...formData, questions });
                                            }}
                                            className="w-full p-2 border rounded-md bg-white"
                                        >
                                            {QUESTION_TYPE_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Question Text <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={question.question || ''}
                                            onChange={(e) =>
                                                handleQuestionChange(qIndex, 'question', e.target.value)
                                            }
                                            rows="2"
                                            className="w-full p-2 border rounded-md"
                                            required
                                        />
                                        {questionErrors[`question_${qIndex}`] && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {questionErrors[`question_${qIndex}`]}
                                            </p>
                                        )}
                                    </div>

                                    {qType === 'multiple_choice' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Options
                                        </label>
                                        {(question.options || []).map((option, oIndex) => (
                                            <div key={oIndex} className="flex items-center mb-2">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) =>
                                                        handleOptionChange(qIndex, oIndex, e.target.value)
                                                    }
                                                    className="flex-1 p-2 border rounded-md mr-2"
                                                    placeholder={`Option ${oIndex + 1}`}
                                                />
                                                {(question.options || []).length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveOption(qIndex, oIndex)}
                                                        className="text-red-500 hover:text-red-700 p-2"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => handleAddOption(qIndex)}
                                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center mt-2"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Option
                                        </button>
                                        {questionErrors[`options_${qIndex}`] && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {questionErrors[`options_${qIndex}`]}
                                            </p>
                                        )}
                                    </div>
                                    )}

                                    {qType === 'multiple_choice' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Correct Answer <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={question.correctAnswer || ''}
                                            onChange={(e) =>
                                                handleQuestionChange(qIndex, 'correctAnswer', e.target.value)
                                            }
                                            className="w-full p-2 border rounded-md"
                                        />
                                        {questionErrors[`answer_${qIndex}`] && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {questionErrors[`answer_${qIndex}`]}
                                            </p>
                                        )}
                                    </div>
                                    )}

                                    {qType === 'true_false' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Correct answer <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={question.correctAnswer === false ? 'false' : 'true'}
                                            onChange={(e) =>
                                                handleQuestionChange(
                                                    qIndex,
                                                    'correctAnswer',
                                                    e.target.value === 'true'
                                                )
                                            }
                                            className="w-full p-2 border rounded-md bg-white"
                                        >
                                            <option value="true">True</option>
                                            <option value="false">False</option>
                                        </select>
                                        {questionErrors[`answer_${qIndex}`] && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {questionErrors[`answer_${qIndex}`]}
                                            </p>
                                        )}
                                    </div>
                                    )}

                                    {qType === 'fill_in_the_blank' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Template <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={question.fillTemplate || ''}
                                                onChange={(e) =>
                                                    handleQuestionChange(qIndex, 'fillTemplate', e.target.value)
                                                }
                                                rows="2"
                                                className="w-full p-2 border rounded-md"
                                                placeholder="e.g. The capital of France is {{blank}}."
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Use exactly <code className="bg-gray-200 px-1 rounded">{'{{blank}}'}</code> for the blank.
                                            </p>
                                            {questionErrors[`fill_${qIndex}`] && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {questionErrors[`fill_${qIndex}`]}
                                                </p>
                                            )}
                                        </div>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={!!question.caseSensitive}
                                                onChange={(e) =>
                                                    handleQuestionChange(qIndex, 'caseSensitive', e.target.checked)
                                                }
                                            />
                                            Case-sensitive grading
                                        </label>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Correct answer <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={question.correctAnswer || ''}
                                                onChange={(e) =>
                                                    handleQuestionChange(qIndex, 'correctAnswer', e.target.value)
                                                }
                                                className="w-full p-2 border rounded-md"
                                            />
                                            {questionErrors[`answer_${qIndex}`] && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {questionErrors[`answer_${qIndex}`]}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                    )}

                                    {qType === 'matching' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Pairs (left ↔ right) <span className="text-red-500">*</span>
                                        </label>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Order defines the correct key: first row is pair 1, second is pair 2, etc.
                                        </p>
                                        {(question.matchingPairs || []).map((pair, pIndex) => (
                                            <div key={pIndex} className="flex flex-wrap gap-2 mb-2 items-center">
                                                <input
                                                    type="text"
                                                    value={pair.left || ''}
                                                    onChange={(e) =>
                                                        handleMatchingPairChange(qIndex, pIndex, 'left', e.target.value)
                                                    }
                                                    className="flex-1 min-w-[120px] p-2 border rounded-md"
                                                    placeholder="Left"
                                                />
                                                <span className="text-gray-400">↔</span>
                                                <input
                                                    type="text"
                                                    value={pair.right || ''}
                                                    onChange={(e) =>
                                                        handleMatchingPairChange(qIndex, pIndex, 'right', e.target.value)
                                                    }
                                                    className="flex-1 min-w-[120px] p-2 border rounded-md"
                                                    placeholder="Right"
                                                />
                                                {(question.matchingPairs || []).length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMatchingPair(qIndex, pIndex)}
                                                        className="text-red-500 p-2"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => handleAddMatchingPair(qIndex)}
                                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center mt-2"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add pair
                                        </button>
                                        {questionErrors[`match_${qIndex}`] && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {questionErrors[`match_${qIndex}`]}
                                            </p>
                                        )}
                                    </div>
                                    )}

                                    {qType === 'error_detection' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Sentence <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={question.errorSentence || ''}
                                                onChange={(e) =>
                                                    handleQuestionChange(qIndex, 'errorSentence', e.target.value)
                                                }
                                                rows="2"
                                                className="w-full p-2 border rounded-md"
                                                placeholder="Sentence containing one wrong word"
                                            />
                                            {questionErrors[`errsent_${qIndex}`] && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {questionErrors[`errsent_${qIndex}`]}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Index of incorrect word (0 = first word){' '}
                                                <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={question.errorWordIndex ?? 0}
                                                onChange={(e) =>
                                                    handleQuestionChange(
                                                        qIndex,
                                                        'errorWordIndex',
                                                        parseInt(e.target.value, 10) || 0
                                                    )
                                                }
                                                className="w-full p-2 border rounded-md"
                                            />
                                            {errWords.length > 0 && (
                                                <p className="text-xs text-gray-600 mt-2">
                                                    Words:{' '}
                                                    {errWords.map((w, i) => (
                                                        <span
                                                            key={`${i}-${w}`}
                                                            className={
                                                                i === (parseInt(question.errorWordIndex, 10) || 0)
                                                                    ? 'font-bold text-blue-700'
                                                                    : ''
                                                            }
                                                        >
                                                            [{i}] {w}{' '}
                                                        </span>
                                                    ))}
                                                </p>
                                            )}
                                            {questionErrors[`erridx_${qIndex}`] && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {questionErrors[`erridx_${qIndex}`]}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Explanation (optional)
                                        </label>
                                        <textarea
                                            value={question.explanation || ''}
                                            onChange={(e) =>
                                                handleQuestionChange(qIndex, 'explanation', e.target.value)
                                            }
                                            rows="2"
                                            className="w-full p-2 border rounded-md"
                                            placeholder="Explanation shown after answering"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Points
                                        </label>
                                        <input
                                            type="number"
                                            value={question.points || 1}
                                            onChange={(e) =>
                                                handleQuestionChange(
                                                    qIndex,
                                                    'points',
                                                    parseInt(e.target.value, 10) || 1
                                                )
                                            }
                                            min="1"
                                            className="w-full p-2 border rounded-md"
                                        />
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSaving}>
                            {challenge?._id ? 'Update Challenge' : 'Create Challenge'}
                        </Button>
                    </div>
                </form>
        </Dialog>
    );
};
