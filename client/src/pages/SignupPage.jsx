import React from 'react';
import { Link } from 'react-router-dom';

export default function SignupPage() {
    return (
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 min-h-screen flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md text-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                    <h1 className="text-3xl font-bold">Sign Up</h1>
                    <p className="mt-2">This is where the real signup form would go, connecting to your backend.</p>
                    <Link to="/login" className="mt-4 inline-block font-medium text-blue-600 hover:text-blue-500">&larr; Back to Login</Link>
                </div>
            </div>
        </div>
    );
};
