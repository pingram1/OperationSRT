import React, { useState, useMemo } from 'react';
import { BookCopy, Video, FileText, Search, ChevronRight } from 'lucide-react';

// --- MOCK DATA (to be replaced by API calls) ---
const resourcesData = [
    { id: 1, type: 'video', title: 'Mastering the Quadratic Formula', subject: 'Algebra', duration: '15:30 min', description: 'A deep dive into how and when to use the quadratic formula to solve complex equations.' },
    { id: 2, type: 'article', title: 'The Causes of the Civil War', subject: 'History', duration: '12 min read', description: 'An in-depth article exploring the primary social, economic, and political factors.' },
    { id: 3, type: 'guide', title: 'Lab Safety Procedures', subject: 'Chemistry', duration: 'Quick Guide', description: 'A printable guide covering essential safety protocols for all lab experiments.' },
    { id: 4, type: 'video', title: 'Shakespearean Sonnets Explained', subject: 'English', duration: '18:00 min', description: 'Learn the structure, rhythm, and themes of Shakespeare\'s most famous sonnets.' },
    { id: 5, type: 'article', title: 'Introduction to Photosynthesis', subject: 'Biology', duration: '10 min read', description: 'Understand the fundamental process of how plants create energy from sunlight.' },
    { id: 6, type: 'guide', title: 'MLA Citation Guide', subject: 'English', duration: 'Quick Guide', description: 'A quick reference for properly citing sources in MLA format for your essays.' },
];

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 transition-all hover:shadow-lg hover:scale-[1.02] ${className}`}>{children}</div>);

// --- Resources Page Main Component ---
export default function ResourcesPage() {
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredResources = useMemo(() => {
        return resourcesData.filter(r => {
            const matchesTab = activeTab === 'all' || r.type === activeTab;
            const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.subject.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [activeTab, searchTerm]);

    const ResourceCard = ({ resource }) => {
        const typeDetails = {
            video: { icon: Video, color: 'text-red-500' },
            article: { icon: FileText, color: 'text-blue-500' },
            guide: { icon: BookCopy, color: 'text-green-500' },
        };
        const DetailsIcon = typeDetails[resource.type].icon;

        return (
            <Card className="flex flex-col">
                <div className="flex-grow">
                    <DetailsIcon className={`w-8 h-8 mb-3 ${typeDetails[resource.type].color}`} />
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{resource.title}</h3>
                    <p className="text-sm font-semibold text-gray-500 mb-3">{resource.subject}</p>
                    <p className="text-gray-600 text-sm mb-4">{resource.description}</p>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-sm font-semibold text-gray-500">{resource.duration}</span>
                    <button className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
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
                </div>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.length > 0 ? (
                    filteredResources.map(resource => <ResourceCard key={resource.id} resource={resource} />)
                ) : (
                    <div className="col-span-full text-center py-16 text-gray-500">
                        <p className="font-semibold">No resources found.</p>
                        <p>Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
