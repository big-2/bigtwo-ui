import React, { createContext, useContext, ReactNode } from 'react';
import { useSession } from '../hooks/useSession';
import { UserSession } from '../services/session';

// Define the shape of our context
interface SessionContextType {
    session: UserSession | null;
    isLoading: boolean;
    error: string | null;
    username: string;
    userUuid: string;
    createNewSession: () => Promise<void>;
    logout: () => void;
}

// Create the context with a default value
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Props for the provider component
interface SessionProviderProps {
    children: ReactNode;
}

/**
 * SessionProvider component to wrap around your app
 * This makes session data available to all components
 */
export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
    // Use our session hook to manage the session state
    const sessionData = useSession();

    return (
        <SessionContext.Provider value={sessionData}>
            {children}
        </SessionContext.Provider>
    );
};

/**
 * Custom hook to use the session context
 * This is what components will use to access session data
 */
export const useSessionContext = (): SessionContextType => {
    const context = useContext(SessionContext);

    if (context === undefined) {
        throw new Error('useSessionContext must be used within a SessionProvider');
    }

    return context;
}; 