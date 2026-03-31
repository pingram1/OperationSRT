import React, { useState, useEffect } from 'react';
import { Sliders, Bell, AlertTriangle, List, Plus, X, Clock, AlertCircle } from 'lucide-react';
import { getSystemConfig, updateSystemConfig } from '../api/systemConfig';

// --- Reusable Components (can be moved to common folder) ---
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
const Button = ({ children, variant = 'primary', Icon, isLoading = false, className = '', ...rest }) => {
    const baseStyles = 'flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantStyles = { primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500', secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400', danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' };
    const disabledStyles = 'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed';
    return (<button className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`} disabled={isLoading} {...rest}>{Icon && <Icon className="w-5 h-5 mr-2 -ml-1" />}{children}</button>);
};
const Toggle = ({ enabled, onToggle }) => (
    <button onClick={onToggle} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);


// Days of the week for tutor schedule
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- System Config Page Component ---
export default function SystemConfigPage() {
    const [config, setConfig] = useState(null);
    const [newSubject, setNewSubject] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        fetchSystemConfig();
    }, []);

    const fetchSystemConfig = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getSystemConfig();
            setConfig(data);
        } catch (err) {
            console.error('Failed to fetch system config:', err);
            setError(err.message || 'Failed to load system configuration');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (key) => {
        if (!config) return;
        setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleChange = (e) => {
        if (!config) return;
        setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddSubject = () => {
        if (!config || !newSubject.trim()) return;
        const trimmedSubject = newSubject.trim();
        if (!config.subjects.includes(trimmedSubject)) {
            setConfig(prev => ({ ...prev, subjects: [...prev.subjects, trimmedSubject] }));
            setNewSubject('');
        }
    };

    const handleRemoveSubject = (subjectToRemove) => {
        if (!config) return;
        setConfig(prev => ({ ...prev, subjects: prev.subjects.filter(s => s !== subjectToRemove) }));
    };

    const handleTutorScheduleChange = (day, field, value) => {
        if (!config) return;
        
        // Ensure tutorSchedule structure exists
        const tutorSchedule = config.tutorSchedule || {
            weeklySchedule: [],
            timezone: 'America/New_York',
            notes: '',
        };
        
        // Find or create schedule entry for this day
        let updatedSchedule = [...(tutorSchedule.weeklySchedule || [])];
        const dayIndex = updatedSchedule.findIndex(s => s.day === day);
        
        if (dayIndex >= 0) {
            // Update existing day
            updatedSchedule[dayIndex] = {
                ...updatedSchedule[dayIndex],
                [field]: value,
            };
        } else {
            // Add new day entry
            updatedSchedule.push({
                day,
                available: field === 'available' ? value : false,
                startTime: '09:00',
                endTime: '17:00',
                [field]: value,
            });
        }
        
        setConfig(prev => ({
            ...prev,
            tutorSchedule: {
                ...prev.tutorSchedule || { timezone: 'America/New_York', notes: '' },
                weeklySchedule: updatedSchedule,
            },
        }));
    };

    const handleTutorScheduleNotesChange = (e) => {
        if (!config) return;
        setConfig(prev => ({
            ...prev,
            tutorSchedule: {
                ...prev.tutorSchedule,
                notes: e.target.value,
            },
        }));
    };

    const handleSaveChanges = async () => {
        if (!config) return;
        try {
            setIsSaving(true);
            setError(null);
            setSuccessMessage(null);
            
            await updateSystemConfig(config);
            setSuccessMessage('Settings saved successfully!');
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Failed to save system config:', err);
            setError(err.message || 'Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">System Configuration</h1>
                    <p className="text-gray-600">Manage platform-wide settings and operational parameters.</p>
                </header>
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading configuration...</p>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">System Configuration</h1>
                    <p className="text-gray-600">Manage platform-wide settings and operational parameters.</p>
                </header>
                <div className="text-center py-16">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600">Failed to load configuration.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">System Configuration</h1>
                <p className="text-gray-600">Manage platform-wide settings and operational parameters.</p>
            </header>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {successMessage}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Left Column --- */}
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader icon={Bell} title="Platform Status" subtitle="Control the availability of your application." />
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <h4 className="font-semibold">Maintenance Mode</h4>
                                <p className="text-sm text-gray-500">When enabled, users will see a maintenance page instead of the app.</p>
                            </div>
                            <Toggle enabled={config.maintenanceMode} onToggle={() => handleToggle('maintenanceMode')} />
                        </div>
                        {config.maintenanceMode && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Maintenance Message</label>
                                <textarea name="maintenanceMessage" value={config.maintenanceMessage} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md h-24"></textarea>
                            </div>
                        )}
                    </Card>

                    <Card>
                        <CardHeader icon={Sliders} title="Business Settings" subtitle="Update general business information."/>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Operating Hours</label>
                                <input type="text" name="businessHours" value={config.businessHours || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" placeholder="Mon - Fri, 9:00 AM - 8:00 PM EST" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Public Contact Email</label>
                                <input type="email" name="contactEmail" value={config.contactEmail || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" placeholder="support@startright.com" />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={Clock} title="Tutor Schedule" subtitle="Set default schedule for tutors. This can be overridden per tutor."/>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Schedule</label>
                                <div className="space-y-3">
                                    {DAYS_OF_WEEK.map((day) => {
                                        const daySchedule = config.tutorSchedule?.weeklySchedule?.find(s => s.day === day) || {
                                            day,
                                            available: false,
                                            startTime: '09:00',
                                            endTime: '17:00',
                                        };
                                        return (
                                            <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                                                <div className="flex items-center gap-2 w-24">
                                                    <input
                                                        type="checkbox"
                                                        checked={daySchedule.available || false}
                                                        onChange={(e) => handleTutorScheduleChange(day, 'available', e.target.checked)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-sm font-medium">{day}</span>
                                                </div>
                                                {daySchedule.available && (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs text-gray-500">Start:</label>
                                                            <input
                                                                type="time"
                                                                value={daySchedule.startTime || '09:00'}
                                                                onChange={(e) => handleTutorScheduleChange(day, 'startTime', e.target.value)}
                                                                className="p-1 border rounded text-sm"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs text-gray-500">End:</label>
                                                            <input
                                                                type="time"
                                                                value={daySchedule.endTime || '17:00'}
                                                                onChange={(e) => handleTutorScheduleChange(day, 'endTime', e.target.value)}
                                                                className="p-1 border rounded text-sm"
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Notes</label>
                                <textarea
                                    value={config.tutorSchedule?.notes || ''}
                                    onChange={handleTutorScheduleNotesChange}
                                    className="w-full p-2 border rounded-md h-20"
                                    placeholder="Additional notes or instructions for tutors about the schedule..."
                                />
                            </div>
                        </div>
                    </Card>
                </div>
                {/* --- Right Column --- */}
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader icon={List} title="Subjects Offered" subtitle="Manage available tutoring subjects." />
                        <div className="space-y-2 mb-4">
                            {config.subjects && config.subjects.length > 0 ? (
                                config.subjects.map(subject => (
                                    <div key={subject} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                        <p className="text-sm font-medium">{subject}</p>
                                        <button onClick={() => handleRemoveSubject(subject)} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">No subjects added yet</p>
                            )}
                        </div>
                         <div className="flex gap-2">
                            <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="w-full p-2 border rounded-md" placeholder="New subject..."/>
                            <Button onClick={handleAddSubject} Icon={Plus} variant="secondary"></Button>
                        </div>
                    </Card>
                </div>
            </div>
            
            <div className="mt-8 flex justify-end">
                <Button onClick={handleSaveChanges} isLoading={isSaving}>
                    {isSaving ? 'Saving...' : 'Save All Changes'}
                </Button>
            </div>
        </div>
    );
}
