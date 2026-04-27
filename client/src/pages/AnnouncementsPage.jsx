import React, { useState, useEffect } from 'react';
import { Megaphone, Users, Trash2, Send } from 'lucide-react';
import { createAnnouncement, getAllAnnouncements, deleteAnnouncement } from '../api/announcements';
import { useToast } from '../components/common/Toast.jsx';
import { useConfirm } from '../components/common/ConfirmDialog.jsx';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';

// Helper function to convert UI audience format to API format
const audienceToApiFormat = (audience) => {
    const mapping = {
        'All Users': 'all',
        'Students': 'students',
        'Parents': 'parents',
        'Tutors': 'tutors',
        'Admin': 'admin'
    };
    return mapping[audience] || 'all';
};

// Helper function to convert API audience format to UI format
const audienceToUIFormat = (audience) => {
    const mapping = {
        'all': 'All Users',
        'students': 'Students',
        'parents': 'Parents',
        'tutors': 'Tutors',
        'admin': 'Admin'
    };
    return mapping[audience] || 'All Users';
};

// Helper function to format date
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
};

// --- Announcements Page Main Component ---
export default function AnnouncementsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [announcements, setAnnouncements] = useState([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', audience: 'All Users' });
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
    const [error, setError] = useState(null);

    // Fetch announcements on component mount
    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setIsLoadingAnnouncements(true);
            setError(null);
            const data = await getAllAnnouncements();
            setAnnouncements(data);
        } catch (err) {
            console.error('Failed to fetch announcements:', err);
            setError(err.message || 'Failed to load announcements');
        } finally {
            setIsLoadingAnnouncements(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewAnnouncement(prev => ({ ...prev, [name]: value }));
    };

    const handleSendAnnouncement = async (e) => {
        e.preventDefault();
        if (!newAnnouncement.title || !newAnnouncement.message) {
            toast.warning('Please fill out both title and message.');
            return;
        }
        
        try {
            setIsLoading(true);
            setError(null);
            
            // Convert audience format for API
            const apiAudience = audienceToApiFormat(newAnnouncement.audience);
            
            const response = await createAnnouncement({
                title: newAnnouncement.title,
                message: newAnnouncement.message,
                audience: apiAudience
            });
            
            // Refresh announcements list
            await fetchAnnouncements();
            
            // Reset form
            setNewAnnouncement({ title: '', message: '', audience: 'All Users' });
            
            // Show success message
            toast.success(`Announcement sent successfully to ${response.usersNotified} users!`);
        } catch (err) {
            console.error('Failed to create announcement:', err);
            setError(err.message || 'Failed to send announcement');
            toast.error(err.message || 'Failed to send announcement');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Delete announcement?',
            message: 'Are you sure you want to delete this announcement?',
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!ok) {
            return;
        }
        
        try {
            setError(null);
            await deleteAnnouncement(id);
            await fetchAnnouncements();
        } catch (err) {
            console.error('Failed to delete announcement:', err);
            setError(err.message || 'Failed to delete announcement');
            toast.error(err.message || 'Failed to delete announcement');
        }
    };

    return (
        <div>
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Create Announcement</h1>
                <p className="text-gray-600">Send messages to all users or target specific groups.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Composer Card */}
                <div className="lg:col-span-1">
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">New Message</h2>
                        <form onSubmit={handleSendAnnouncement} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input type="text" name="title" value={newAnnouncement.title} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md" placeholder="e.g., Holiday Schedule" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Message</label>
                                <textarea name="message" value={newAnnouncement.message} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md h-32" placeholder="Write your announcement..."></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                                <select name="audience" value={newAnnouncement.audience} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-white">
                                    <option>All Users</option>
                                    <option>Parents</option>
                                    <option>Tutors</option>
                                    <option>Students</option>
                                </select>
                            </div>
                            <Button type="submit" isLoading={isLoading} className="w-full" Icon={Send}>
                                {isLoading ? 'Sending...' : 'Send Announcement'}
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Recent Announcements List */}
                <div className="lg:col-span-2">
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Sent Announcements</h2>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}
                        {isLoadingAnnouncements ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Loading announcements...</span>
                            </div>
                        ) : announcements.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No announcements yet. Create your first announcement!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {announcements.map(announcement => (
                                    <div key={announcement._id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800">{announcement.title}</p>
                                            <p className="text-sm text-gray-600 mt-1">{announcement.message}</p>
                                            <div className="flex items-center text-xs text-gray-500 mt-2">
                                                <Users className="w-4 h-4 mr-1.5"/>
                                                Sent to <span className="font-semibold mx-1">{audienceToUIFormat(announcement.audience)}</span> on {formatDate(announcement.createdAt)}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(announcement._id)} 
                                            className="p-2 text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors"
                                            title="Delete announcement"
                                        >
                                            <Trash2 className="w-5 h-5"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
