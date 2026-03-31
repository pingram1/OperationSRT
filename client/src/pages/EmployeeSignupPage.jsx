import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, AlertCircle, CheckCircle, Briefcase, Eye, EyeOff, Shield, GraduationCap } from 'lucide-react';
import { registerEmployee } from '../api/auth';
import { useAuth } from '../contexts/AuthContext.jsx';
import { setSecureToken, getSecureToken } from '../api/authStorage.js';
import Button from '../components/common/Button.jsx';

/**
 * Employee Signup Page - For Tutors and Administrators
 * This allows creating employee accounts (tutor/admin)
 * - If no admin exists: Anyone can create an admin (for initial setup)
 * - If admin exists: Only admins can create new admin accounts (via admin panel)
 */
export default function EmployeeSignupPage() {
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: '', 
        confirmPassword: '',
        role: 'tutor' 
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.message) {
            setSuccess(location.state.message);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
        
        // Ensure only tutor or admin roles
        if (formData.role !== 'tutor' && formData.role !== 'admin') {
            setError('Invalid account type. Please select Tutor or Administrator.');
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
            const normalizedEmail = formData.email.trim().toLowerCase();
            
            // Get token if user is logged in (for creating admin when one already exists)
            const token = getSecureToken();
            
            // Register the employee
            const response = await registerEmployee({
                name: formData.name.trim(),
                email: normalizedEmail,
                password: formData.password,
                role: formData.role,
            }, token);
            
            if (response.token) {
                setSecureToken(response.token);
            }
            
            if (response.user) {
                login(response.user);
                navigate('/dashboard', { 
                    state: { message: `Account created successfully! Welcome, ${response.user.name}!` } 
                });
            } else {
                navigate('/employee-login', { 
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
        <div className="bg-gradient-to-r from-slate-900 to-gray-800 min-h-screen flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <Briefcase className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800">Employee Signup</h1>
                        <p className="text-gray-500 mt-2">Create your employee account</p>
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
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
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
                                    placeholder="your.email@company.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                            <div className="grid grid-cols-2 gap-3 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'tutor' })}
                                    className={`flex items-center justify-center p-3 border-2 rounded-lg transition-all ${
                                        formData.role === 'tutor'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                    }`}
                                >
                                    <GraduationCap className="w-5 h-5 mr-2" />
                                    <span className="font-medium">Tutor</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                                    className={`flex items-center justify-center p-3 border-2 rounded-lg transition-all ${
                                        formData.role === 'admin'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                    }`}
                                >
                                    <Shield className="w-5 h-5 mr-2" />
                                    <span className="font-medium">Admin</span>
                                </button>
                            </div>
                            {formData.role === 'admin' && (
                                <p className="text-xs text-amber-600 mt-2">
                                    ⚠️ Note: If an admin already exists, only existing admins can create new admin accounts.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    name="password"
                                    type={showPassword ? 'text' : 'password'} 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    required
                                    autoComplete="new-password"
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'} 
                                    value={formData.confirmPassword} 
                                    onChange={handleChange} 
                                    required
                                    autoComplete="new-password"
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="Confirm your password"
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
                                Create Employee Account
                            </Button>
                        </div>
                    </form>
                    
                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/employee-login" className="font-medium text-blue-600 hover:text-blue-500">
                                Sign in
                            </Link>
                        </p>
                        <p className="text-xs text-gray-500">
                            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                Client Login Portal
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

