import React, { useState, useEffect, useRef } from "react";
import { connectToRoomWebSocket } from "../services/socket";
import { getStoredSession } from "../services/session";
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
    const [uuidToName, setUuidToName] = useState<Record<string, string>>({});
    const [hostName, setHostName] = useState<string>(roomDetails?.host_name || "");
    const [gameStarted, setGameStarted] = useState(false);
    const [gameData, setGameData] = useState<{ cards: string[], currentTurn: string, playerList: string[] } | null>(null);
    const [selfUuid, setSelfUuid] = useState<string>("");

    // Notify parent when game state changes
    useEffect(() => {
        onGameStateChange?.(gameStarted);
    }, [gameStarted, onGameStateChange]);

    // WebSocket message handlers
    const messageHandlers = useRef<Record<string, MessageHandler>>({
        CHAT: (message) => {
            const senderUuid = (message.payload as any).sender_uuid as string;
            const content = (message.payload as any).content as string;

            setRawMessages((prevMessages) => [
                ...prevMessages,
                {
                    username: uuidToName[senderUuid] || senderUuid,
                    message: content
                }
            ]);
        },

        PLAYERS_LIST: (message) => {
            const mapping = (message.payload as any).mapping as Record<string, string> | undefined;
            if (mapping) {
                setUuidToName(mapping);
                const foundSelf = Object.keys(mapping).find((uuid) => mapping[uuid] === username);
                if (foundSelf) setSelfUuid(foundSelf);
            }
        },

        LEAVE: (message) => {
            const leftPlayerUuid = (message.payload as any).player as string;
            console.log(`Player left: ${leftPlayerUuid}`);

            setUuidToName(currentMapping => {
                const newMapping = { ...currentMapping };
                delete newMapping[leftPlayerUuid];
                return newMapping;
            });
        },

        HOST_CHANGE: (message) => {
            const newHost = (message.payload as any).host as string;
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
            const cards = (message.payload as any).cards as string[];
            const currentTurn = (message.payload as any).current_turn as string;
            const playerList = (message.payload as any).player_list as string[];
            setGameData({ cards, currentTurn, playerList });
            setGameStarted(true);
        },

        // Game message handlers
        MOVE: () => console.log("MOVE message received"),
        MOVE_PLAYED: () => console.log("MOVE_PLAYED message received"),
        TURN_CHANGE: () => console.log("TURN_CHANGE message received"),
        ERROR: (message) => console.error("Error from server:", (message.payload as any).message),
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
        // Prefer uuid-based identity for socket protocol when available
        const stored = getStoredSession();
        const identity = stored?.player_uuid || username;
        socketRef.current = connectToRoomWebSocket(roomId, identity, processMessage);

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
                sender_uuid: selfUuid || username,
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

    // Check if current user is the host using UUID mapping
    // Find the UUID that maps to the current username and see if that UUID maps to the host
    const currentUserUuid = selfUuid || Object.keys(uuidToName).find(uuid => uuidToName[uuid] === username);
    const hostUuid = Object.keys(uuidToName).find(uuid => uuidToName[uuid] === hostName);
    const isHost = currentUserUuid && hostUuid && currentUserUuid === hostUuid;
    const canStartGame = Object.keys(uuidToName).length === 4;

    const handleReturnToLobby = () => {
        console.log("Returning to lobby after game");
        setGameStarted(false);
        setGameData(null);
    };

    // If game has started, show the GameScreen (only after we know self uuid for consistent identity)
    if (gameStarted && gameData && (selfUuid || Object.keys(uuidToName).find((uuid) => uuidToName[uuid] === username))) {
        return (
            <GameScreen
                username={username}
                uuid={selfUuid || Object.keys(uuidToName).find((uuid) => uuidToName[uuid] === username) || username}
                socket={socketRef.current}
                initialGameData={gameData}
                mapping={uuidToName}
                onReturnToLobby={handleReturnToLobby}
            />
        );
    }

    // Otherwise show the home/room interface
    return (
        <Container size="lg" py="xl" style={{ minHeight: 'calc(100vh - 60px)' }}>
            <Stack align="center" gap="lg" style={{ maxWidth: 1000, margin: '0 auto' }}>
                <Title order={2} c="blue">Game Room {roomId}</Title>

                <PlayerList players={Object.keys(uuidToName)} currentPlayer={username} host={hostName} mapping={uuidToName} />

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
