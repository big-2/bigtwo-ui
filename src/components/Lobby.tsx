import React, { useState, useEffect } from "react";
import { createRoom, getRooms, RoomResponse } from "../services/api";
import "./Lobby.css";

interface LobbyProps {
    onJoinRoom: (roomId: string) => void;
    username: string;
}

const Lobby: React.FC<LobbyProps> = ({ onJoinRoom, username }) => {
    const [rooms, setRooms] = useState<RoomResponse[]>([]);

    useEffect(() => {
        const fetchRooms = async () => {
            setRooms(await getRooms());
        };
        fetchRooms();

        // Refresh rooms list periodically
        const interval = setInterval(fetchRooms, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateRoom = async () => {
        const newRoom = await createRoom(username);
        if (newRoom) {
            setRooms([...rooms, newRoom]);
            console.log("Rooms:", rooms);
            onJoinRoom(newRoom.id);
        };
    }

    return (
        <div className="lobby-wrapper">
            <div className="lobby-container wide">
                <h2 className="lobby-title">Available Rooms</h2>
                <button className="create-room-button" onClick={handleCreateRoom}>Create Room</button>
                <ul className="room-list">
                    {rooms.map((room) => (
                        <li key={room.id} className="room-item">
                            <span>{room.id} - {room.status} ({room.player_count}/4 Players)</span>
                            <button className="join-room-button" onClick={() => onJoinRoom(room.id)}>Join</button>
                        </li>
                    ))}
                    {rooms.length === 0 && (
                        <li className="room-item empty-message">No available rooms. Create one!</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Lobby;
