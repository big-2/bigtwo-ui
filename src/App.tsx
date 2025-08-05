import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Lobby from "./components/Lobby";
import RoomContainer from "./components/RoomContainer";
import Header from "./components/Header";
import { useSessionContext } from "./contexts/SessionContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./index.css"; // Ensure global styles are included

const App: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const { username, isLoading } = useSessionContext();
    const navigate = useNavigate();
    const location = useLocation();

    // Reset game state when leaving room
    useEffect(() => {
        if (!location.pathname.includes('/room/')) {
            setGameStarted(false);
        }
    }, [location.pathname]);

    // Function to handle joining a room and redirecting
    const handleJoinRoom = async (roomId: string) => {
        try {
            setError(null);
            setGameStarted(false); // Reset game state when joining a new room
            navigate(`/room/${roomId}`);
        } catch (error) {
            setError("An unexpected error occurred. Please try again.");
            console.error("Error joining room:", error);
        }
    };

    // Handle game state changes from room
    const handleGameStateChange = (started: boolean) => {
        setGameStarted(started);
    };

    // Show back button only if we're on the room page AND game hasn't started
    const showBackButton = location.pathname.includes('/room/') && !gameStarted;

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <ThemeProvider>
            <div className="app-wrapper">
                <Header username={username} showBackButton={showBackButton} />
                {error && <div className="error-message">{error}</div>}
                <main className="app-content">
                    <Routes>
                        <Route path="/" element={<Lobby onJoinRoom={handleJoinRoom} username={username} />} />
                        <Route path="/room/:roomId" element={<RoomContainer username={username} onGameStateChange={handleGameStateChange} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </ThemeProvider>
    );
};

export default App;