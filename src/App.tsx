import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Lobby from "./components/Lobby";
import GameRoom from "./components/GameRoom";
import RoomContainer from "./components/RoomContainer";
import "./index.css"; // Ensure global styles are included

const App: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Function to handle joining a room and redirecting
    const handleJoinRoom = async (roomId: string) => {
        try {
            setError(null);
            navigate(`/room/${roomId}`);
        } catch (error) {
            setError("An unexpected error occurred. Please try again.");
            console.error("Error joining room:", error);
        }
    };

    return (
        <div className="app-wrapper">
            {error && <div className="error-message">{error}</div>}
            <Routes>
                <Route path="/" element={<Lobby onJoinRoom={handleJoinRoom} />} />
                <Route path="/room/:roomId" element={<RoomContainer playerId={1} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
};

export default App;