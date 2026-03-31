import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar } from 'lucide-react';
import Button from '../common/Button';

/**
 * A component that displays a summary card for a single child in the Parent Portal.
 * @param {object} props - The component's props.
 * @param {object} props.child - An object containing the child's data.
 * @param {string} props.child.name - The child's full name.
 * @param {string} props.child.avatar - URL for the child's avatar image (optional).
 * @param {string} props.child.email - The child's email (optional).
 */
export default function ChildProfileCard({ child }) {
    const navigate = useNavigate();
    
    if (!child) {
        return null; // Don't render anything if no child data is provided
    }

    const childId = child._id || child.id;
    const childName = child.name || 'Child';
    const childEmail = child.email || '';
    const childAvatar = child.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=4A90E2&color=fff&size=128`;

    // Calculate a default progress (could be based on completed sessions, etc.)
    const overallProgress = 50; // Placeholder - could be calculated from actual data

    return (
        <div className="bg-white rounded-xl shadow-md p-6 flex flex-col md:flex-row items-center gap-6">
            {/* Avatar and Progress Circle */}
            <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                        className="text-gray-200"
                        strokeWidth="3"
                        fill="none"
                        stroke="currentColor"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                        className="text-green-500"
                        strokeWidth="3"
                        strokeDasharray={`${overallProgress}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        stroke="currentColor"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                </svg>
                <img
                    src={childAvatar}
                    alt={`${childName}'s profile`}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-white object-cover"
                    onError={(e) => {
                        // Fallback to initials if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
                <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-white bg-blue-500 flex items-center justify-center text-white text-2xl font-bold"
                    style={{ display: 'none' }}
                >
                    {childName.charAt(0).toUpperCase()}
                </div>
            </div>

            {/* Child Info and Actions */}
            <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-800">{childName}</h3>
                {childEmail && (
                    <p className="text-sm text-gray-500 mb-2">{childEmail}</p>
                )}
                <p className="text-sm text-gray-500 mb-4">Student Account</p>
                
                <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-3">
                    <Button 
                        variant="secondary" 
                        Icon={BookOpen}
                        onClick={() => {
                            // Could navigate to academics tab or detailed report
                            // For now, just scroll to academics section or navigate
                            window.location.hash = 'academics';
                        }}
                    >
                        View Academics
                    </Button>
                    <Button 
                        variant="primary" 
                        Icon={Calendar}
                        onClick={() => navigate(`/appointments?childId=${childId}`)}
                    >
                        Schedule Session
                    </Button>
                </div>
            </div>
        </div>
    );
}
