import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, AlertCircle } from 'lucide-react';
import logoUrl from '../assets/logo.jpg';
import { useAuth } from '../contexts/AuthContext.jsx';

// NOTE: This component is in a special debugging mode.
// It will not perform a real registration. Instead, it will log you in
// with a mock account to bypass persistent form submission errors.

export default function SignupPage() {
    const [formData, setFormData] = useState({ name: '', role: 'student' });
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError("Please enter a name to proceed.");
            return;
        }
        setError('');

        try {
            const mockUser = {
                name: formData.name,
                role: formData.role,
                avatar: `https://placehold.co/80x80/E2E8F0/4A5568?text=${formData.name.charAt(0).toUpperCase()}`,
            };
            
            // Call the login function from the context and wait for it to complete
            await login(mockUser);
            
            // Navigate to the dashboard AFTER the login state is set
            navigate('/dashboard');

        } catch (err) {
            setError("An unexpected error occurred during login.");
        }
    };

    return (
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 min-h-screen flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                    <div className="text-center mb-8">
                         <img src={logoUrl} alt="StartRight Tutoring Logo" className="w-40 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-gray-800">Create Your Account</h1>
                        <p className="text-gray-500 mt-2">(Simplified Debug Mode)</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <div className="mt-1 relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input name="name" type="text" value={formData.name} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" placeholder="Enter Your Name" />
                            </div>
                        </div>
                        
                         <div>
                            <label className="block text-sm font-medium text-gray-700">I am a...</label>
                            <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white">
                                <option value="student">Student</option>
                                <option value="parent">Parent</option>
                                <option value="tutor">Tutor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {error && <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg text-sm"><AlertCircle className="w-5 h-5 mr-2" />{error}</div>}
                        
                        <div>
                            <button type="submit" className="w-full flex justify-center py-3 px-4 border rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                                Proceed to Dashboard
                            </button>
                        </div>
                    </form>
                    <p className="mt-8 text-center text-sm text-gray-500">
                        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                           Back to Real Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
