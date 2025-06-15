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
            // Optionally trigger a page reload to re-initialize session
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export const createRoom = async (hostName: string): Promise<RoomResponse | null> => {
    try {
        console.log("Create room request with host name:", hostName);
        const response = await axios.post(`${API_URL}/room`, { host_name: hostName });
        console.log("Create room response", response.data);
        return response.data;
    } catch (error) {
        console.error("Error creating room:", error);
        return null;
    }
};

// TODO: These endpoints are not yet implemented in the Rust backend
// export const deleteRoom = async (roomId: string, hostName: string): Promise<boolean> => {
//     try {
//         const response = await axios.delete(`${API_URL}/rooms/${roomId}?host_name=${hostName}`);
//         console.log(response.data.message);
//         return true;
//     } catch (error) {
//         console.error("Error deleting room:", error);
//         return false;
//     }
// };

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

// TODO: This endpoint is not yet implemented in the Rust backend
// export const getRandomUsername = async (): Promise<string> => {
//     try {
//         const response = await axios.get(`${API_URL}/username/`);
//         return response.data.username;
//     } catch (error) {
//         console.error("Error fetching random username:", error);
//         return "jellyfish"; // Fallback if API call fails
//     }
// };
