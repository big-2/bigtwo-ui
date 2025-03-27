import { getSessionId } from './session';

const URL = `wss://127.0.0.1:8000/ws/`;

export const connectToRoom = (roomId: string, playerName: string, onMessage: (msg: string) => void): WebSocket => {
    // Include the session_id in the WebSocket connection to maintain identity
    const sessionId = getSessionId();
    const queryParams = `player_name=${encodeURIComponent(playerName)}${sessionId ? `&session_id=${sessionId}` : ''}`;

    console.log(`Connecting to WebSocket with params: player_name=${playerName}, session_id=${sessionId || 'none'}`);

    const socket = new WebSocket(`${URL}${roomId}?${queryParams}`);

    socket.onopen = () => console.log(`Connected to room ${roomId} as ${playerName} with session ${sessionId || 'none'}`);
    socket.onmessage = (event) => onMessage(event.data);
    socket.onclose = () => console.warn(`Disconnected from room ${roomId}`);
    socket.onerror = (event) => console.error("WebSocket error:", event);

    return socket;
};
