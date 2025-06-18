import React, { useState, useEffect } from 'react';
import { User, BellRing, Shield, CreditCard, Save, AlertTriangle, CheckCircle, AlertCircle as AlertIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx'; // Correct path to your AuthContext
import { updateUserProfile } from '../api/users.js'; // Assuming this is your API utility

// Reusable Components
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const CardHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="border-b pb-4 mb-6">
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <div>
                <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
                <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
        </div>
    </div>
);
const Toggle = ({ label, enabled, onToggle }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
        <span className="text-gray-700">{label}</span>
        <button onClick={onToggle} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

export default function SettingsPage() {
    // Get the current user from the AuthContext
    const { user, login } = useAuth(); // Assuming login updates the context's user

    // Initialize state with the user's data from the context
    const [profile, setProfile] = useState({
        name: user?.name || '',
        email: user?.email || '',
    });
    const [notifications, setNotifications] = useState(user?.notifications || { email: true, sms: false, push: true });
    const [membership, setMembership] = useState(user?.membership || 'Cum Laude');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // This effect updates the form if the user context changes
    useEffect(() => {
        if (user) {
            setProfile({ name: user.name, email: user.email });
            setNotifications(user.notifications || { email: true, sms: false, push: true });
            setMembership(user.membership || 'Cum Laude');
        }
    }, [user]);

    const handleProfileChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
    const handleNotificationToggle = (key) => setNotifications({ ...notifications, [key]: !notifications[key] });

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            const updatedUser = await updateUserProfile(profile);
            // Update the global user state with the new information
            login({ ...user, ...updatedUser }); 
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err.message || 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Account Settings</h1>
                <p className="text-gray-600">Manage your profile, subscription, and preferences.</p>
            </header>

            {/* Main Content */}
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Left Column --- */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Settings */}
                    <Card>
                        <CardHeader icon={User} title="Profile Information" subtitle="Update your personal details." />
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="flex items-center space-x-6">
                                <img src={user?.avatar || 'https://placehold.co/80x80/E2E8F0/4A5568?text=U'} alt="User Avatar" className="w-20 h-20 rounded-full" />
                                <button type="button" className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300">Change Picture</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input type="text" name="name" value={profile.name} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 rounded-md"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input type="email" name="email" value={profile.email} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 rounded-md"/>
                                </div>
                            </div>
                            {error && <div className="flex items-center text-sm text-red-600"><AlertIcon className="w-4 h-4 mr-2" />{error}</div>}
                            {success && <div className="flex items-center text-sm text-green-600"><CheckCircle className="w-4 h-4 mr-2" />{success}</div>}
                            <div className="flex justify-end">
                                <button type="submit" disabled={isLoading} className="flex items-center bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300"><Save className="w-4 h-4 mr-2"/>{isLoading ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        </form>
                    </Card>

                    {/* Notification Settings */}
                     <Card>
                        <CardHeader icon={BellRing} title="Notifications" subtitle="Choose how you receive updates." />
                        <div className="max-w-md">
                           <Toggle label="Email Notifications" enabled={notifications.email} onToggle={() => handleNotificationToggle('email')} />
                           <Toggle label="SMS Text Messages" enabled={notifications.sms} onToggle={() => handleNotificationToggle('sms')} />
                           <Toggle label="In-App Push Notifications" enabled={notifications.push} onToggle={() => handleNotificationToggle('push')} />
                        </div>
                    </Card>
                </div>

                {/* --- Right Column --- */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Membership & Billing */}
                    <Card>
                        <CardHeader icon={CreditCard} title="Membership & Billing" subtitle={`Your current plan is ${membership}.`} />
                        <div className="space-y-4">
                            <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1">Change Plan</label>
                               <select value={membership} onChange={(e) => setMembership(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                                   <option>Cum Laude</option>
                                   <option>Magna Cum Laude</option>
                                   <option>Summa Cum Laude</option>
                               </select>
                            </div>
                            <button className="w-full bg-gray-800 text-white py-2 rounded-lg font-semibold hover:bg-gray-900">Update Membership</button>
                        </div>
                    </Card>

                    {/* Account Security */}
                    <Card>
                        <CardHeader icon={Shield} title="Security" subtitle="Manage your account security."/>
                         <div className="space-y-3">
                            <button className="w-full text-left bg-gray-100 hover:bg-gray-200 p-3 rounded-md font-medium text-gray-800">Change Password</button>
                            <button className="w-full text-left bg-gray-100 hover:bg-gray-200 p-3 rounded-md font-medium text-gray-800">Two-Factor Authentication</button>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
