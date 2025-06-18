import React, { useState } from 'react';
import { Sliders, Bell, AlertTriangle, List, Plus, X } from 'lucide-react';

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


// --- MOCK DATA (to be replaced by API calls) ---
const initialConfig = {
    maintenanceMode: false,
    maintenanceMessage: "We are currently performing scheduled maintenance. We'll be back online shortly!",
    businessHours: "Mon - Fri, 9:00 AM - 8:00 PM EST",
    contactEmail: "support@startright.com",
    subjects: ["Algebra", "Geometry", "Chemistry", "Physics", "English Literature", "History"],
};

// --- System Config Page Component ---
export default function SystemConfigPage() {
    const [config, setConfig] = useState(initialConfig);
    const [newSubject, setNewSubject] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = (key) => setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    const handleChange = (e) => setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAddSubject = () => {
        if (newSubject && !config.subjects.includes(newSubject)) {
            setConfig(prev => ({ ...prev, subjects: [...prev.subjects, newSubject] }));
            setNewSubject('');
        }
    };

    const handleRemoveSubject = (subjectToRemove) => {
        setConfig(prev => ({ ...prev, subjects: prev.subjects.filter(s => s !== subjectToRemove) }));
    };

    const handleSaveChanges = () => {
        setIsLoading(true);
        // Simulate API call to save config
        setTimeout(() => {
            console.log("Saving config:", config);
            setIsLoading(false);
            alert("Settings saved successfully!");
        }, 1500);
    };

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">System Configuration</h1>
                <p className="text-gray-600">Manage platform-wide settings and operational parameters.</p>
            </header>

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
                                <input type="text" name="businessHours" value={config.businessHours} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Public Contact Email</label>
                                <input type="email" name="contactEmail" value={config.contactEmail} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                        </div>
                    </Card>
                </div>
                {/* --- Right Column --- */}
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader icon={List} title="Subjects Offered" subtitle="Manage available tutoring subjects." />
                        <div className="space-y-2 mb-4">
                            {config.subjects.map(subject => (
                                <div key={subject} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                    <p className="text-sm font-medium">{subject}</p>
                                    <button onClick={() => handleRemoveSubject(subject)} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                         <div className="flex gap-2">
                            <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="w-full p-2 border rounded-md" placeholder="New subject..."/>
                            <Button onClick={handleAddSubject} Icon={Plus} variant="secondary"></Button>
                        </div>
                    </Card>
                </div>
            </div>
            
            <div className="mt-8 flex justify-end">
                <Button onClick={handleSaveChanges} isLoading={isLoading}>
                    {isLoading ? 'Saving...' : 'Save All Changes'}
                </Button>
            </div>
        </div>
    );
}
