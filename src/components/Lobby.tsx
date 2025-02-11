import React, { useState, useEffect } from "react";
import "./GameRoom.css";
import "./Lobby.css";
import { createRoom, getRooms, Room } from "../services/api";

interface LobbyProps {
    onJoinRoom: (roomId: number) => void;
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
        }
    };

    return (
        <div className="lobby-wrapper">
            <h1 className="game-title">Big Two Game</h1>
            <div className="lobby-container">
                <h2 className="lobby-title">Available Rooms</h2>
                <button className="create-room-button" onClick={handleCreateRoom}>Create Room</button>
                <ul className="room-list">
                    {rooms.map((room) => (
                        <li key={room.id} className="room-item">
                            <span>Room {room.id} - {room.status}</span>
                            <button className="join-room-button" onClick={() => onJoinRoom(room.id)}>Join</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Lobby;
