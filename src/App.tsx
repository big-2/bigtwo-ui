import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Alert } from "./components/ui/alert";
import Home from "./components/Home";
import RoomContainer from "./components/RoomContainer";
import Header from "./components/Header";
import { useSessionContext } from "./contexts/SessionContext";
import "./index.css"; // Ensure global styles are included

const App: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const { username, userUuid, isLoading } = useSessionContext();
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
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <p className="text-xl font-semibold">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <Header username={username} showBackButton={showBackButton} />
            <main className="flex flex-1 justify-center">
                <div className="flex w-full max-w-6xl flex-col px-4 pb-8">
                    {error && (
                        <div className="mx-auto mt-4 w-full max-w-xl">
                            <Alert variant="destructive">
                                <p>{error}</p>
                            </Alert>
                        </div>
                    )}
                    <Routes>
                        <Route path="/" element={<Home onJoinRoom={handleJoinRoom} userUuid={userUuid} />} />
                        <Route path="/room/:roomId" element={<RoomContainer username={username} onGameStateChange={handleGameStateChange} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default App;