const URL = "ws://127.0.0.1:8000/ws/";

export const connectToRoom = (roomId: string, playerName: string, onMessage: (msg: string) => void): WebSocket => {
    const socket = new WebSocket(`${URL}${roomId}/${playerName}`);

    socket.onopen = () => console.log(`Connected to room ${roomId} as ${playerName}`);
    socket.onmessage = (event) => onMessage(event.data);
    socket.onclose = () => console.warn(`Disconnected from room ${roomId}`);
    socket.onerror = (event) => console.error("WebSocket error:", event);

    return socket;
};
