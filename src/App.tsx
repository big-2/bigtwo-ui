import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Lobby from "./components/Lobby";
import GameRoom from "./components/GameRoom";
import RoomContainer from "./components/RoomContainer";
import Header from "./components/Header";
import { getRandomUsername } from "./services/api";
import "./index.css"; // Ensure global styles are included

const App: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [username, setUsername] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch random username on initial load
    useEffect(() => {
        const fetchUsername = async () => {
            try {
                const name = await getRandomUsername();
                setUsername(name);
            } catch (err) {
                console.error("Error fetching username:", err);
                setUsername("jellyfish"); // Fallback
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsername();
    }, []);

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

    // Check if we're on the room page to show back button
    const showBackButton = location.pathname.includes('/room/');

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="app-wrapper">
            <Header username={username} showBackButton={showBackButton} />
            {error && <div className="error-message">{error}</div>}
            <main className="app-content">
                <Routes>
                    <Route path="/" element={<Lobby onJoinRoom={handleJoinRoom} username={username} />} />
                    <Route path="/room/:roomId" element={<RoomContainer username={username} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
};

export default App;