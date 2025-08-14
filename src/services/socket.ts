import { getSessionId } from './session';

export const connectToRoomWebSocket = (roomId: string, playerName: string, onMessage: (msg: string) => void): WebSocket => {
    const sessionId = getSessionId();

    if (!sessionId) {
        throw new Error('No session available. Please refresh the page.');
    }

    console.log(`Connecting to WebSocket: room=${roomId}, player=${playerName}`);

    // Connect to the dedicated WebSocket endpoint with JWT in subprotocol
    const wsUrl = `ws://127.0.0.1:3000/ws/${roomId}`;

    const socket = new WebSocket(wsUrl, sessionId);

    socket.onopen = () => console.log(`WebSocket connected to room ${roomId} as ${playerName}`);
    socket.onmessage = (event) => onMessage(event.data);
    socket.onclose = () => console.warn(`Disconnected from room ${roomId}`);
    socket.onerror = (event) => console.error("WebSocket error:", event);

    return socket;
};
