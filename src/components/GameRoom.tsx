import React, { useState, useEffect, useRef } from "react";
import { connectToRoom } from "../services/socket";
import { useNavigate } from 'react-router-dom';
import { deleteRoom, Room } from '../services/api';
import "./GameRoom.css";
import ChatBox from "./ChatBox";
import UserInfo from "./UserInfo";
import PlayerList from "./PlayerList";


interface GameRoomProps {
    roomId: string;
    playerId: number;
    roomDetails: Room | null;
}


const GameRoom: React.FC<GameRoomProps> = ({ roomId, playerId }) => {
    const [messages, setMessages] = useState<{ text: string, isCurrentUser: boolean }[]>([]);
    const [rawMessages, setRawMessages] = useState<string[]>([]);
    const [playerName, setPlayerName] = useState<string>("Player");
    const [hasJoined, setHasJoined] = useState<boolean>(false);
    const [room, setRoom] = useState<Room | null>(null);
    const [isOwner, setIsOwner] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const navigate = useNavigate();
    const [players, setPlayers] = useState<string[]>([]);

    useEffect(() => {
        socketRef.current = connectToRoom(roomId, (msg) => {
            if (msg.startsWith("CHAT:")) {
                setRawMessages((prevMessages) => [...prevMessages, msg]);
            }
            else if (msg.startsWith("PLAYER_NAME:")) {
                const receivedPlayerName = msg.replace("PLAYER_NAME:", "").trim();
                console.log("Received player name:", receivedPlayerName);
                setPlayerName(receivedPlayerName);
                setHasJoined(true);
            }
            else if (msg.startsWith("PLAYERS_LIST:")) {
                const playersList = msg.substring("PLAYERS_LIST:".length).split(",");
                setPlayers(playersList);
            }
            else if (msg.startsWith("LEAVE:")) {
                const leftPlayerName = msg.substring("LEAVE:".length).trim();
                console.log(`Player left: ${leftPlayerName}`);

                setPlayers(currentPlayers =>
                    currentPlayers.filter(player => player !== leftPlayerName)
                );
            }
        });

        return () => {
            socketRef.current?.close();
        };
    }, [roomId]);

    useEffect(() => {
        // Process raw messages once playerName is set and/or messages arrive
        if (playerName && rawMessages.length > 0) {
            setMessages(prevMessages => [
                ...prevMessages,
                ...rawMessages.map(msg => {
                    const messageContent = msg.replace("CHAT:", "").trim();
                    const isCurrentUser = messageContent.startsWith(playerName);
                    return { text: messageContent, isCurrentUser };
                })
            ]);
            // Clear raw messages once they've been processed
            setRawMessages([]);
        }
    }, [playerName, rawMessages]); // Trigger processing when messages or the name change

    const playMove = (move: string) => {
        socketRef.current?.send(`MOVE: ${move}`);
    };

    const sendChatMessage = (message: string) => {
        socketRef.current?.send(`CHAT: ${message}`);
    };

    // Fetch room details and determine if current player is owner
    useEffect(() => {
        const fetchRoomDetails = async () => {
            try {
                // Implement actual room details fetching
                // For now we'll use a placeholder that assumes connection to the WebSocket will provide room details
                setIsLoading(false);
                // This would be set based on actual room data received from the server
                setIsOwner(String(playerId) === room?.host_id);
            } catch (err) {
                setError('Failed to load room details');
                setIsLoading(false);
            }
        };

        fetchRoomDetails();
    }, [roomId, playerId, room?.host_id]);

    const handleDeleteRoom = async () => {
        if (!isOwner) {
            setError('Only the room owner can delete this room');
            return;
        }

        try {
            await deleteRoom(roomId, String(playerId));
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to delete room');
        }
    };

    // Add a function to handle leaving the game
    const handleLeaveGame = () => {
        // Close the WebSocket connection before navigating
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        // Navigate back to the lobby
        navigate('/');
    };

    if (isLoading) {
        return <div>Loading room...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="game-room-wrapper">
            <button
                onClick={handleLeaveGame}
                className="leave-game-btn"
            >
                Leave Game
            </button>
            <h1 className="game-title">Big Two Game</h1>
            {hasJoined && <UserInfo playerName={playerName} />}
            <div className="game-room-container wide">
                <h2 className="game-room-title">Game Room {roomId}</h2>
                <PlayerList players={players} currentPlayer={playerName} />
                <>
                    {/* <GameInfo currentTurn={currentTurn} />
                        <PlayerHand hand={hand} /> */}
                    {/* <MoveInput currentTurn={currentTurn} playerName={playerName} onPlayMove={playMove} /> */}
                    <ChatBox messages={messages} onSendMessage={sendChatMessage} />
                </>
                <div className="game-controls">
                    {isOwner && (
                        <button
                            onClick={handleDeleteRoom}
                            className="delete-room-btn"
                        >
                            Delete Room
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameRoom;
