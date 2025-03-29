import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

// Define theme type
type ThemeMode = 'dark' | 'light';

// Define the shape of our context
interface ThemeContextType {
    theme: ThemeMode;
    toggleTheme: () => void;
}

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Props for the provider component
interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * ThemeProvider component to wrap around your app
 * This makes theme data available to all components
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Use localStorage to persist theme preference
    const [theme, setTheme] = useState<ThemeMode>(() => {
        const savedTheme = localStorage.getItem('theme');
        return (savedTheme === 'light' ? 'light' : 'dark') as ThemeMode;
    });

    // Toggle theme function
    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            return newTheme;
        });
    };

    // Apply theme to the document when it changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

/**
 * Custom hook to use the theme context
 * This is what components will use to access theme data
 */
export const useThemeContext = (): ThemeContextType => {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }

    return context;
}; 