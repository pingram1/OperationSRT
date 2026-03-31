import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import logoUrl from '../assets/logo.jpg';
import { registerUser } from '../api/auth';
import { useAuth } from '../contexts/AuthContext.jsx';
import { setSecureToken } from '../api/authStorage.js';
import Button from '../components/common/Button.jsx';

/**
 * Client Signup Page - For Students and Parents only
 * Tutors and Admins must be onboarded through the employee portal
 */
export default function SignupPage() {
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: '', 
        confirmPassword: '',
        role: 'student',
        studentEmail: '' // For parents to link to existing student accounts
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear errors when user starts typing
        if (error) setError('');
        if (success) setSuccess('');
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Please enter your full name');
            return false;
        }
        
        if (!formData.email.trim()) {
            setError('Please enter your email address');
            return false;
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            setError('Please enter a valid email address');
            return false;
        }
        
        if (!formData.password) {
            setError('Please enter a password');
            return false;
        }
        
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        
        // Ensure only student or parent roles
        if (formData.role !== 'student' && formData.role !== 'parent') {
            setError('Invalid account type. Please select Student or Parent.');
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!validateForm()) {
            return;
        }
        
        setIsLoading(true);

        try {
            // Normalize email
            const normalizedEmail = formData.email.trim().toLowerCase();
            
            // Register the user
            const registrationData = {
                name: formData.name.trim(),
                email: normalizedEmail,
                password: formData.password,
                role: formData.role,
            };

            // If parent is signing up and provided a student email, include it
            if (formData.role === 'parent' && formData.studentEmail.trim()) {
                registrationData.studentEmail = formData.studentEmail.trim().toLowerCase();
            }

            const response = await registerUser(registrationData);
            
            // Store the token if provided
            if (response.token) {
                setSecureToken(response.token);
            }
            
            // Handle link request message if present
            let successMessage = 'Account created successfully! Welcome!';
            if (response.linkRequest) {
                if (response.linkRequest.sent) {
                    successMessage = 'Account created successfully! A link request has been sent to the student. They will need to accept it to link your accounts.';
                } else {
                    successMessage = `Account created successfully! ${response.linkRequest.message || 'Failed to send link request.'}`;
                }
            }
            
            // If registration returns user data, log them in
            if (response.user) {
                login(response.user);
                navigate('/dashboard', { 
                    state: { message: successMessage } 
                });
            } else {
                // Otherwise, redirect to login with success message
                navigate('/login', { 
                    state: { message: 'Account created successfully! Please sign in.' } 
                });
            }
        } catch (err) {
            let errorMessage = 'Registration failed. Please try again.';
            
            if (err.message) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                    <div className="text-center mb-8">
                         <img src={logoUrl} alt="StartRight Tutoring Logo" className="w-40 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-gray-800">Create Your Account</h1>
                        <p className="text-gray-500 mt-2">Join us to start your learning journey</p>
                    </div>

                    {success && (
                        <div className="flex items-center p-3 mb-4 bg-green-100 text-green-700 rounded-lg text-sm">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    name="name" 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="Enter your full name" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    name="email" 
                                    type="email" 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                    required
                                    autoComplete="email"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="your.email@example.com" 
                                />
                            </div>
                        </div>
                        
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                            <select 
                                name="role" 
                                value={formData.role} 
                                onChange={handleChange} 
                                className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="student">Student</option>
                                <option value="parent">Parent</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Tutors and administrators must use the employee portal
                            </p>
                        </div>

                        {/* Student Email Field (only shown for parents) */}
                        {formData.role === 'parent' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Student Email (Optional)
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input 
                                        name="studentEmail" 
                                        type="email" 
                                        value={formData.studentEmail} 
                                        onChange={handleChange} 
                                        autoComplete="email"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                        placeholder="student@example.com" 
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Enter your child's student account email to link your accounts. They will need to accept the request.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    name="password" 
                                    type={showPassword ? "text" : "password"} 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    required
                                    autoComplete="new-password"
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="At least 6 characters" 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    name="confirmPassword" 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    value={formData.confirmPassword} 
                                    onChange={handleChange} 
                                    required
                                    autoComplete="new-password"
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="Re-enter your password" 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        
                        <div>
                            <Button 
                                type="submit" 
                                isLoading={isLoading}
                                className="w-full"
                            >
                                Create Account
                            </Button>
                        </div>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                Sign in
                            </Link>
                        </p>
                        <p className="text-xs text-gray-500 mt-3">
                            Employee?{' '}
                            <Link to="/employee-login" className="font-medium text-blue-600 hover:text-blue-500">
                                Employee Portal
                        </Link>
                    </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
