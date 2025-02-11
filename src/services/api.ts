import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export interface User {
    id: number;
    username: string;
}

export interface Room {
    id: number;
    host_id: number;
    status: string;
}

export const createUser = async (username: string, password: string): Promise<User> => {
    const response = await axios.post(`${API_URL}/users/`, { username, password });
    return response.data;
};

export const createRoom = async (hostId: number): Promise<Room | null> => {
    try {
        console.log("Creating room...");
        const response = await axios.post(`${API_URL}/rooms/`, { host_id: hostId });
        console.log("Room created:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error creating room:", error);
        return null;
    }
};


export const getRooms = async (): Promise<Room[]> => {
    const response = await axios.get(`${API_URL}/rooms/`);
    return response.data;
};
