import { useState, useEffect, useCallback } from 'react';
import {
    createSession,
    hasStoredSession,
    getStoredSession,
    clearSession,
    UserSession
} from '../services/session';

interface UseSessionReturn {
    session: UserSession | null;
    isLoading: boolean;
    error: string | null;
    username: string;
    createNewSession: () => Promise<void>;
    logout: () => void;
}

/**
 * Custom hook for JWT-based session management
 * Since JWT tokens are stateless, we only store them locally and let the server validate them
 */
export const useSession = (): UseSessionReturn => {
    const [session, setSession] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [username, setUsername] = useState<string>('');

    const createNewSession = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const newSession = await createSession();
            setSession(newSession);
            setUsername(newSession.username);

            console.log('New session created:', newSession.username);
        } catch (err) {
            setError('Failed to create user session.');
            console.error('Error creating session:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        clearSession();
        setSession(null);
        setUsername('');
        console.log('Session cleared');
    }, []);

    const initializeSession = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (hasStoredSession()) {
                const storedSession = getStoredSession();
                if (storedSession) {
                    setSession(storedSession);
                    setUsername(storedSession.username);
                    console.log('Found existing session for:', storedSession.username);
                } else {
                    console.log('Invalid stored session, creating a new one');
                    await createNewSession();
                }
            } else {
                console.log('No existing session found, creating a new one');
                await createNewSession();
            }
        } catch (err) {
            setError('Failed to initialize user session.');
            console.error('Error initializing session:', err);
        } finally {
            setIsLoading(false);
        }
    }, [createNewSession]);

    // Initialize session on mount
    useEffect(() => {
        initializeSession();
    }, [initializeSession]);

    return {
        session,
        isLoading,
        error,
        username,
        createNewSession,
        logout,
    };
}; 