import React, { useState, useEffect } from "react";
import { createRoom, getRooms, deleteRoom, Room } from "../services/api";
import "./Lobby.css";

interface LobbyProps {
    onJoinRoom: (roomId: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onJoinRoom }) => {
    const [rooms, setRooms] = useState<Room[]>([]);

    useEffect(() => {
        const fetchRooms = async () => {
            setRooms(await getRooms());
        };
        fetchRooms();
    }, []);

    const handleCreateRoom = async () => {
        const newRoom = await createRoom(1); // Assuming user ID is 1 for now
        if (newRoom) {
            setRooms([...rooms, newRoom]);
            console.log("Rooms:", rooms);
            onJoinRoom(newRoom.id);
        };
    }

    const handleDeleteRoom = async (roomId: string) => {
        const success = await deleteRoom(roomId);
        if (success) {
            setRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId));
        }
    };

    return (
        <div className="lobby-wrapper">
            <h1 className="game-title">Big Two Game</h1>
            <div className="lobby-container wide">
                <h2 className="lobby-title">Available Rooms</h2>
                <button className="create-room-button" onClick={handleCreateRoom}>Create Room</button>
                <ul className="room-list">
                    {rooms.map((room) => (
                        <li key={room.id} className="room-item">
                            <span>{room.id} - {room.status}</span>
                            <button className="join-room-button" onClick={() => onJoinRoom(room.id)}>Join</button>
                            <button className="delete-room-button" onClick={() => handleDeleteRoom(room.id)}>
                                ❌ Delete
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Lobby;
