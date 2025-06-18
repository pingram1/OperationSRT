import React, { useState, useMemo } from 'react';
import { Edit3, Trash2, PlusCircle, BookOpen, Trophy, FileText, Video, Zap } from 'lucide-react';

// --- Reusable Components (can be moved to common folder) ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const Button = ({ children, variant = 'primary', Icon, isLoading = false, className = '', ...rest }) => {
    const baseStyles = 'flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantStyles = { primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500', secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400', danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' };
    const disabledStyles = 'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed';
    return (<button className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`} disabled={isLoading} {...rest}>{Icon && <Icon className="w-5 h-5 mr-2 -ml-1" />}{children}</button>);
};

// --- MOCK DATA ---
const initialResources = [
    { id: 1, type: 'video', title: 'Mastering the Quadratic Formula', subject: 'Algebra' },
    { id: 2, type: 'article', title: 'The Causes of the Civil War', subject: 'History' },
];
const initialChallenges = [
    { id: 1, title: 'Algebra Power-Up', subject: 'Algebra', difficulty: 'Medium', reward: '50 XP' },
    { id: 2, title: 'Physics Velocity Victor', subject: 'Physics', difficulty: 'Hard', reward: '100 XP' },
];

// --- Main Content Management Page Component ---
export default function ContentManagementPage() {
    const [activeTab, setActiveTab] = useState('resources');
    const [resources, setResources] = useState(initialResources);
    const [challenges, setChallenges] = useState(initialChallenges);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const handleCreateNew = () => {
        setEditingItem({ type: activeTab }); // Pre-set the type based on the active tab
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditingItem({ ...item, type: activeTab });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            if (activeTab === 'resources') {
                setResources(resources.filter(r => r.id !== id));
            } else {
                setChallenges(challenges.filter(c => c.id !== id));
            }
        }
    };
    
    const handleSave = (item) => {
        // Logic to save the item (either new or existing)
        if (activeTab === 'resources') {
            setResources(prev => item.id ? prev.map(r => r.id === item.id ? item : r) : [...prev, { ...item, id: Date.now() }]);
        } else {
            setChallenges(prev => item.id ? prev.map(c => c.id === item.id ? item : c) : [...prev, { ...item, id: Date.now() }]);
        }
        setIsModalOpen(false);
    };

    const columns = {
        resources: [
            { header: 'Title', accessor: 'title' },
            { header: 'Type', accessor: 'type' },
            { header: 'Subject', accessor: 'subject' },
        ],
        challenges: [
            { header: 'Title', accessor: 'title' },
            { header: 'Subject', accessor: 'subject' },
            { header: 'Difficulty', accessor: 'difficulty' },
            { header: 'Reward', accessor: 'reward' },
        ]
    };

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Content Management</h1>
                <p className="text-gray-600">Create, edit, and manage all learning materials and challenges.</p>
            </header>

            <div className="flex border-b mb-6">
                <button onClick={() => setActiveTab('resources')} className={`flex items-center px-4 py-2 text-sm font-semibold ${activeTab === 'resources' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}><BookOpen className="w-5 h-5 mr-2" /> Learning Resources</button>
                <button onClick={() => setActiveTab('challenges')} className={`flex items-center px-4 py-2 text-sm font-semibold ${activeTab === 'challenges' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}><Trophy className="w-5 h-5 mr-2" /> Challenges</button>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
                    <Button Icon={PlusCircle} onClick={handleCreateNew}>Create New</Button>
                </div>
                <ContentTable 
                    data={activeTab === 'resources' ? resources : challenges}
                    columns={columns[activeTab]}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </Card>

            {isModalOpen && (
                <ContentModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSave}
                    item={editingItem}
                    type={activeTab}
                />
            )}
        </div>
    );
}

// --- Sub-components for the Page ---

const ContentTable = ({ data, columns, onEdit, onDelete }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                <tr>
                    {columns.map(col => <th key={col.accessor} className="px-6 py-3">{col.header}</th>)}
                    <th className="px-6 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {data.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                        {columns.map(col => <td key={col.accessor} className="px-6 py-4 capitalize">{item[col.accessor]}</td>)}
                        <td className="px-6 py-4 text-right">
                            <button onClick={() => onEdit(item)} className="p-2 text-gray-500 hover:text-blue-600"><Edit3 className="w-5 h-5" /></button>
                            <button onClick={() => onDelete(item.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ContentModal = ({ isOpen, onClose, onSave, item, type }) => {
    const [formData, setFormData] = useState(item || {});

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4 capitalize">
                    {item?.id ? 'Edit' : 'Create'} {type.slice(0, -1)}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="title" value={formData.title || ''} onChange={handleChange} placeholder="Title" className="w-full p-2 border rounded-md" required />
                    <input type="text" name="subject" value={formData.subject || ''} onChange={handleChange} placeholder="Subject" className="w-full p-2 border rounded-md" required />

                    {type === 'resources' && (
                        <select name="type" value={formData.type || 'article'} onChange={handleChange} className="w-full p-2 border rounded-md bg-white">
                            <option value="article">Article</option><option value="video">Video</option><option value="guide">Guide</option>
                        </select>
                    )}
                    {type === 'challenges' && (
                        <>
                            <select name="difficulty" value={formData.difficulty || 'Medium'} onChange={handleChange} className="w-full p-2 border rounded-md bg-white">
                                <option>Easy</option><option>Medium</option><option>Hard</option>
                            </select>
                            <input type="text" name="reward" value={formData.reward || ''} onChange={handleChange} placeholder="Reward (e.g., 50 XP)" className="w-full p-2 border rounded-md" required />
                        </>
                    )}
                    <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Description..." className="w-full p-2 border rounded-md h-24"></textarea>
                    
                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
