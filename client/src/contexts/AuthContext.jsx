import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getSecureToken, clearSecureToken } from '../api/authStorage.js';
import { getUserProfile } from '../api/users.js';

// 1. Create the Context
const AuthContext = createContext(null);

// 2. Create the Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Function to load user data from API
    const loadUserData = async () => {
        const token = getSecureToken();
        if (token) {
            try {
                const userData = await getUserProfile();
                setUser(userData);
                return userData;
            } catch (error) {
                // Only clear token on 401 (unauthorized) errors, not on network errors
                // This prevents transient network issues from logging users out
                if (error.status === 401 || (error.message && error.message.includes('Authentication required'))) {
                    console.warn('Token invalid on initial load, clearing authentication');
                    clearSecureToken();
                    setUser(null);
                } else {
                    // For other errors (network, 500, etc.), just log but don't clear token
                    console.error('Failed to load user data (non-critical):', error);
                }
                throw error;
            }
        }
        return null;
    };

    // Check for existing token on mount and load user data
    useEffect(() => {
        const loadUserFromToken = async () => {
            try {
                await loadUserData();
            } catch (error) {
                // Error already handled in loadUserData
            } finally {
                setIsLoading(false);
            }
        };
        
        loadUserFromToken();
    }, []);

    // Listen for session expired (e.g. 401 from any API call)
    useEffect(() => {
        const handleSessionExpired = () => {
            clearSecureToken();
            setUser(null);
        };
        window.addEventListener('sessionExpired', handleSessionExpired);
        return () => window.removeEventListener('sessionExpired', handleSessionExpired);
    }, []);

    /**
     * Handles user login. Updates the user state with the provided user data.
     */
    const login = (userData) => {
        setUser(userData);
    };

    /**
     * Handles user logout. Clears the user state and token.
     */
    const logout = () => {
        clearSecureToken();
        setUser(null);
    };

    /**
     * Refreshes user data from the server.
     * Useful after completing actions that update user XP, level, etc.
     * Only clears token on 401 errors (unauthorized), not on network errors.
     */
    const refreshUser = useCallback(async () => {
        const token = getSecureToken();
        if (!token) {
            // No token, nothing to refresh
            return;
        }
        
        try {
            const userData = await getUserProfile();
            setUser(userData);
        } catch (error) {
            // Only clear token and logout on 401 (unauthorized) errors
            // Network errors or other issues shouldn't log the user out
            if (error.status === 401 || (error.message && error.message.includes('Authentication required'))) {
                console.warn('Token invalid, clearing authentication');
                clearSecureToken();
                setUser(null);
            } else {
                // For other errors (network, 500, etc.), just log but don't logout
                console.error('Failed to refresh user data:', error);
            }
        }
    }, []); // Empty dependency array - stable function

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// 3. Create the custom hook for easy access
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
