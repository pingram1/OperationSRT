import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser as loginApi, registerUser as registerApi } from '../api/auth';

// 1. Create the Authentication Context
const AuthContext = createContext(null);

/**
 * This is the AuthProvider component. It will wrap your entire application
 * and provide the authentication state and functions to all components inside it.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    // This effect runs once when the app loads.
    // It checks if a token exists in localStorage to keep the user logged in.
    useEffect(() => {
        const checkLoggedInUser = async () => {
            if (token) {
                try {
                    // In a real app, you would have an API endpoint to verify the token
                    // and get the user's profile data.
                    // For now, we'll simulate this by decoding the token if needed or
                    // just assuming the user is valid if a token exists.
                    // For this example, we'll just set a mock user if a token is found.
                    const mockUser = JSON.parse(localStorage.getItem('user'));
                    if(mockUser){
                        setUser(mockUser);
                    }
                } catch (error) {
                    // If the token is invalid, clear it
                    logout();
                }
            }
            setIsLoading(false);
        };

        checkLoggedInUser();
    }, [token]);

    /**
     * Handles user login by calling the API, and then storing the user data and token.
     */
    const login = async (email, password) => {
        try {
            const data = await loginApi(email, password);
            setUser(data.user);
            setToken(data.token);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        } catch (error) {
            // Re-throw the error so the login page can display it
            throw error;
        }
    };

    /**
     * Handles new user registration.
     */
    const register = async (userData) => {
        try {
            const data = await registerApi(userData);
            // After successful registration, you might automatically log them in
            // or just let them go to the login page. We won't log them in here.
            return data;
        } catch (error) {
            throw error;
        }
    };

    /**
     * Handles user logout by clearing state and localStorage.
     */
    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    // The value provided to the context consumers
    const value = {
        user,
        token,
        isLoading,
        login,
        logout,
        register,
    };

    // We don't render the app until we've checked for a logged-in user
    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};

/**
 * 2. Create a custom hook to use the AuthContext
 * This makes it easier to access the context from any component.
 */
export const useAuth = () => {
    return useContext(AuthContext);
};
