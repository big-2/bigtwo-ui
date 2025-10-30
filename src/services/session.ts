import axios from 'axios';

import { getNormalizedApiUrl } from '../utils/config';

const API_URL = getNormalizedApiUrl();
const SESSION_STORAGE_KEY = 'session_id';

export interface UserSession {
    session_id: string;
    username: string;
}

interface JWTPayload {
    session_id: string;
    username: string;
    exp: number;
    iat: number;
}

/**
 * Safely decode JWT payload without signature verification
 * This is only for extracting username - server will validate the token
 */
const decodeJWTPayload = (token: string): JWTPayload | null => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded) as JWTPayload;
    } catch (error) {
        console.error('Error decoding JWT payload:', error);
        return null;
    }
};

/**
 * Creates a new user session with the provided username or uses a randomly generated one
 */
export const createSession = async (): Promise<UserSession> => {
    try {
        const response = await axios.post(`${API_URL}/session`);
        const session = response.data as { session_id: string; username: string };

        // Store the session ID in localStorage
        localStorage.setItem(SESSION_STORAGE_KEY, session.session_id);

        return session;
    } catch (error) {
        console.error('Error creating session:', error);
        throw new Error('Failed to create user session');
    }
};

/**
 * Gets session ID from localStorage
 */
export const getSessionId = (): string | null => {
    return localStorage.getItem(SESSION_STORAGE_KEY);
};

/**
 * Gets stored session with username extracted from JWT token
 */
export const getStoredSession = (): UserSession | null => {
    const sessionId = getSessionId();
    if (!sessionId) return null;

    const payload = decodeJWTPayload(sessionId);
    if (!payload || !payload.username) return null;

    return {
        session_id: sessionId,
        username: payload.username,
    };
};

/**
 * Clears session from localStorage
 */
export const clearSession = (): void => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
};

/**
 * Checks if a JWT token is expired client-side
 * Returns true if expired, false if still valid, null if can't determine
 */
const isJWTExpired = (token: string): boolean | null => {
    try {
        const payload = decodeJWTPayload(token);
        if (!payload || !payload.exp) return null;

        // exp is in seconds, Date.now() is in milliseconds
        const isExpired = payload.exp * 1000 < Date.now();
        return isExpired;
    } catch (error) {
        console.error('Error checking JWT expiration:', error);
        return null;
    }
};

/**
 * Checks if we have a valid session token stored locally
 * Now includes client-side expiration check
 */
export const hasStoredSession = (): boolean => {
    const sessionId = getSessionId();
    if (!sessionId || sessionId.length === 0) return false;

    // Check if token is expired client-side first
    const expired = isJWTExpired(sessionId);
    if (expired === true) {
        console.log('Stored JWT token is expired');
        return false;
    }

    return true;
}; 