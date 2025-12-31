import axios from "axios";
import { components } from "../types";
import { getNormalizedApiUrl } from "../utils/config";
import { clearSession } from "./session";
import { RoomStats } from "../types.stats";

const API_URL = getNormalizedApiUrl();

export type RoomResponse = components["schemas"]["RoomResponse"];

// Configure axios to include session ID from localStorage in Authorization header
axios.interceptors.request.use((config) => {
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
        config.headers['Authorization'] = `Bearer ${sessionId}`;
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

export const createRoom = async (hostUuid: string): Promise<RoomResponse | null> => {
    try {
        console.log("Creating room with host uuid:", hostUuid);
        const response = await axios.post(`${API_URL}/room`, { host_uuid: hostUuid });
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

// Bot API Types
export interface AddBotRequest {
    difficulty?: "easy" | "medium" | "hard";
}

export interface BotResponse {
    uuid: string;
    name: string;
    difficulty: "easy" | "medium" | "hard";
}

// Bot management API
export const addBotToRoom = async (
    roomId: string,
    difficulty: "easy" | "medium" | "hard" = "easy"
): Promise<BotResponse | null> => {
    try {
        console.log(`Adding ${difficulty} bot to room:`, roomId);
        const response = await axios.post(`${API_URL}/room/${roomId}/bot`, { difficulty });
        console.log("Bot added:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error adding bot:", error);
        if (axios.isAxiosError(error) && error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        return null;
    }
};

export const removeBotFromRoom = async (roomId: string, botUuid: string): Promise<boolean> => {
    try {
        console.log("Removing bot from room:", roomId, botUuid);
        await axios.delete(`${API_URL}/room/${roomId}/bot/${botUuid}`);
        console.log("Bot removed successfully");
        return true;
    } catch (error) {
        console.error("Error removing bot:", error);
        if (axios.isAxiosError(error) && error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        return false;
    }
};

/**
 * Fetch current stats for a room
 * GET /room/{room_id}/stats
 */
export const getRoomStats = async (roomId: string): Promise<RoomStats | null> => {
    try {
        const response = await axios.get<RoomStats>(`${API_URL}/room/${roomId}/stats`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            // No stats yet for this room
            return null;
        }
        console.error('Failed to fetch room stats:', error);
        throw error;
    }
};

/**
 * Get the number of players currently online (connected via WebSocket)
 * GET /online
 */
export interface OnlinePlayersResponse {
    online_players: number;
}

export const getOnlinePlayers = async (): Promise<number | null> => {
    try {
        const response = await axios.get<OnlinePlayersResponse>(`${API_URL}/online`);
        return response.data.online_players;
    } catch (error) {
        console.error('Failed to fetch online players:', error);
        return null;
    }
};
