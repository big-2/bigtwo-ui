import axios from "axios";
import { components } from "../types";
import { clearSession } from "./session";

const API_URL = "http://localhost:3000";

export type RoomResponse = components["schemas"]["RoomResponse"];

// Configure axios to include session ID from localStorage in headers
axios.interceptors.request.use((config) => {
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
        config.headers['X-Session-ID'] = sessionId;
    }
    return config;
});

// Handle JWT token expiration
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('JWT token expired or invalid, clearing session');
            clearSession();
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export const createRoom = async (hostName: string): Promise<RoomResponse | null> => {
    try {
        console.log("Creating room with host name:", hostName);
        const response = await axios.post(`${API_URL}/room`, { host_name: hostName });
        console.log("Room created:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error creating room:", error);
        return null;
    }
};

export const joinRoom = async (roomId: string): Promise<RoomResponse | null> => {
    try {
        console.log("Joining room:", roomId);
        const response = await axios.post(`${API_URL}/room/${roomId}/join`, {});
        console.log("Joined room:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error joining room:", error);

        // Log detailed error information for debugging
        if (axios.isAxiosError(error) && error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
            console.error("Response headers:", error.response.headers);
        }

        return null;
    }
};

export const getRooms = async (): Promise<RoomResponse[]> => {
    try {
        const response = await axios.get(`${API_URL}/rooms`);
        // Filter out rooms that are full (4 players)
        return response.data.filter((room: RoomResponse) => room.player_count < 4);
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return [];
    }
};

export const getRoomDetails = async (roomId: string): Promise<RoomResponse | null> => {
    // Call GET /room/{roomId} - no auth required
    try {
        const response = await axios.get(`${API_URL}/room/${roomId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching room details:", error);
        return null;
    }
}
