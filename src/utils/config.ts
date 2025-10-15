const removeTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

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
