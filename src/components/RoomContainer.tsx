import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameRoom from "./GameRoom";
import { joinRoom, RoomResponse } from "../services/api";

interface RoomContainerProps {
    username: string;
}

const RoomContainer: React.FC<RoomContainerProps> = ({ username }) => {
    const { roomId } = useParams<{ roomId: string }>();
    const [joinStatus, setJoinStatus] = useState<'loading' | 'success' | 'failed'>('loading');
    const [roomDetails, setRoomDetails] = useState<RoomResponse | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleJoinRoom = async () => {
            if (!roomId) {
                setJoinStatus('failed');
                return;
            }

            try {
                console.log(`Attempting to join room ${roomId} as ${username}`);
                const joinedRoom = await joinRoom(roomId);

                if (joinedRoom) {
                    setRoomDetails(joinedRoom);
                    setJoinStatus('success');
                    console.log(`Successfully joined room ${roomId}:`, joinedRoom);
                } else {
                    setJoinStatus('failed');
                    console.error(`Failed to join room ${roomId}`);
                }
            } catch (error) {
                console.error("Error joining room:", error);
                setJoinStatus('failed');
            }
        };

        handleJoinRoom();
    }, [roomId, username]);

    // Redirect to lobby if join failed
    useEffect(() => {
        if (joinStatus === 'failed') {
            const timer = setTimeout(() => {
                navigate("/");
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [joinStatus, navigate]);

    if (joinStatus === 'loading') {
        return <div className="loading">Joining room...</div>;
    }

    if (joinStatus === 'failed') {
        return (
            <div className="error-container">
                <h2>Unable to Join Room</h2>
                <p>Could not join room "{roomId}". Redirecting to lobby...</p>
                <button onClick={() => navigate("/")}>Return to Lobby</button>
            </div>
        );
    }

    return roomId ? (
        <GameRoom
            roomId={roomId}
            username={username}
            roomDetails={roomDetails}
        />
    ) : null;
};

export default RoomContainer;
