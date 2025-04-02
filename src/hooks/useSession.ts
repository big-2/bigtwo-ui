import { useState, useEffect, useCallback } from 'react';
import {
    createSession,
    getSession,
    UserSession
} from '../services/session';

interface UseSessionReturn {
    session: UserSession | null;
    isLoading: boolean;
    error: string | null;
    username: string;
    refreshSession: () => Promise<void>;
}

/**
 * Custom hook for session management
 */
export const useSession = (): UseSessionReturn => {
    const [session, setSession] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [username, setUsername] = useState<string>('');

    const refreshSession = useCallback(async () => {
        console.log('Refreshing session');
        try {
            setIsLoading(true);
            setError(null);

            const currentSession = await getSession();

            if (currentSession) {
                setSession(currentSession);
                setUsername(currentSession.username);
            }
        } catch (err) {
            setError('Failed to load user session.');
            console.error('Error refreshing session:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const initializeSession = useCallback(async () => {
        console.log('Initializing session');
        try {
            setIsLoading(true);
            setError(null);

            // First check if we have a valid session already
            const existingSession = await getSession();

            if (existingSession) {
                console.log('Found existing session:', existingSession.username);
                setSession(existingSession);
                setUsername(existingSession.username);
            } else {
                console.log('No existing session found, creating a new one');
                // If no session exists, generate a random username and create one
                const newSession = await createSession();
                setSession(newSession);
                setUsername(newSession.username);
            }
        } catch (err) {
            setError('Failed to initialize user session.');
            console.error('Error initializing session:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);


    // Initialize session on mount
    useEffect(() => {
        initializeSession();
    }, [initializeSession]);

    return {
        session,
        isLoading,
        error,
        username,
        refreshSession,
    };
}; 