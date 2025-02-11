// GameRoom.tsx
import React, { useState, useEffect, useRef } from "react";
import { connectToRoom } from "../services/socket";
import "./GameRoom.css";

interface GameRoomProps {
    roomId: number;
}

const GameRoom: React.FC<GameRoomProps> = ({ roomId }) => {
    const [messages, setMessages] = useState<string[]>([]);
    const socketRef = useRef<WebSocket | null>(null);
    const [playerName, setPlayerName] = useState<string>("");
    const [isConnected, setIsConnected] = useState<boolean>(false);

    useEffect(() => {
        if (isConnected && playerName) {
            socketRef.current = connectToRoom(roomId.toString(), playerName, (msg) => {
                setMessages((prev) => [...prev, msg]);
            });

            return () => socketRef.current?.close();
        }
    }, [isConnected, roomId, playerName]);

    const handleJoinGame = () => {
        if (playerName.trim() !== "" && !isConnected) {
            setIsConnected(true);
        }
    };

    const sendMessage = () => {
        socketRef.current?.send("Hello from " + playerName);
    };

    return (
        <div className="game-room-wrapper">
            <h1 className="game-title">Big Two Game</h1>
            <div className="game-room-container wide">
                <h2 className="game-room-title">Game Room {roomId}</h2>
                {isConnected ? (
                    <>
                        <button className="game-button" onClick={sendMessage}>Send Test Move</button>
                        <ul className="messages-list">
                            {messages.map((msg, index) => (
                                <li key={index} className="message-item">{msg}</li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <form
                        className="join-form"
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleJoinGame();
                        }}
                    >
                        <input
                            type="text"
                            className="name-input"
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                        />
                        <button className="join-button" type="submit">Join Game</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default GameRoom;
