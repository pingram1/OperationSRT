import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, CheckCircle, Briefcase } from 'lucide-react';
import { loginUser } from '../api/auth'; 
import { useAuth } from '../contexts/AuthContext.jsx';
import { setSecureToken } from '../api/authStorage.js';
import { getGoogleAuthUrl } from '../api/googleAuth';
import logoUrl from '../assets/logo.jpg';
import Button from '../components/common/Button.jsx';
import TwoFactorChallenge from '../components/auth/TwoFactorChallenge.jsx';

/**
 * Employee Login Page - For Tutors and Administrators
 * This is separate from the client login portal
 */
export default function EmployeeLoginPage() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [challengeToken, setChallengeToken] = useState('');
    const { login } = useAuth();
    
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.message) {
            setSuccess(location.state.message);
            window.history.replaceState({}, document.title);
        }
        
        // Check for OAuth error in URL query params
        const urlParams = new URLSearchParams(location.search);
        const errorParam = urlParams.get('error');
        if (errorParam) {
            let errorMessage = 'Authentication failed. Please try again.';
            switch (errorParam) {
                case 'oauth_denied':
                    errorMessage = 'Google Workspace authentication was cancelled.';
                    break;
                case 'no_code':
                    errorMessage = 'No authorization code received. Please try again.';
                    break;
                case 'token_exchange_failed':
                    errorMessage = 'Failed to exchange authorization code. Please try again.';
                    break;
                case 'user_info_failed':
                    errorMessage = 'Failed to retrieve user information from Google.';
                    break;
                case 'no_email':
                    errorMessage = 'No email address found in Google account.';
                    break;
                case 'domain_not_allowed':
                    errorMessage = 'This email domain is not allowed. Only @startrighttutoring.com emails are allowed for employee login.';
                    break;
                case 'google_auth_failed':
                    const details = urlParams.get('details');
                    errorMessage = details ? `Authentication failed: ${details}` : 'Google Workspace authentication failed. Please try again.';
                    break;
            }
            setError(errorMessage);
            // Clear the error from URL
            window.history.replaceState({}, document.title, '/employee-login');
        }
    }, [location]);

    const { email, password } = formData;

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleGoogleLogin = async () => {
        try {
            setError('');
            setIsLoading(true);
            const url = await getGoogleAuthUrl('organization');
            window.location.href = url;
        } catch (err) {
            setError('Failed to initiate Google Workspace login. Please try again.');
            setIsLoading(false);
        }
    };

    // Shared post-credential completion: applies the employee-only role gate,
    // stores the session token, and routes into the app. Used by both the
    // direct login path and the 2FA-verified path.
    const completeLogin = (data) => {
        // Verify that the user is an employee (tutor, admin, or super_admin)
        if (data.user && (data.user.role === 'tutor' || data.user.role === 'admin' || data.user.role === 'super_admin')) {
            if (data.token) {
                setSecureToken(data.token);
            }
            login(data.user);
            navigate('/dashboard');
        } else if (data.user) {
            // User is a student or parent - redirect them to client login
            setChallengeToken('');
            setError('This portal is for employees only. Please use the client login portal.');
        } else {
            setChallengeToken('');
            setError('Login successful but no user data received');
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();
            
            if (!normalizedEmail || !password) {
                setError('Please enter both email and password');
                setIsLoading(false);
                return;
            }
            
            const data = await loginUser(normalizedEmail, password);

            // 2FA-enabled account: defer completion to the verification step.
            if (data.twoFactorRequired && data.challengeToken) {
                setChallengeToken(data.challengeToken);
                setIsLoading(false);
                return;
            }

            completeLogin(data);
        } catch (err) {
            let errorMessage = 'Login failed. Please try again.';
            
            if (err.message) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            
            if (errorMessage.includes('pattern') || errorMessage.includes('expected')) {
                errorMessage = 'Please enter a valid email address';
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
                    {challengeToken ? (
                        <TwoFactorChallenge
                            challengeToken={challengeToken}
                            onSuccess={completeLogin}
                            onBack={() => {
                                setChallengeToken('');
                                setError('');
                            }}
                        />
                    ) : (
                    <>
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <Briefcase className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800">Employee Portal</h1>
                        <p className="text-gray-500 mt-2">Sign in to access your workspace</p>
                    </div>

                    {success && (
                        <div className="flex items-center p-3 mb-4 bg-green-100 text-green-700 rounded-lg text-sm">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Work Email</label>
                            <div className="mt-1 relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    name="email" 
                                    type="email" 
                                    value={email} 
                                    onChange={handleChange} 
                                    required 
                                    autoComplete="email"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="your.email@company.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="mt-1 relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    name="password" 
                                    type="password" 
                                    value={password} 
                                    onChange={handleChange} 
                                    required 
                                    autoComplete="current-password"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="Enter your password"
                                />
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
                                Sign In to Portal
                            </Button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="mt-6 mb-6 flex items-center">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-4 text-sm text-gray-500">OR</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </div>

                    {/* Google Workspace Login */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white rounded-lg px-4 py-3 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Sign in with Google Workspace</span>
                    </button>
                    
                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/employee-signup" className="font-medium text-blue-600 hover:text-blue-500">
                                Create employee account
                            </Link>
                        </p>
                        <p className="text-xs text-gray-500">
                            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                Client Login Portal
                            </Link>
                        </p>
                        <div className="pt-4 mt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-400">
                                Access is restricted to authorized tutors and administrators.
                                <br />
                                If you need access, contact your administrator.
                            </p>
                        </div>
                    </div>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}
