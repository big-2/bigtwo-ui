import { getNormalizedWsUrl } from '../utils/config';
import { getSessionId } from './session';

export const connectToRoomWebSocket = (roomId: string, playerName: string, onMessage: (msg: string) => void): WebSocket => {
    const sessionId = getSessionId();

    if (!sessionId) {
        throw new Error('No session available. Please refresh the page.');
    }

    if (import.meta.env.DEV) {
        console.log(`Connecting to WebSocket: room=${roomId}, player=${playerName}`);
    }

    const WS_BASE_URL = getNormalizedWsUrl();
    const wsUrl = `${WS_BASE_URL}/ws/${roomId}`;

    if (import.meta.env.DEV) {
        console.log(`WebSocket URL: ${wsUrl}`);
    }

    const socket = new WebSocket(wsUrl, sessionId);

    socket.onopen = () => console.log(`WebSocket connected to room ${roomId} as ${playerName}`);
    socket.onmessage = (event) => onMessage(event.data);
    socket.onclose = () => console.warn(`Disconnected from room ${roomId}`);
    socket.onerror = (event) => console.error("WebSocket error:", event);

    return socket;
};
