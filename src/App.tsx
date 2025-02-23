import React, { useState, useEffect } from "react";
import Lobby from "./components/Lobby";
import GameRoom from "./components/GameRoom";
import "./index.css"; // Ensure global styles are included

const App: React.FC = () => {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null); // State for error messages

    // Function to handle joining and retrieving player name when roomId is set
    const handleJoinRoom = async (roomId: string) => {
        try {
            setRoomId(roomId);
            setError(null); // Clear error if successful
            console.log("Set player name and roomId");
        } catch (error) {
            setError("An unexpected error occurred. Please try again."); // Set error message
            console.error("Error joining room:", error);
        }
    };

    useEffect(() => {
        // Reset playerName and error when roomId is null
        if (roomId === null) {
            setError(null);
        }
    }, [roomId]);

    return (
        <div className="app-wrapper">
            {error && <div className="error-message">{error}</div>} {/* Render error message */}
            {roomId ? (
                <GameRoom roomId={roomId} playerId={1} />
            ) : (
                <Lobby onJoinRoom={handleJoinRoom} />
            )}
        </div>
    );
};

export default App;