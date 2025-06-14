import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';

// Import the function to call the login API
import { loginUser } from '../api/auth'; 
// Import the logo from your assets folder
import logoUrl from '../assets/logo.jpg';

export default function LoginPage({ onLoginSuccess }) {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const { email, password } = formData;

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Call the login API function
            const data = await loginUser(email, password);
            
            // On successful login, call the function passed from App.jsx
            // The data object from the server should contain the user info and a token
            onLoginSuccess(data.user);
            
            // Redirect to the dashboard
            navigate('/dashboard');

        } catch (err) {
            // If the API call fails, display the error message
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 min-h-screen flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                    <div className="text-center mb-8">
                        <img src={logoUrl} alt="Start Right Tutoring Logo" className="w-40 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-gray-800">StartRight Hub</h1>
                        <p className="text-gray-500 mt-2">Welcome! Please sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                            <div className="mt-1 relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input name="email" type="email" value={email} onChange={handleChange} required className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="mt-1 relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input name="password" type="password" value={password} onChange={handleChange} required className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                <AlertCircle className="w-5 h-5 mr-2" />
                                {error}
                            </div>
                        )}

                        <div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </div>
                    </form>
                    
                    <p className="mt-8 text-center text-sm text-gray-500">
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">Sign up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};