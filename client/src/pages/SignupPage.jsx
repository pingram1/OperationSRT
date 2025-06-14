import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

// Import the function to call the registration API from your api/auth.js file
import { registerUser } from '../api/auth'; 
// Import the logo from your assets folder
import logoUrl from '../assets/logo.jpg';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student', // Default role
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const { name, email, password, confirmPassword, role } = formData;

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // --- Frontend Validation ---
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setIsLoading(true);
        try {
            // Call the register API function
            const data = await registerUser(formData);
            
            console.log('Registration successful:', data);
            setSuccess('Registration successful! Redirecting to login...');
            
            // Redirect to the login page after a short delay to show the success message
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            // If the API call from auth.js throws an error, display it
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
                         <img src={logoUrl} alt="StartRight Tutoring Logo" className="w-40 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-gray-800">Create Your Account</h1>
                        <p className="text-gray-500 mt-2">Join the StartRight community.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <div className="mt-1 relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input name="name" type="text" value={name} onChange={handleChange} required className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
                            </div>
                        </div>
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
                                <input name="password" type="password" value={password} onChange={handleChange} required minLength="6" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <div className="mt-1 relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input name="confirmPassword" type="password" value={confirmPassword} onChange={handleChange} required minLength="6" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">I am a...</label>
                            <select name="role" value={role} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
                                <option value="student">Student</option>
                                <option value="parent">Parent</option>
                                <option value="tutor">Tutor</option>
                            </select>
                        </div>

                        {/* --- Feedback Messages --- */}
                        {error && <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg text-sm"><AlertCircle className="w-5 h-5 mr-2" />{error}</div>}
                        {success && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">{success}</div>}
                        
                        <div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                {isLoading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </div>
                    </form>
                    <p className="mt-8 text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                           Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

