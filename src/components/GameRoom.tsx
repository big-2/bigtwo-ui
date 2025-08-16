import React, { useState, useEffect, useRef } from "react";
import { connectToRoomWebSocket } from "../services/socket";
import { RoomResponse } from '../services/api';
import { Container, Stack, Title, Button, Center } from "@mantine/core";
import ChatBox from "./ChatBox";
import PlayerList from "./PlayerList";
import GameScreen from "./GameScreen";
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
    onGameStateChange?: (gameStarted: boolean) => void;
}

type MessageHandler = (message: WebSocketMessage) => void;

const GameRoom: React.FC<GameRoomProps> = ({ roomId, username, roomDetails, onGameStateChange }) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [rawMessages, setRawMessages] = useState<UserChatMessage[]>([]);
    const [players, setPlayers] = useState<string[]>([username]);
    const [hostName, setHostName] = useState<string>(roomDetails?.host_name || "");
    const [gameStarted, setGameStarted] = useState(false);
    const [gameData, setGameData] = useState<{ cards: string[], currentTurn: string, playerList: string[] } | null>(null);

    // Notify parent when game state changes
    useEffect(() => {
        onGameStateChange?.(gameStarted);
    }, [gameStarted, onGameStateChange]);

    // WebSocket message handlers
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

            // Add system message to chat
            const systemMessage = newHost === username
                ? "You are now the host of this room."
                : `${newHost} is now the host of this room.`;

            setRawMessages(prevMessages => [
                ...prevMessages,
                {
                    username: "SYSTEM",
                    message: systemMessage
                }
            ]);
        },
        GAME_STARTED: (message) => {
            console.log("GAME_STARTED message received", message.payload);
            const cards = message.payload.cards as string[];
            const currentTurn = message.payload.current_turn as string;
            const playerList = message.payload.player_list as string[];
            setGameData({ cards, currentTurn, playerList });
            setGameStarted(true);
        },

        // Game message handlers
        MOVE: () => console.log("MOVE message received"),
        MOVE_PLAYED: () => console.log("MOVE_PLAYED message received"),
        TURN_CHANGE: () => console.log("TURN_CHANGE message received"),
        ERROR: (message) => console.error("Error from server:", message.payload.message),
    });

    const processMessage = (msg: string) => {
        try {
            const message = JSON.parse(msg) as WebSocketMessage;
            const handler = messageHandlers.current[message.type];

            if (handler) {
                handler(message);
            } else {
                console.log(`Unhandled message type: ${message.type}`);
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    };

    // Establish WebSocket connection
    useEffect(() => {
        console.log(`Establishing WebSocket connection to room ${roomId}...`);
        socketRef.current = connectToRoomWebSocket(roomId, username, processMessage);

        return () => {
            console.log(`Closing WebSocket connection to room ${roomId}`);
            socketRef.current?.close();
        };
    }, [username, roomId]);

    // Process chat messages
    useEffect(() => {
        if (username && rawMessages.length > 0) {
            setMessages(prevMessages => [
                ...prevMessages,
                ...rawMessages.map(msg => ({
                    text: `${msg.username}: ${msg.message}`,
                    isCurrentUser: msg.username === username
                }))
            ]);
            setRawMessages([]);
        }
    }, [rawMessages, username]);

    // Update host name from room details
    useEffect(() => {
        if (roomDetails?.host_name) {
            setHostName(roomDetails.host_name);
        }
    }, [roomDetails]);

    const sendChatMessage = (message: string) => {
        socketRef.current?.send(JSON.stringify({
            type: "CHAT",
            payload: {
                sender: username,
                content: message
            }
        }));
    };

    const handleStartGame = () => {
        console.log("Start game button clicked");
        socketRef.current?.send(JSON.stringify({
            type: "START_GAME",
            payload: {}
        }));
    };

    const isHost = username === hostName;
    const canStartGame = players.length === 4;

    // If game has started, show the GameScreen
    if (gameStarted && gameData) {
        return (
            <GameScreen
                username={username}
                socket={socketRef.current}
                initialGameData={gameData}
            />
        );
    }

    // Otherwise show the home/room interface
    return (
        <Container size="lg" py="xl" style={{ minHeight: 'calc(100vh - 60px)' }}>
            <Stack align="center" gap="lg" style={{ maxWidth: 1000, margin: '0 auto' }}>
                <Title order={2} c="blue">Game Room {roomId}</Title>

                <PlayerList players={players} currentPlayer={username} host={hostName} />

                {isHost && (
                    <Center>
                        <Button
                            size="lg"
                            color={canStartGame ? 'green' : 'gray'}
                            onClick={handleStartGame}
                            disabled={!canStartGame}
                            style={{
                                width: 200,
                                transform: canStartGame ? 'none' : 'none',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {canStartGame ? 'Start Game' : 'Waiting for Players...'}
                        </Button>
                    </Center>
                )}

                <ChatBox messages={messages} onSendMessage={sendChatMessage} />
            </Stack>
        </Container>
    );
};

export default GameRoom;
