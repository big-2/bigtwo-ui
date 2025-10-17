import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { connectToRoomWebSocket } from "../services/socket";
import { getStoredSession } from "../services/session";
import { RoomResponse, addBotToRoom, removeBotFromRoom } from "../services/api";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
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
    const [hostUuid, setHostUuid] = useState<string | undefined>(undefined);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameData, setGameData] = useState<{
        cards: string[],
        currentTurn: string,
        playerList: string[],
        lastPlayedCards?: string[],
        lastPlayedBy?: string,
    } | null>(null);
    const [selfUuid, setSelfUuid] = useState<string>("");
    const [botUuids, setBotUuids] = useState<Set<string>>(new Set());
    const [botDifficulty, setBotDifficulty] = useState<"easy" | "medium" | "hard">("easy");
    const [addingBot, setAddingBot] = useState(false);

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
            const payload = message.payload as { sender_uuid?: string; content?: string };
            const senderUuid = payload?.sender_uuid;
            const content = payload?.content;
            if (!senderUuid || typeof content !== "string") {
                return;
            }

            setChatMessages(prevMessages => ([
                ...prevMessages,
                {
                    senderUuid,
                    content
                }
            ]));
        },

        PLAYERS_LIST: (message) => {
            const payload = message.payload as { mapping?: Record<string, string>; bot_uuids?: string[] };
            const mapping = payload?.mapping;
            const botUuidsFromServer = payload?.bot_uuids;

            if (mapping) {
                setUuidToName(mapping);
                const foundSelf = Object.keys(mapping).find((uuid) => mapping[uuid] === username);
                if (foundSelf) setSelfUuid(foundSelf);

                setHostUuid((currentHostUuid) => {
                    if (currentHostUuid && mapping[currentHostUuid]) {
                        return currentHostUuid;
                    }

                    const derivedHost = Object.entries(mapping).find(([, name]) => name === hostName)?.[0];
                    return derivedHost ?? currentHostUuid;
                });

                // Use bot UUIDs from server if available
                if (Array.isArray(botUuidsFromServer)) {
                    setBotUuids(new Set(botUuidsFromServer));
                }
            }
        },

        LEAVE: (message) => {
            const payload = message.payload as { player?: string };
            const leftPlayerUuid = payload?.player;
            if (!leftPlayerUuid) {
                return;
            }

            console.log(`Player left: ${leftPlayerUuid}`);

            setUuidToName(currentMapping => {
                const newMapping = { ...currentMapping };
                delete newMapping[leftPlayerUuid];
                return newMapping;
            });

            // Clean up bot UUID if the leaving player is a bot
            setBotUuids(prev => {
                const newSet = new Set(prev);
                newSet.delete(leftPlayerUuid);
                return newSet;
            });
        },

        HOST_CHANGE: (message) => {
            const payload = message.payload as { host?: string };
            const newHost = payload?.host;
            if (!newHost) {
                return;
            }

            console.log(`New host: ${newHost}`);
            const hostDisplayName = uuidToName[newHost] || (newHost === selfUuid ? username : newHost);
            setHostName(hostDisplayName);
            setHostUuid(newHost);

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
            const payload = message.payload as {
                cards?: string[];
                current_turn?: string;
                player_list?: string[];
                last_played_cards?: string[];
                last_played_by?: string;
            };

            if (!Array.isArray(payload?.cards) || !Array.isArray(payload?.player_list) || !payload?.current_turn) {
                return;
            }

            setGameData({
                cards: payload.cards,
                currentTurn: payload.current_turn,
                playerList: payload.player_list,
                lastPlayedCards: payload.last_played_cards,
                lastPlayedBy: payload.last_played_by,
            });
            setGameStarted(true);
        },

        // Game message handlers
        MOVE: () => console.log("MOVE message received"),
        MOVE_PLAYED: (message) => {
            const payload = message.payload as { player?: string; cards?: unknown };
            const playerUuid = payload?.player;
            const cards = Array.isArray(payload?.cards) ? (payload?.cards as string[]) : undefined;

            if (cards && cards.length > 0 && playerUuid) {
                setGameData(prev => prev ? {
                    ...prev,
                    lastPlayedCards: cards,
                    lastPlayedBy: playerUuid,
                } : prev);
            }
        },
        TURN_CHANGE: () => console.log("TURN_CHANGE message received"),
        ERROR: (message) => {
            const payload = message.payload as { message?: string };
            console.error("Error from server:", payload?.message);
        },

        // Bot message handlers
        BOT_ADDED: (message) => {
            const payload = message.payload as { bot_uuid?: string; bot_name?: string };
            const botUuid = payload?.bot_uuid;
            const botName = payload?.bot_name ?? "Bot";

            if (!botUuid) {
                return;
            }

            console.log(`Bot added: ${botName} (${botUuid})`);

            setBotUuids(prev => new Set([...prev, botUuid]));

            // Add system message to chat
            setChatMessages(prevMessages => ([
                ...prevMessages,
                {
                    senderUuid: "SYSTEM",
                    content: `${botName} joined the room`
                }
            ]));
        },

        BOT_REMOVED: (message) => {
            const payload = message.payload as { bot_uuid?: string };
            const botUuid = payload?.bot_uuid;

            if (!botUuid) {
                return;
            }

            console.log(`Bot removed: ${botUuid}`);

            setBotUuids(prev => {
                const newSet = new Set(prev);
                newSet.delete(botUuid);
                return newSet;
            });

            // Add system message to chat
            const botName = uuidToName[botUuid] || "Bot";
            setChatMessages(prevMessages => ([
                ...prevMessages,
                {
                    senderUuid: "SYSTEM",
                    content: `${botName} left the room`
                }
            ]));
        },
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

    const handleAddBot = useCallback(async () => {
        // Use functional update to prevent race condition
        let shouldProceed = false;
        setAddingBot(prev => {
            if (prev) return prev; // Already adding, don't proceed
            shouldProceed = true;
            return true;
        });

        if (!shouldProceed) return;

        try {
            const result = await addBotToRoom(roomId, botDifficulty);
            if (result) {
                console.log("Bot added successfully:", result);
            } else {
                console.error("Failed to add bot");
                // Show error notification to user
                setChatMessages(prevMessages => ([
                    ...prevMessages,
                    {
                        senderUuid: "SYSTEM",
                        content: "Failed to add bot. Room may be full or you may not be the host."
                    }
                ]));
            }
        } finally {
            setAddingBot(false);
        }
    }, [roomId, botDifficulty]);

    const handleRemoveBot = useCallback(async (botUuid: string) => {
        try {
            const success = await removeBotFromRoom(roomId, botUuid);
            if (!success) {
                console.error("Failed to remove bot");
                setChatMessages(prevMessages => ([
                    ...prevMessages,
                    {
                        senderUuid: "SYSTEM",
                        content: "Failed to remove bot. You may not be the host."
                    }
                ]));
            }
        } catch (error) {
            console.error("Error removing bot:", error);
        }
    }, [roomId]);

    const handleKickPlayer = useCallback((playerUuid: string) => {
        console.log("Kick player clicked", playerUuid);
        setChatMessages(prevMessages => ([
            ...prevMessages,
            {
                senderUuid: "SYSTEM",
                content: "Player removal is coming soon."
            }
        ]));
    }, []);

    // Check if current user is the host using UUID mapping
    // Find the UUID that maps to the current username and see if that UUID maps to the host
    const playerUuids = useMemo(() => Object.keys(uuidToName), [uuidToName]);
    const currentUserUuid = selfUuid || playerUuids.find(uuid => uuidToName[uuid] === username);
    const derivedHostUuid = useMemo(() => {
        if (hostUuid) {
            return hostUuid;
        }

        return playerUuids.find(uuid => uuidToName[uuid] === hostName);
    }, [hostUuid, playerUuids, uuidToName, hostName]);
    const isHost = Boolean(currentUserUuid && derivedHostUuid && currentUserUuid === derivedHostUuid);
    const canStartGame = playerUuids.length === 4;
    const canAddBot = !gameStarted && playerUuids.length < 4;

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
                botUuids={botUuids}
                onReturnToLobby={handleReturnToLobby}
            />
        );
    }

    // Otherwise show the home/room interface
    return (
        <div className="flex h-[calc(100vh-60px)] w-full flex-col overflow-hidden px-4 py-6">
            <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 overflow-hidden">
                <header className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-600">Game Room {roomId}</h2>
                </header>

                <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-6 overflow-hidden md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-6 overflow-auto pr-2">
                        <PlayerList
                            players={playerUuids}
                            mapping={uuidToName}
                            botUuids={botUuids}
                            currentUserUuid={currentUserUuid}
                            currentUsername={username}
                            hostUuid={derivedHostUuid}
                            isHost={isHost}
                            addingBot={addingBot}
                            botDifficulty={botDifficulty}
                            canAddBot={canAddBot}
                            onBotDifficultyChange={setBotDifficulty}
                            onAddBot={handleAddBot}
                            onRemoveBot={handleRemoveBot}
                            onKickPlayer={handleKickPlayer}
                        />

                        {isHost && (
                            <div className="flex justify-center">
                                <Button
                                    size="lg"
                                    onClick={handleStartGame}
                                    disabled={!canStartGame}
                                    className={cn(
                                        "min-w-[200px]",
                                        canStartGame ? "bg-green-500 hover:bg-green-600" : "bg-slate-300 text-slate-500"
                                    )}
                                >
                                    {canStartGame ? "Start Game" : "Waiting for players..."}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex min-h-0 flex-col overflow-hidden">
                        <ChatBox messages={displayMessages} onSendMessage={sendChatMessage} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameRoom;
