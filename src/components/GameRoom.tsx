import React, { useState, useEffect, useRef } from "react";
import { connectToRoom } from "../services/socket";
import { RoomResponse } from '../services/api';
import "./GameRoom.css";
import ChatBox from "./ChatBox";
import PlayerList from "./PlayerList";
import { WebSocketMessage } from "../types.websocket";

interface UserChatMessage {
    username: string;
    message: string;
}

interface DisplayMessage {
    text: string;
    isCurrentUser: boolean;
}

interface GameRoomProps {
    roomId: string;
    username: string;
    roomDetails: RoomResponse | null;
}

// Define the type for message handlers
type MessageHandler = (message: WebSocketMessage) => void;

const GameRoom: React.FC<GameRoomProps> = ({ roomId, username, roomDetails }) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [rawMessages, setRawMessages] = useState<UserChatMessage[]>([]);
    const [players, setPlayers] = useState<string[]>([username]);  // Default to have self, update when players_list message received
    const [hostName, setHostName] = useState<string>(roomDetails?.host_name || "");

    // Message handler registry - each handler is responsible for processing one message type
    const messageHandlers = useRef<Record<string, MessageHandler>>({
        CHAT: (message) => {
            const sender = message.payload.sender as string;
            const content = message.payload.content as string;

            setRawMessages((prevMessages) => [
                ...prevMessages,
                {
                    username: sender,
                    message: content
                }
            ]);
        },

        PLAYERS_LIST: (message) => {
            const players = message.payload.players as string[];
            setPlayers(players);
        },

        LEAVE: (message) => {
            const leftPlayerName = message.payload.player as string;
            console.log(`Player left: ${leftPlayerName}`);

            setPlayers(currentPlayers =>
                currentPlayers.filter(player => player !== leftPlayerName)
            );
        },

        HOST_CHANGE: (message) => {
            const newHost = message.payload.host as string;
            console.log(`New host: ${newHost}`);
            setHostName(newHost);

            // Add a message to the chat
            if (newHost === username) {
                setRawMessages(prevMessages => [
                    ...prevMessages,
                    {
                        username: "SYSTEM",
                        message: "You are now the host of this room."
                    }
                ]);
            } else {
                setRawMessages(prevMessages => [
                    ...prevMessages,
                    {
                        username: "SYSTEM",
                        message: `${newHost} is now the host of this room.`
                    }
                ]);
            }
        },

        // Add stubs for other message types for future implementation
        MOVE: () => console.log("MOVE message received"),
        MOVE_PLAYED: () => console.log("MOVE_PLAYED message received"),
        TURN_CHANGE: () => console.log("TURN_CHANGE message received"),
        ERROR: (message) => console.error("Error from server:", message.payload.message),
        START_GAME: () => console.log("START_GAME message received"),
        GAME_STARTED: () => console.log("GAME_STARTED message received"),
    });

    // Process incoming WebSocket messages
    const processMessage = (msg: string) => {
        try {
            // JSON decode the message
            const message = JSON.parse(msg) as WebSocketMessage;

            // Get the handler for this message type
            const handler = messageHandlers.current[message.type];

            if (handler) {
                // Execute the handler if it exists
                handler(message);
            } else {
                console.log(`Unhandled message type: ${message.type}`);
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    };

    useEffect(() => {
        socketRef.current = connectToRoom(roomId, username, processMessage);

        return () => {
            socketRef.current?.close();
        };
    }, [username, roomId]);

    // Process raw messages once playerName is set and/or messages arrive
    useEffect(() => {
        if (username && rawMessages.length > 0) {
            setMessages(prevMessages => [
                ...prevMessages,
                ...rawMessages.map(msg => ({
                    text: `${msg.username}: ${msg.message}`,
                    isCurrentUser: msg.username === username
                }))
            ]);
            // Clear raw messages once they've been processed
            setRawMessages([]);
        }
    }, [rawMessages, username]); // Trigger processing when messages or the name change

    const sendChatMessage = (message: string) => {
        socketRef.current?.send(JSON.stringify({
            type: "CHAT",
            payload: {
                sender: username,
                content: message
            }
        }));
    };

    // Set the initial host name from room details when they change
    useEffect(() => {
        if (roomDetails?.host_name) {
            setHostName(roomDetails.host_name);
        }
    }, [roomDetails]);

    // Placeholder for start game handler (will be implemented by the user)
    const handleStartGame = () => {
        console.log("Start game button clicked");
        socketRef.current?.send(JSON.stringify({
            type: "START_GAME",
            payload: {}
        }));
    };

    // Determine if the current user is the host
    const isHost = username === hostName;
    // Determine if there are enough players to start the game
    const canStartGame = players.length === 4;

    return (
        <div className="game-room-wrapper">
            <div className="game-room-container wide">
                <h2 className="game-room-title">Game Room {roomId}</h2>
                <PlayerList players={players} currentPlayer={username} host={hostName} />

                {/* Start Game button - only visible to host */}
                {isHost && (
                    <div className="game-controls">
                        <button
                            className={`start-game-button ${canStartGame ? 'enabled' : 'disabled'}`}
                            onClick={handleStartGame}
                            disabled={!canStartGame}
                        >
                            {canStartGame ? 'Start Game' : 'Waiting for Players...'}
                        </button>
                    </div>
                )}

                <>
                    {/* <GameInfo currentTurn={currentTurn} />
                        <PlayerHand hand={hand} /> */}
                    {/* <MoveInput currentTurn={currentTurn} playerName={playerName} onPlayMove={playMove} /> */}
                    <ChatBox messages={messages} onSendMessage={sendChatMessage} />
                </>
            </div>
        </div>
    );
};

export default GameRoom;
