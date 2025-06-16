import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser as loginApi, registerUser as registerApi } from '../api/auth';
import { getUserProfile } from '../api/users';

// Import the secure token handling functions
import { setSecureToken, getSecureToken, clearSecureToken } from '../api/authStorage';

// 1. Create the Authentication Context
const AuthContext = createContext(null);

/**
 * The AuthProvider component manages the global authentication state,
 * using the secure in-memory token storage.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // This effect runs once when the app loads to check if a token
    // might exist from a previous session (if we decide to add persistence later).
    useEffect(() => {
        const checkUser = async () => {
            try {
                // This will throw an error if no token is available, which is expected on a fresh load.
                const token = getSecureToken();
                // If a token exists, we would verify it with the backend.
                // const profile = await getUserProfile(); 
                // setUser(profile);
            } catch (error) {
                // No token found, user is not logged in.
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        // For now, we'll just assume no user on initial load with in-memory storage.
        setIsLoading(false);
        // checkUser(); // This line would be used in a real app with token verification.
    }, []);

    const login = async (email, password) => {
        try {
            const data = await loginApi(email, password);
            // On successful login, store the token securely in memory
            setSecureToken(data.token);
            // Set the user state
            setUser(data.user);
        } catch (error) {
            // Re-throw the error so the login page can display it
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            const data = await registerApi(userData);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        // Clear the token from memory and reset the user state
        clearSecureToken();
        setUser(null);
    };

    // The value provided to the context consumers
    const value = {
        user,
        isLoading,
        login,
        logout,
        register,
    };

    // We don't render the app until we've finished the initial loading check
    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};

/**
 * 2. The custom hook to easily access the authentication context.
 */
export const useAuth = () => {
    return useContext(AuthContext);
};