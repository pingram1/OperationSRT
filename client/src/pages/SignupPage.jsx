import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff, KeyRound, School as SchoolIcon } from 'lucide-react';
import logoUrl from '../assets/logo.jpg';
import { registerUser, registerWithCode } from '../api/auth';
import { useAuth } from '../contexts/AuthContext.jsx';
import { setSecureToken } from '../api/authStorage.js';
import Button from '../components/common/Button.jsx';

/**
 * Client Signup Page - For Students and Parents only
 * Tutors and Admins must be onboarded through the employee portal
 */
export default function SignupPage() {
    const [signupMode, setSignupMode] = useState('standard'); // 'standard' | 'school_code'
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: '', 
        confirmPassword: '',
        role: 'student',
        studentEmail: '', // For parents to link to existing student accounts
        registrationCode: '' // For school pilot signup
    });
    const [error, setError] = useState('');
    const [codeError, setCodeError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === 'registrationCode' ? value.toUpperCase() : value,
        });
        if (error) setError('');
        if (success) setSuccess('');
        if (name === 'registrationCode' && codeError) setCodeError('');
    };

    const switchMode = (mode) => {
        if (mode === signupMode) return;
        setSignupMode(mode);
        setError('');
        setCodeError('');
        setSuccess('');
    };

    const validateCommonFields = () => {
        if (!formData.name.trim()) {
            setError('Please enter your full name');
            return false;
        }

        if (!formData.email.trim()) {
            setError('Please enter your email address');
            return false;
        }

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

        return true;
    };

    const validateForm = () => {
        if (!validateCommonFields()) return false;

        if (signupMode === 'school_code') {
            const cleanCode = formData.registrationCode.trim();
            if (!cleanCode) {
                setCodeError('Please enter your school registration code.');
                return false;
            }
            if (cleanCode.length < 4) {
                setCodeError('That code looks too short. Double-check it with your school contact.');
                return false;
            }
            return true;
        }

        if (formData.role !== 'student' && formData.role !== 'parent') {
            setError('Invalid account type. Please select Student or Parent.');
            return false;
        }

        return true;
    };

    const submitStandardSignup = async () => {
        const normalizedEmail = formData.email.trim().toLowerCase();

        const registrationData = {
            name: formData.name.trim(),
            email: normalizedEmail,
            password: formData.password,
            role: formData.role,
        };

        if (formData.role === 'parent' && formData.studentEmail.trim()) {
            registrationData.studentEmail = formData.studentEmail.trim().toLowerCase();
        }

        const response = await registerUser(registrationData);

        if (response.token) {
            setSecureToken(response.token);
        }

        let successMessage = 'Account created successfully! Welcome!';
        if (response.linkRequest) {
            successMessage = response.linkRequest.sent
                ? 'Account created successfully! A link request has been sent to the student. They will need to accept it to link your accounts.'
                : `Account created successfully! ${response.linkRequest.message || 'Failed to send link request.'}`;
        }

        if (response.user) {
            login(response.user);
            navigate('/dashboard', { state: { message: successMessage } });
        } else {
            navigate('/login', {
                state: { message: 'Account created successfully! Please sign in.' },
            });
        }
    };

    const submitSchoolCodeSignup = async () => {
        const normalizedEmail = formData.email.trim().toLowerCase();
        const registrationCode = formData.registrationCode.trim().toUpperCase();

        const response = await registerWithCode({
            name: formData.name.trim(),
            email: normalizedEmail,
            password: formData.password,
            registrationCode,
        });

        if (response.token) {
            setSecureToken(response.token);
        }

        const schoolName = response.school?.name ? ` for ${response.school.name}` : '';
        const successMessage = `Account created${schoolName}! Welcome to your school's pilot program.`;

        if (response.user) {
            login(response.user);
            navigate('/dashboard', { state: { message: successMessage } });
        } else {
            navigate('/login', {
                state: { message: 'Account created successfully! Please sign in.' },
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setCodeError('');
        setSuccess('');

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            if (signupMode === 'school_code') {
                await submitSchoolCodeSignup();
            } else {
                await submitStandardSignup();
            }
        } catch (err) {
            const errorMessage = err && err.message ? err.message : 'Registration failed. Please try again.';

            if (signupMode === 'school_code'
                && /invalid school registration code/i.test(errorMessage)) {
                setCodeError('That registration code is not valid. Please verify it with your school contact.');
            } else {
                setError(errorMessage);
            }
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

                    <div
                        role="tablist"
                        aria-label="Signup type"
                        className="grid grid-cols-2 gap-1 p-1 mb-6 bg-gray-100 rounded-xl"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={signupMode === 'standard'}
                            onClick={() => switchMode('standard')}
                            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                signupMode === 'standard'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <UserIcon className="w-4 h-4" />
                            Standard Signup
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={signupMode === 'school_code'}
                            onClick={() => switchMode('school_code')}
                            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                signupMode === 'school_code'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <SchoolIcon className="w-4 h-4" />
                            Join with School Code
                        </button>
                    </div>

                    {signupMode === 'school_code' && (
                        <div className="flex items-start p-3 mb-4 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg text-xs">
                            <SchoolIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>
                                Use this option if your school is participating in our pilot program and gave you a registration code.
                            </span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center p-3 mb-4 bg-green-100 text-green-700 rounded-lg text-sm">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        {signupMode === 'school_code' && (
                            <div>
                                <label htmlFor="registrationCode" className="block text-sm font-medium text-gray-700 mb-1">
                                    School Registration Code
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="registrationCode"
                                        name="registrationCode"
                                        type="text"
                                        value={formData.registrationCode}
                                        onChange={handleChange}
                                        required
                                        autoComplete="off"
                                        spellCheck={false}
                                        maxLength={12}
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg uppercase tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            codeError ? 'border-red-400' : 'border-gray-300'
                                        }`}
                                        placeholder="e.g. AB7K9X"
                                        aria-invalid={Boolean(codeError)}
                                        aria-describedby={codeError ? 'registration-code-error' : 'registration-code-hint'}
                                    />
                                </div>
                                {codeError ? (
                                    <p
                                        id="registration-code-error"
                                        className="flex items-center text-xs text-red-600 mt-1"
                                    >
                                        <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                                        {codeError}
                                    </p>
                                ) : (
                                    <p id="registration-code-hint" className="text-xs text-gray-500 mt-1">
                                        Enter the 6-character code provided by your school.
                                    </p>
                                )}
                            </div>
                        )}

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
                        
                         {signupMode === 'standard' && (
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
                         )}

                        {/* Student Email Field (only shown for parents on the standard flow) */}
                        {signupMode === 'standard' && formData.role === 'parent' && (
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
