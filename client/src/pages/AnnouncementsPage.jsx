import React, { useState } from 'react';
import { Megaphone, Users, Trash2, Send } from 'lucide-react';

// --- Reusable Components (assuming they are in their own files) ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const Button = ({ children, variant = 'primary', Icon, isLoading = false, className = '', ...rest }) => {
    const baseStyles = 'flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantStyles = { primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500', secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400' };
    const disabledStyles = 'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed';
    return (<button className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`} disabled={isLoading} {...rest}>{Icon && <Icon className="w-5 h-5 mr-2 -ml-1" />}{children}</button>);
};

// --- MOCK DATA (to be replaced by API calls) ---
const initialAnnouncements = [
    { id: 3, title: "Summer Tutoring Schedule", audience: "All Users", date: "2025-06-15", message: "Please note that our summer schedule begins next month. Check the appointments page for updated availability." },
    { id: 2, title: "New Resource Added: Algebra Videos", audience: "Students", date: "2025-06-10", message: "A new series of videos covering advanced algebra topics has been added to the Resources page." },
    { id: 1, title: "Welcome to StartRight!", audience: "All Users", date: "2025-06-01", message: "Welcome to the new StartRight Learning Hub! We're excited to have you." },
];

// --- Announcements Page Main Component ---
export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState(initialAnnouncements);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', audience: 'All Users' });
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewAnnouncement(prev => ({ ...prev, [name]: value }));
    };

    const handleSendAnnouncement = (e) => {
        e.preventDefault();
        if (!newAnnouncement.title || !newAnnouncement.message) {
            alert("Please fill out both title and message.");
            return;
        }
        
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            const announcementToSend = {
                id: announcements.length + 1,
                date: new Date().toISOString().split('T')[0],
                ...newAnnouncement
            };
            setAnnouncements([announcementToSend, ...announcements]);
            setNewAnnouncement({ title: '', message: '', audience: 'All Users' });
            setIsLoading(false);
        }, 1000);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            setAnnouncements(announcements.filter(a => a.id !== id));
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
                        <div className="space-y-4">
                            {announcements.map(announcement => (
                                <div key={announcement.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-800">{announcement.title}</p>
                                        <p className="text-sm text-gray-600 mt-1">{announcement.message}</p>
                                        <div className="flex items-center text-xs text-gray-500 mt-2">
                                            <Users className="w-4 h-4 mr-1.5"/>
                                            Sent to <span className="font-semibold mx-1">{announcement.audience}</span> on {announcement.date}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(announcement.id)} className="p-2 text-gray-400 hover:text-red-500 flex-shrink-0">
                                        <Trash2 className="w-5 h-5"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
