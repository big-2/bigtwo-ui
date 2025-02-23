import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export interface User {
    id: number;
    username: string;
}

export interface Room {
    id: string;
    host_id: number;
    host_username: string;
    status: string;
    message: string;
}

export interface JoinRoomResponse {
    username: string;
}

export const createUser = async (username: string, password: string): Promise<User> => {
    const response = await axios.post(`${API_URL}/users/`, { username, password });
    return response.data;
};

export const createRoom = async (hostId: number): Promise<Room | null> => {
    try {
        console.log("Create room request", hostId);
        const response = await axios.post(`${API_URL}/rooms/`, { host_id: hostId });
        console.log("Create room response", response.data);
        return response.data;
    } catch (error) {
        console.error("Error creating room:", error);
        return null;
    }
};

export const deleteRoom = async (roomId: string): Promise<boolean> => {
    try {
        const response = await axios.delete(`${API_URL}/rooms/${roomId}`);
        console.log(response.data.message);
        return true;
    } catch (error) {
        console.error("Error deleting room:", error);
        return false;
    }
};

export const getRooms = async (): Promise<Room[]> => {
    const response = await axios.get(`${API_URL}/rooms/`);
    return response.data;
};

export const joinRoom = async (roomId: string): Promise<JoinRoomResponse> => {
    try {
        console.log("Join room request", roomId);
        const response = await axios.post(`${API_URL}/rooms/${roomId}/join`, { host_id: 1 });
        console.log("Join room response", response.data);
        return response.data;
    } catch (error) {
        console.error("Error joining room:", error);
        throw new Error("Failed to join room.");
    }
};
