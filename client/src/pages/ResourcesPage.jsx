import React, { useState, useMemo, useEffect } from 'react';
import { BookCopy, Video, FileText, Search, ChevronRight, File } from 'lucide-react';
import { getAllResources } from '../api/resources';
import { getSecureToken } from '../api/authStorage';
import { useToast } from '../components/common/Toast.jsx';
import SharedCard from '../components/common/Card.jsx';

// --- Reusable Components ---
// Resource cards lift on hover to advertise interactivity.
const Card = ({ children, className = '', ...rest }) => (
    <SharedCard hover="lift" className={className} {...rest}>{children}</SharedCard>
);

// --- Resources Page Main Component ---
export default function ResourcesPage() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [resources, setResources] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchResources();
    }, [activeTab]);

    const fetchResources = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const filters = activeTab !== 'all' ? { type: activeTab } : {};
            const data = await getAllResources(filters);
            setResources(data || []);
        } catch (err) {
            console.error('Failed to fetch resources:', err);
            setError(err.message || 'Failed to load resources');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredResources = useMemo(() => {
        if (!resources || resources.length === 0) return [];
        return resources.filter(r => {
            const matchesSearch = 
                (r.title && r.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (r.subject && r.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesSearch;
        });
    }, [resources, searchTerm]);

    const ResourceCard = ({ resource }) => {
        const typeDetails = {
            video: { icon: Video, color: 'text-red-500' },
            article: { icon: FileText, color: 'text-blue-500' },
            guide: { icon: BookCopy, color: 'text-green-500' },
            pdf: { icon: File, color: 'text-purple-500' },
            document: { icon: File, color: 'text-indigo-500' },
        };
        const DetailsIcon = typeDetails[resource.type]?.icon || FileText;
        const iconColor = typeDetails[resource.type]?.color || 'text-gray-500';

        const handleOpenResource = async () => {
            if ((resource.type === 'pdf' || resource.type === 'document') && (resource.pdfPath || resource.documentPath) && resource._id) {
                // Open PDF in new tab using the authenticated endpoint
                try {
                    const token = getSecureToken();
                    if (!token) {
                        toast.info('Please log in to view this PDF.');
                        return;
                    }
                    
                    // Use the same proxy pattern as other API calls
                    const docUrl = resource.documentPath
                        ? `/api/resources/${resource._id}/document`
                        : `/api/resources/${resource._id}/pdf`;
                    
                    // Add authorization header by fetching and opening blob
                    const response = await fetch(docUrl, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.click();
                        // Clean up the object URL after a short delay
                        setTimeout(() => window.URL.revokeObjectURL(url), 100);
                    } else {
                        const errorData = await response.json().catch(() => ({ message: 'Failed to load PDF' }));
                        throw new Error(errorData.message || 'Failed to load PDF');
                    }
                } catch (error) {
                    console.error('Error opening PDF:', error);
                    toast.error(`Failed to open PDF: ${error.message || 'Please try again.'}`);
                }
            } else if (resource.url) {
                // Open URL
                window.open(resource.url, '_blank');
            } else if (resource.content) {
                // Show content in modal or new page
                // For now, just alert - can be enhanced later
                toast.info('Resource content view coming soon!');
            }
        };

        return (
            <Card className="flex flex-col">
                <div className="flex-grow">
                    <DetailsIcon className={`w-8 h-8 mb-3 ${iconColor}`} />
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{resource.title}</h3>
                    <p className="text-sm font-semibold text-gray-500 mb-3">{resource.subject}</p>
                    <p className="text-gray-600 text-sm mb-4">{resource.description}</p>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-sm font-semibold text-gray-500">
                        {resource.duration || resource.guideType || 'Resource'}
                    </span>
                    <button 
                        onClick={handleOpenResource}
                        className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                    >
                        Open <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </Card>
        );
    };

    return (
        <div>
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Learning Resources</h1>
                <p className="text-gray-600">Explore videos, articles, and guides to supplement your learning.</p>
            </header>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search resources..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button onClick={() => setActiveTab('all')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${activeTab === 'all' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>All</button>
                    <button onClick={() => setActiveTab('video')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${activeTab === 'video' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Videos</button>
                    <button onClick={() => setActiveTab('article')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${activeTab === 'article' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Articles</button>
                    <button onClick={() => setActiveTab('guide')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${activeTab === 'guide' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Guides</button>
                    <button onClick={() => setActiveTab('pdf')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${activeTab === 'pdf' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>PDFs</button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Resources Grid */}
            {isLoading ? (
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading resources...</p>
                </div>
            ) : filteredResources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResources.map(resource => (
                        <ResourceCard key={resource._id || resource.id} resource={resource} />
                    ))}
                </div>
            ) : (
                <div className="col-span-full text-center py-16 text-gray-500">
                    <p className="font-semibold">No resources found.</p>
                    <p>Try adjusting your search or filters.</p>
                </div>
            )}
        </div>
    );
}

