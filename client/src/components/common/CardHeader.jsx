import React from 'react';

export default function CardHeader({ icon: Icon, title, rightContent = null }) {
    return (
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
                <Icon className="w-6 h-6 mr-3 text-blue-500" />
                <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
            </div>
            {rightContent}
        </div>
    );
}