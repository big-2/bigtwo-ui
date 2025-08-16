import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AppShell, Box, Center, Text, Alert } from "@mantine/core";
import Home from "./components/Home";
import RoomContainer from "./components/RoomContainer";
import Header from "./components/Header";
import { useSessionContext } from "./contexts/SessionContext";
import { useThemeContext } from "./contexts/ThemeContext";
import "./index.css"; // Ensure global styles are included

const App: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const { username, isLoading } = useSessionContext();
    const { theme } = useThemeContext();
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
            <Center style={{ width: '100vw', height: '100vh' }}>
                <Text size="xl">Loading...</Text>
            </Center>
        );
    }

    return (
        <AppShell
            header={{ height: 60 }}
            style={{
                minHeight: '100vh',
                backgroundColor: theme === 'light' ? '#ffffff' : undefined
            }}
        >
            <AppShell.Header>
                <Header username={username} showBackButton={showBackButton} />
            </AppShell.Header>

            <AppShell.Main>
                <Box
                    style={{
                        minHeight: 'calc(100vh - 60px)',
                        transition: 'background-color 0.3s ease'
                    }}
                >
                    {error && (
                        <Alert color="red" m="md">
                            {error}
                        </Alert>
                    )}
                    <Routes>
                        <Route path="/" element={<Home onJoinRoom={handleJoinRoom} username={username} />} />
                        <Route path="/room/:roomId" element={<RoomContainer username={username} onGameStateChange={handleGameStateChange} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Box>
            </AppShell.Main>
        </AppShell>
    );
};

export default App;