import { useState, useEffect, useCallback } from 'react';
import {
    createSession,
    hasStoredSession,
    getStoredSession,
    clearSession,
    UserSession
} from '../services/session';
import { getNormalizedApiUrl } from '../utils/config';

interface UseSessionReturn {
    session: UserSession | null;
    isLoading: boolean;
    error: string | null;
    username: string;
    userUuid: string;
    createNewSession: () => Promise<void>;
    logout: () => void;
    validateCurrentSession: () => Promise<boolean>;
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
    const [userUuid, setUserUuid] = useState<string>('');

    const createNewSession = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const newSession = await createSession();
            setSession(newSession);
            setUsername(newSession.username);
            setUserUuid(newSession.player_uuid || '');

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
        setUserUuid('');
        console.log('Session cleared');
    }, []);

    const initializeSession = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (hasStoredSession()) {
                const storedSession = getStoredSession();
                if (storedSession) {
                    // Optimistic approach: Assume stored session is valid
                    // Let axios interceptor handle validation on first actual request
                    setSession(storedSession);
                    setUsername(storedSession.username);
                    setUserUuid(storedSession.player_uuid || '');
                    console.log('Found existing session for:', storedSession.username, '(will validate on first request)');
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

    // Optional: Explicit validation method for when you need to ensure session is valid
    const validateCurrentSession = useCallback(async (): Promise<boolean> => {
        const currentSession = getStoredSession();
        if (!currentSession) return false;

        try {
            // Use environment variable for API URL, fallback to localhost for development
            const API_URL = getNormalizedApiUrl();
            const response = await fetch(`${API_URL}/session/validate`, {
                headers: {
                    'X-Session-ID': currentSession.session_id
                }
            });

            if (response.ok) {
                return true;
            } else {
                // Session invalid, clear it
                clearSession();
                setSession(null);
                setUsername('');
                setUserUuid('');
                return false;
            }
        } catch (error) {
            console.error('Error validating session:', error);
            return false;
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
        userUuid,
        createNewSession,
        logout,
        validateCurrentSession,
    };
}; 