import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoUrl from '../assets/logo.jpg';

export default function LoginPage({ onLoginSuccess }) {
    const logoUrl = "https://i.ibb.co/L1A7fM1/logo.jpg";
    const navigate = useNavigate();

    const handleSimulatedLogin = (role) => {
        onLoginSuccess({
            name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
            role: role,
            avatar: `https://placehold.co/80x80/E2E8F0/4A5568?text=${role.charAt(0).toUpperCase()}`,
        });
        navigate('/dashboard');
    };

    return (
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 min-h-screen flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                    <div className="text-center mb-8">
                        <img src={logoUrl} alt="Start Right Tutoring Logo" className="w-40 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold">StartRight Hub</h1>
                        <p className="text-gray-500 mt-2">Welcome! Please sign in.</p>
                    </div>
                    <div className="space-y-3 my-8">
                        <h3 className="text-center text-sm font-semibold text-gray-600">-- For Demonstration --</h3>
                        <button onClick={() => handleSimulatedLogin('student')} className="w-full flex justify-center py-2 px-4 border rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600">Log in as Student</button>
                        <button onClick={() => handleSimulatedLogin('tutor')} className="w-full flex justify-center py-2 px-4 border rounded-lg text-sm font-medium text-white bg-green-500 hover:bg-green-600">Log in as Tutor</button>
                        <button onClick={() => handleSimulatedLogin('admin')} className="w-full flex justify-center py-2 px-4 border rounded-lg text-sm font-medium text-white bg-purple-500 hover:bg-purple-600">Log in as Admin</button>
                    </div>
                    <p className="mt-8 text-center text-sm text-gray-500">
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">Sign up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};