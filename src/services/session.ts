import axios from 'axios';

const API_URL = "https://127.0.0.1:8000";
const SESSION_STORAGE_KEY = 'session_id';

export interface UserSession {
    id: string;
    username: string;
    created_at: string;
    expires_at: string;
}

/**
 * Creates a new user session with the provided username or uses a randomly generated one
 */
export const createSession = async (username?: string): Promise<UserSession> => {
    try {
        const url = username
            ? `${API_URL}/session/?username=${encodeURIComponent(username)}`
            : `${API_URL}/session/`;

        const response = await axios.post(url);
        const session = response.data;

        // Store the session ID in localStorage
        localStorage.setItem(SESSION_STORAGE_KEY, session.id);

        return session;
    } catch (error) {
        console.error('Error creating session:', error);
        throw new Error('Failed to create user session');
    }
};

/**
 * Gets the current user session if it exists
 */
export const getSession = async (): Promise<UserSession | null> => {
    try {
        const sessionId = getSessionId();
        if (!sessionId) {
            return null;
        }

        const response = await axios.get(`${API_URL}/session/`, {
            headers: {
                'X-Session-ID': sessionId
            }
        });
        return response.data;
    } catch (error) {
        // If 401 Unauthorized, the session is invalid or expired - expected flow
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            // Clear invalid session from localStorage
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }

        // Other errors are actual problems
        console.error('Error getting session:', error);
        throw new Error('Failed to get user session');
    }
};

/**
 * Deletes the current user session
 */
export const deleteSession = async (): Promise<void> => {
    try {
        const sessionId = getSessionId();
        if (sessionId) {
            await axios.delete(`${API_URL}/session/`, {
                headers: {
                    'X-Session-ID': sessionId
                }
            });
        }

        // Clear session from localStorage
        localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
        console.error('Error deleting session:', error);
        throw new Error('Failed to delete user session');
    }
};

/**
 * Gets session ID from localStorage
 */
export const getSessionId = (): string | null => {
    return localStorage.getItem(SESSION_STORAGE_KEY);
};

// Convenience function for setting axios defaults
export const configureAxiosDefaults = (): void => {
    axios.defaults.withCredentials = true;
    console.log('Configuring axios defaults');

    // No need for manually setting cookies in interceptors 
    // as withCredentials:true will automatically send cookies
}; 