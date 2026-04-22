const removeTrailingSlash = (url: string): string => url.replace(/\/+$/, '');
const CARD_FLIGHT_ANIMATION_STORAGE_KEY = 'bigtwo.cardFlightAnimations';

export const assertEnvValue = (value: string | undefined, name: string): string => {
    if (!value || value.trim().length === 0) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
};

export const normalizeUrl = (value: string | undefined, fallback: string): string => {
    const trimmed = value?.trim();
    const source = trimmed && trimmed.length > 0 ? trimmed : fallback;
    return removeTrailingSlash(source);
};

export const getNormalizedApiUrl = (): string => {
    return normalizeUrl(import.meta.env.VITE_API_URL, 'http://localhost:3000');
};

export const getNormalizedWsUrl = (): string => {
    return normalizeUrl(import.meta.env.VITE_WS_URL, 'ws://127.0.0.1:3000');
};

const parseBooleanSetting = (value: string | undefined | null): boolean | null => {
    if (value === undefined || value === null) {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
        return false;
    }

    return null;
};

const getStoredCardFlightAnimationOverride = (): boolean | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return parseBooleanSetting(window.localStorage.getItem(CARD_FLIGHT_ANIMATION_STORAGE_KEY));
    } catch {
        return null;
    }
};

export const isCardFlightAnimationEnabled = (): boolean => {
    const localOverride = getStoredCardFlightAnimationOverride();

    if (localOverride !== null) {
        return localOverride;
    }

    return parseBooleanSetting(import.meta.env.VITE_CARD_FLIGHT_ANIMATIONS) ?? true;
};

export const validateEnvironment = (): void => {
    if (import.meta.env.DEV) {
        return;
    }

    const apiUrl = assertEnvValue(import.meta.env.VITE_API_URL, 'VITE_API_URL');
    const wsUrl = assertEnvValue(import.meta.env.VITE_WS_URL, 'VITE_WS_URL');

    // Warn if production URLs don't use secure protocols
    if (!apiUrl.startsWith('https://')) {
        console.warn('WARNING: VITE_API_URL should use HTTPS in production for secure communication');
    }

    if (!wsUrl.startsWith('wss://')) {
        console.warn('WARNING: VITE_WS_URL should use WSS (WebSocket Secure) in production for secure communication');
    }
};
