import React, { createContext, useState, useContext } from 'react';

// 1. Create the Context
const AuthContext = createContext(null);

// 2. Create the Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    /**
     * Handles user login. Its ONLY job is to update the user state.
     */
    const login = (userData) => {
        // In a real app, this would call your backend and store a token.
        // For now, we'll just set the user directly.
        setUser(userData);
    };

    /**
     * Handles user logout. It now ONLY clears the user state.
     * The component that calls this function will be responsible for navigation.
     */
    const logout = () => {
        setUser(null);
    };

    const value = {
        user,
        isAuthenticated: !!user,
        login,
        logout,
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
