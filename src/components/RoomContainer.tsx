import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameRoom from "./GameRoom";
import { getRooms, RoomResponse } from "../services/api";

interface RoomContainerProps {
    username: string;
}

const RoomContainer: React.FC<RoomContainerProps> = ({ username }) => {
    const { roomId } = useParams<{ roomId: string }>();
    const [isValidRoom, setIsValidRoom] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [roomDetails, setRoomDetails] = useState<RoomResponse | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const validateRoom = async () => {
            if (!roomId) {
                setIsValidRoom(false);
                setIsLoading(false);
                return;
            }

            try {
                const rooms = await getRooms();
                const room = rooms.find(room => room.id === roomId);

                if (room) {
                    setRoomDetails(room);
                    setIsValidRoom(true);
                } else {
                    setIsValidRoom(false);
                    console.error(`Room ${roomId} does not exist`);
                }

                setIsLoading(false);
            } catch (error) {
                console.error("Error validating room:", error);
                setIsValidRoom(false);
                setIsLoading(false);
            }
        };

        validateRoom();
    }, [roomId]);

    // Handle redirect if room is invalid
    useEffect(() => {
        if (isValidRoom === false && !isLoading) {
            const timer = setTimeout(() => {
                navigate("/");
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [isValidRoom, isLoading, navigate]);

    if (isLoading) {
        return <div className="loading">Loading room...</div>;
    }

    if (isValidRoom === false) {
        return (
            <div className="error-container">
                <h2>Room Not Found</h2>
                <p>The room "{roomId}" does not exist. Redirecting to lobby...</p>
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
