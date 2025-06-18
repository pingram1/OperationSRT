import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';
import Button from '../common/Button'; // Assuming a reusable button component

/**
 * A component that displays a summary card for a single child in the Parent Portal.
 * @param {object} props - The component's props.
 * @param {object} props.child - An object containing the child's data.
 * @param {string} props.child.name - The child's full name.
 * @param {string} props.child.avatar - URL for the child's avatar image.
 * @param {number} props.child.overallProgress - The child's overall progress percentage.
 */
export default function ChildProfileCard({ child }) {
    if (!child) {
        return null; // Don't render anything if no child data is provided
    }

    return (
        <div className="bg-white rounded-xl shadow-md p-6 flex flex-col md:flex-row items-center gap-6">
            {/* Avatar and Progress Circle */}
            <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                        className="text-gray-200"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                        className="text-green-500"
                        strokeWidth="3"
                        strokeDasharray={`${child.overallProgress}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                </svg>
                <img
                    src={child.avatar}
                    alt={`${child.name}'s profile`}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-white"
                />
            </div>

            {/* Child Info and Actions */}
            <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-800">{child.name}</h3>
                <p className="text-sm text-gray-500 mb-4">Overall Progress: {child.overallProgress}%</p>
                
                <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-3">
                    <Button 
                        variant="secondary" 
                        Icon={BookOpen}
                        // This would navigate to a detailed report page for the specific child
                        // onClick={() => navigate(`/parent-portal/${child.id}/academics`)}
                    >
                        View Report
                    </Button>
                    <Button 
                        variant="primary" 
                        Icon={Calendar}
                        // This could navigate to the appointments page pre-filtered for this child
                        // onClick={() => navigate('/appointments')}
                    >
                        Schedule Session
                    </Button>
                </div>
            </div>
        </div>
    );
}
