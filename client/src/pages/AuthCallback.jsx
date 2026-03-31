import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleGoogleCallback } from '../api/googleAuth';
import { useAuth } from '../contexts/AuthContext';

/**
 * AuthCallback Page
 * Handles OAuth redirects from Google authentication
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get('token');
        const email = searchParams.get('email');
        const errorParam = searchParams.get('error');

        // Check for error from OAuth
        if (errorParam) {
          setError('Authentication failed. Please try again.');
          setIsLoading(false);
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        if (token && email) {
          // Handle successful Google auth
          const userData = await handleGoogleCallback(token, email);
          
          // Check if user is an employee trying to use client portal
          const currentPath = window.location.pathname;
          if (currentPath.includes('/auth/callback')) {
            // Determine redirect based on role
            if (userData.role === 'tutor' || userData.role === 'admin' || userData.role === 'super_admin') {
                // Check if they came from employee login
                const referrer = document.referrer;
                if (referrer.includes('/employee-login') || userData.domainType === 'organization') {
                    login(userData);
                    navigate('/dashboard');
                } else {
                    setError('This portal is for clients only. Please use the Employee Portal.');
                    setIsLoading(false);
                    setTimeout(() => {
                        navigate('/employee-login');
                    }, 3000);
                    return;
                }
            } else {
              // Student or parent - check if they came from employee login
              const referrer = document.referrer;
              if (referrer.includes('/employee-login')) {
                setError('This portal is for employees only. Please use the client login portal.');
                setIsLoading(false);
                setTimeout(() => {
                  navigate('/login');
                }, 3000);
                return;
              }
              login(userData);
              navigate('/dashboard');
            }
          }
        } else {
          setError('No authentication token received. Please try again.');
          setIsLoading(false);
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed. Please try again.');
        setIsLoading(false);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate, login]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">Redirecting you back to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

