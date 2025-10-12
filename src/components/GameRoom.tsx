import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { connectToRoomWebSocket } from "../services/socket";
import { getStoredSession } from "../services/session";
import { RoomResponse } from '../services/api';
import { Container, Stack, Title, Button, Center } from "@mantine/core";
import ChatBox from "./ChatBox";
import PlayerList from "./PlayerList";
import GameScreen from "./GameScreen";
import { WebSocketMessage } from "../types.websocket";

interface UserChatMessage {
    senderUuid: string;
    content: string;
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
    const [chatMessages, setChatMessages] = useState<UserChatMessage[]>([]);
    const [uuidToName, setUuidToName] = useState<Record<string, string>>({});
    const [hostName, setHostName] = useState<string>(roomDetails?.host_name || "");
    const [gameStarted, setGameStarted] = useState(false);
    const [gameData, setGameData] = useState<{
        cards: string[],
        currentTurn: string,
        playerList: string[],
        lastPlayedCards?: string[],
        lastPlayedBy?: string,
    } | null>(null);
    const [selfUuid, setSelfUuid] = useState<string>("");

    useEffect(() => {
        const stored = getStoredSession();
        if (stored?.player_uuid) {
            setSelfUuid(stored.player_uuid);
        }
    }, []);

    // Notify parent when game state changes
    useEffect(() => {
        onGameStateChange?.(gameStarted);
    }, [gameStarted, onGameStateChange]);

    // WebSocket message handlers
    const messageHandlers = useRef<Record<string, MessageHandler>>({
        CHAT: (message) => {
            const senderUuid = (message.payload as any).sender_uuid as string;
            const content = (message.payload as any).content as string;

            setChatMessages(prevMessages => ([
                ...prevMessages,
                {
                    senderUuid,
                    content
                }
            ]));
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
            const hostDisplayName = uuidToName[newHost] || (newHost === selfUuid ? username : newHost);
            setHostName(hostDisplayName);

            // Add system message to chat
            const targetName = newHost === selfUuid ? username : hostDisplayName;
            const systemMessage = newHost === selfUuid
                ? "You are now the host of this room."
                : `${targetName} is now the host of this room.`;

            setChatMessages(prevMessages => ([
                ...prevMessages,
                {
                    senderUuid: "SYSTEM",
                    content: systemMessage
                }
            ]));
        },
        GAME_STARTED: (message) => {
            console.log("GAME_STARTED message received", message.payload);
            const cards = (message.payload as any).cards as string[];
            const currentTurn = (message.payload as any).current_turn as string;
            const playerList = (message.payload as any).player_list as string[];
            const lastPlayedCards = (message.payload as any).last_played_cards as string[] | undefined;
            const lastPlayedBy = (message.payload as any).last_played_by as string | undefined;

            setGameData({
                cards,
                currentTurn,
                playerList,
                lastPlayedCards,
                lastPlayedBy,
            });
            setGameStarted(true);
        },

        // Game message handlers
        MOVE: () => console.log("MOVE message received"),
        MOVE_PLAYED: (message) => {
            const playerUuid = (message.payload as any).player as string;
            const cards = (message.payload as any).cards as string[];

            if (Array.isArray(cards) && cards.length > 0) {
                setGameData(prev => prev ? {
                    ...prev,
                    lastPlayedCards: cards,
                    lastPlayedBy: playerUuid,
                } : prev);
            }
        },
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

    // Update host name from room details
    useEffect(() => {
        if (roomDetails?.host_name) {
            setHostName(roomDetails.host_name);
        }
    }, [roomDetails]);

    const getDisplayName = useCallback((identifier: string) => {
        if (identifier === "SYSTEM") {
            return "SYSTEM";
        }

        if (uuidToName[identifier]) {
            return uuidToName[identifier];
        }

        if (identifier === selfUuid && username) {
            return username;
        }

        if (identifier === username) {
            return username;
        }

        return identifier;
    }, [uuidToName, selfUuid, username]);

    const displayMessages = useMemo<DisplayMessage[]>(() => (
        chatMessages.map(msg => {
            const senderName = getDisplayName(msg.senderUuid);
            const isCurrentUser = msg.senderUuid === selfUuid || msg.senderUuid === username || senderName === username;

            return {
                text: `${senderName}: ${msg.content}`,
                isCurrentUser
            };
        })
    ), [chatMessages, getDisplayName, selfUuid, username]);

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

                <ChatBox messages={displayMessages} onSendMessage={sendChatMessage} />
            </Stack>
        </Container>
    );
};

export default GameRoom;
