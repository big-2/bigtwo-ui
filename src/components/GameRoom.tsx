import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredSession } from "../services/session";
import { RoomResponse, addBotToRoom, removeBotFromRoom, getRoomStats } from "../services/api";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import ChatBox from "./ChatBox";
import PlayerList from "./PlayerList";
import GameScreen from "./GameScreen";
import { WebSocketMessage } from "../types.websocket";
import { RoomStats } from "../types.stats";
import { Copy, Check, Wifi, WifiOff, LogOut } from "lucide-react";
import { ReconnectingWebSocket, ConnectionState } from "../services/websocket-reconnect";
import { extractSessionIdFromJWT } from "../utils/jwt";

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
}

type MessageHandler = (message: WebSocketMessage) => void;

// Maximum number of chat messages to keep in history
const MAX_CHAT_MESSAGES = 100;

const GameRoom: React.FC<GameRoomProps> = ({ roomId, username, roomDetails }) => {
    const navigate = useNavigate();
    const socketRef = useRef<ReconnectingWebSocket | null>(null);
    const lastConnectionStateRef = useRef<ConnectionState | null>(null);
    const pendingLeaveResolve = useRef<(() => void) | null>(null);
    const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
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
    const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
    const [botDifficulty, setBotDifficulty] = useState<"easy" | "medium" | "hard">("easy");
    const [addingBot, setAddingBot] = useState(false);
    const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [connectedPlayers, setConnectedPlayers] = useState<Set<string>>(new Set());

    useEffect(() => {
        const stored = getStoredSession();
        if (stored?.session_id) {
            // Extract session_id from JWT payload (this is the player identifier)
            const sessionId = extractSessionIdFromJWT(stored.session_id);
            if (sessionId) {
                setSelfUuid(sessionId);
            }
        }
    }, []);

    // Helper function to add chat message with history limit
    const addChatMessage = useCallback((message: UserChatMessage) => {
        setChatMessages(prev => {
            const newMessages = [...prev, message];
            // Keep only the last MAX_CHAT_MESSAGES messages
            return newMessages.slice(-MAX_CHAT_MESSAGES);
        });
    }, []);

    // Fetch initial stats when room loads
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const stats = await getRoomStats(roomId);
                setRoomStats(stats);
            } catch (error) {
                console.error('Failed to load room stats:', error);
                // Set default empty stats state on error (non-404 errors)
                // 404 is expected for rooms with no games played yet
                setRoomStats({
                    room_id: roomId,
                    games_played: 0,
                    player_stats: {}
                });
            }
        };

        fetchStats();
    }, [roomId]);

    // WebSocket message handlers
    // Update handlers when dependencies change
    useEffect(() => {
        messageHandlers.current = {
            CHAT: (message) => {
                const payload = message.payload as { sender_uuid?: string; content?: string };
                const senderUuid = payload?.sender_uuid;
                const content = payload?.content;
                if (!senderUuid || typeof content !== "string") {
                    return;
                }

                addChatMessage({
                    senderUuid,
                    content
                });
            },

            PLAYERS_LIST: (message) => {
                const payload = message.payload as {
                    mapping?: Record<string, string>;
                    bot_uuids?: string[];
                    ready_players?: string[];
                    host_uuid?: string | null;
                    connected_players?: string[];
                };
                const mapping = payload?.mapping;
                const botUuidsFromServer = payload?.bot_uuids;
                const readyPlayersFromServer = payload?.ready_players;
                const hostUuidFromServer = payload?.host_uuid;
                const connectedFromServer = payload?.connected_players;

                if (mapping) {
                    setUuidToName(mapping);
                    const foundSelf = Object.keys(mapping).find((uuid) => mapping[uuid] === username);
                    if (foundSelf) setSelfUuid(foundSelf);

                    // Update host UUID from server if provided
                    if (hostUuidFromServer) {
                        setHostUuid(hostUuidFromServer);
                        setHostName(mapping[hostUuidFromServer] || hostUuidFromServer);
                    } else {
                        // Fallback to deriving from host name (for backwards compatibility)
                        setHostUuid((currentHostUuid) => {
                            if (currentHostUuid && mapping[currentHostUuid]) {
                                return currentHostUuid;
                            }

                            const derivedHost = Object.entries(mapping).find(([, name]) => name === hostName)?.[0];
                            return derivedHost ?? currentHostUuid;
                        });
                    }

                    // Use bot UUIDs from server if available
                    if (Array.isArray(botUuidsFromServer)) {
                        setBotUuids(new Set(botUuidsFromServer));
                    }

                    // Update ready players from server
                    if (Array.isArray(readyPlayersFromServer)) {
                        setReadyPlayers(new Set(readyPlayersFromServer));
                    }

                    // Update connected players with type validation
                    if (Array.isArray(connectedFromServer)) {
                        // Filter to ensure all values are strings (UUIDs)
                        const validUuids = connectedFromServer.filter(
                            (uuid): uuid is string => typeof uuid === 'string'
                        );
                        setConnectedPlayers(new Set(validUuids));
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

                // Clean up connected players state
                setConnectedPlayers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(leftPlayerUuid);
                    return newSet;
                });

                // If this is our own LEAVE echo, resolve the pending promise
                // Check against both selfUuid and stored session ID to handle race conditions
                const stored = getStoredSession();
                const storedSessionId = stored?.session_id ? extractSessionIdFromJWT(stored.session_id) : null;
                const isOwnLeave = leftPlayerUuid === selfUuid ||
                    (storedSessionId && leftPlayerUuid === storedSessionId);

                if (isOwnLeave && pendingLeaveResolve.current) {
                    pendingLeaveResolve.current();
                    pendingLeaveResolve.current = null;
                }
            },

            HOST_CHANGE: (message) => {
                const payload = message.payload as { host?: string; host_uuid?: string };
                const newHostName = payload?.host;
                const newHostUuid = payload?.host_uuid;

                if (!newHostUuid) {
                    console.warn("HOST_CHANGE message missing host_uuid");
                    return;
                }

                console.log(`New host: ${newHostName} (${newHostUuid})`);

                // Update host state with UUID from server
                setHostUuid(newHostUuid);
                if (newHostName) {
                    setHostName(newHostName);
                }

                // Add system message to chat
                const displayName = uuidToName[newHostUuid] || newHostName || newHostUuid;
                const systemMessage = newHostUuid === selfUuid
                    ? "You are now the host of this room."
                    : `${displayName} is now the host of this room.`;

                addChatMessage({
                    senderUuid: "SYSTEM",
                    content: systemMessage
                });
            },
            READY: (message) => {
                const payload = message.payload as {
                    player_uuid?: string;
                    is_ready?: boolean;
                };

                if (!payload?.player_uuid || typeof payload?.is_ready !== "boolean") {
                    console.warn("READY message missing required fields");
                    return;
                }

                // Update ready state based on server confirmation
                setReadyPlayers(prev => {
                    const newSet = new Set(prev);
                    if (payload.is_ready) {
                        newSet.add(payload.player_uuid!);
                    } else {
                        newSet.delete(payload.player_uuid!);
                    }
                    return newSet;
                });
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

                // Clear ready states to mirror backend behavior (backend clears ready states when game starts)
                // This ensures when players return to lobby, they see correct (empty) ready state
                setReadyPlayers(new Set());
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

            GAME_WON: (message) => {
                const payload = message.payload as { winner?: string };
                const winnerUuid = payload?.winner;

                if (winnerUuid) {
                    const winnerName = uuidToName[winnerUuid] || winnerUuid;
                    console.log(`Game won by: ${winnerName}`);

                    // Add win message to chat
                    addChatMessage({
                        senderUuid: "SYSTEM",
                        content: `🎉 ${winnerName} won the game!`
                    });

                    // Note: We don't automatically return to lobby here because:
                    // 1. GameScreen shows the win screen with "Return to Lobby" button
                    // 2. User clicks button → calls handleReturnToLobby → returns to lobby
                    // 3. Backend removes game from repository after sending GAME_WON
                    // 4. On refresh, backend has no game → won't send GAME_STARTED → shows lobby
                }
            },
            ERROR: (message) => {
                const payload = message.payload as { message?: string; error_type?: string };
                console.error("Error from server:", payload?.message);

                // If this is a ready-related error, revert optimistic update
                if (payload?.error_type === "ready" || payload?.message?.toLowerCase().includes("ready")) {
                    // Request fresh player list to sync ready state
                    console.log("Ready error detected, state will be synced via PLAYERS_LIST");
                }

                // Show error to user in chat
                if (payload?.message) {
                    addChatMessage({
                        senderUuid: "SYSTEM",
                        content: `Error: ${payload.message}`
                    });
                }
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
                addChatMessage({
                    senderUuid: "SYSTEM",
                    content: `${botName} joined the room`
                });
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
                addChatMessage({
                    senderUuid: "SYSTEM",
                    content: `${botName} left the room`
                });
            },

            STATS_UPDATED: (message) => {
                const payload = message.payload as { room_stats?: RoomStats };
                const stats = payload?.room_stats;

                // Validate the payload before updating state
                if (!stats?.room_id || stats.room_id !== roomId) {
                    console.warn("STATS_UPDATED message has invalid or mismatched room_id");
                    return;
                }

                setRoomStats(stats);
            },
        };
    }, [uuidToName, selfUuid, username, roomId, addChatMessage, hostName]);

    const messageHandlers = useRef<Record<string, MessageHandler>>({});

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

    // Establish WebSocket connection with automatic reconnection
    useEffect(() => {
        console.log(`Establishing WebSocket connection to room ${roomId}...`);

        const stored = getStoredSession();
        // Extract session_id from JWT (this is the player identifier)
        let identity = username;
        if (stored?.session_id) {
            const sessionId = extractSessionIdFromJWT(stored.session_id);
            identity = sessionId || username;
        }

        const socket = new ReconnectingWebSocket({
            roomId,
            playerName: identity,
            onMessage: processMessage,
            onStateChange: (state) => {
                setConnectionState(state);

                // Only add chat messages for state transitions, not repeats
                if (lastConnectionStateRef.current === state) {
                    return;
                }
                lastConnectionStateRef.current = state;

                // Show connection status in chat
                if (state === ConnectionState.CONNECTED) {
                    addChatMessage({
                        senderUuid: "SYSTEM",
                        content: "Connected to game server"
                    });
                } else if (state === ConnectionState.RECONNECTING) {
                    addChatMessage({
                        senderUuid: "SYSTEM",
                        content: "Connection lost. Reconnecting..."
                    });
                } else if (state === ConnectionState.FAILED) {
                    addChatMessage({
                        senderUuid: "SYSTEM",
                        content: "Failed to reconnect. Please refresh the page."
                    });
                }
            },
            maxReconnectAttempts: 10,
            baseDelay: 1000,
            maxDelay: 30000,
        });

        socket.connect();
        socketRef.current = socket;

        return () => {
            console.log(`Closing WebSocket connection to room ${roomId}`);
            socket.close();

            // Clean up pending leave timeout to prevent memory leak
            if (leaveTimeoutRef.current) {
                clearTimeout(leaveTimeoutRef.current);
                leaveTimeoutRef.current = null;
            }
            pendingLeaveResolve.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, addChatMessage]);
    // Note: username is intentionally omitted - it's only used as a fallback if session_id
    // cannot be extracted. WebSocket authentication uses session_id (from localStorage JWT).
    // Including username would cause unnecessary reconnections when it changes.

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
        if (!socketRef.current?.isConnected()) {
            console.warn("Cannot send chat: not connected");
            return;
        }

        socketRef.current.send(JSON.stringify({
            type: "CHAT",
            payload: {
                sender_uuid: selfUuid || username,
                content: message
            }
        }));
    };

    const handleToggleReady = () => {
        if (!currentUserUuid) {
            console.warn("Cannot toggle ready: user UUID not available");
            return;
        }

        const currentlyReady = readyPlayers.has(currentUserUuid);
        const newReadyState = !currentlyReady;

        // Optimistic update
        setReadyPlayers(prev => {
            const newSet = new Set(prev);
            if (newReadyState) {
                newSet.add(currentUserUuid);
            } else {
                newSet.delete(currentUserUuid);
            }
            return newSet;
        });

        if (socketRef.current?.isConnected()) {
            socketRef.current.send(JSON.stringify({
                type: "READY",
                payload: {
                    is_ready: newReadyState
                }
            }));
        }
    };

    const handleStartGame = () => {
        console.log("Start game button clicked");

        if (!socketRef.current?.isConnected()) {
            console.warn("Cannot start game: not connected");
            return;
        }

        socketRef.current.send(JSON.stringify({
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
                addChatMessage({
                    senderUuid: "SYSTEM",
                    content: "Failed to add bot. Room may be full or you may not be the host."
                });
            }
        } finally {
            setAddingBot(false);
        }
    }, [roomId, botDifficulty, addChatMessage]);

    const handleRemoveBot = useCallback(async (botUuid: string) => {
        try {
            const success = await removeBotFromRoom(roomId, botUuid);
            if (!success) {
                console.error("Failed to remove bot");
                addChatMessage({
                    senderUuid: "SYSTEM",
                    content: "Failed to remove bot. You may not be the host."
                });
            }
        } catch (error) {
            console.error("Error removing bot:", error);
        }
    }, [roomId, addChatMessage]);

    const handleKickPlayer = useCallback((playerUuid: string) => {
        console.log("Kick player clicked", playerUuid);
        addChatMessage({
            senderUuid: "SYSTEM",
            content: "Player removal is coming soon."
        });
    }, [addChatMessage]);

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

    // Calculate if all human (non-bot) players are ready
    const humanPlayers = playerUuids.filter(uuid => !botUuids.has(uuid));
    const readyHumanPlayers = humanPlayers.filter(uuid => readyPlayers.has(uuid));
    const allHumansReady = humanPlayers.length > 0 && humanPlayers.length === readyHumanPlayers.length;

    const canStartGame = playerUuids.length === 4 && allHumansReady;
    const canAddBot = !gameStarted && playerUuids.length < 4;

    const handleReturnToLobby = () => {
        console.log("Returning to lobby view");

        // Simply update local UI state - no backend coordination needed
        // The player is still in the room, just viewing the lobby instead of game
        setGameStarted(false);
        setGameData(null);
    };

    const handleCopyRoomLink = async () => {
        const roomUrl = `${window.location.origin}/room/${roomId}`;
        try {
            await navigator.clipboard.writeText(roomUrl);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy link:", error);
        }
    };

    const handleLeaveRoom = async () => {
        console.log("Leave room button clicked");

        // If not connected, navigate immediately
        if (!socketRef.current?.isConnected()) {
            navigate("/");
            return;
        }

        // Set up a promise to wait for our own LEAVE message echo
        const leaveAcknowledged = new Promise<void>((resolve) => {
            // Timeout after 3 seconds if we don't receive acknowledgment
            leaveTimeoutRef.current = setTimeout(() => {
                console.warn("Leave acknowledgment timeout - navigating anyway");
                pendingLeaveResolve.current = null;
                leaveTimeoutRef.current = null;
                resolve();
            }, 3000);

            // Store the resolver so the LEAVE handler can call it
            pendingLeaveResolve.current = () => {
                if (leaveTimeoutRef.current) {
                    clearTimeout(leaveTimeoutRef.current);
                    leaveTimeoutRef.current = null;
                }
                resolve();
            };
        });

        // Send LEAVE message
        socketRef.current.send(JSON.stringify({
            type: "LEAVE",
            payload: {}
        }));

        // Wait for acknowledgment (or timeout)
        await leaveAcknowledged;

        // Navigate back to home
        navigate("/");
    };

    // Connection status indicator component
    const ConnectionIndicator = () => {
        const getStatusConfig = () => {
            switch (connectionState) {
                case ConnectionState.CONNECTED:
                    return {
                        icon: Wifi,
                        text: "Connected",
                        className: "text-green-600 dark:text-green-400"
                    };
                case ConnectionState.CONNECTING:
                    return {
                        icon: Wifi,
                        text: "Connecting...",
                        className: "text-yellow-600 dark:text-yellow-400 animate-pulse"
                    };
                case ConnectionState.RECONNECTING:
                    return {
                        icon: WifiOff,
                        text: "Reconnecting...",
                        className: "text-orange-600 dark:text-orange-400 animate-pulse"
                    };
                case ConnectionState.DISCONNECTED:
                    return {
                        icon: WifiOff,
                        text: "Disconnected",
                        className: "text-gray-600 dark:text-gray-400"
                    };
                case ConnectionState.FAILED:
                    return {
                        icon: WifiOff,
                        text: "Connection Failed",
                        className: "text-red-600 dark:text-red-400"
                    };
            }
        };

        const config = getStatusConfig();
        const Icon = config.icon;

        return (
            <div className={cn("flex items-center gap-1.5 text-xs sm:text-sm", config.className)}>
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{config.text}</span>
            </div>
        );
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
                connectionState={connectionState}
            />
        );
    }

    // Otherwise show the home/room interface
    return (
        <div className="flex h-[calc(100vh-60px)] w-full flex-col overflow-hidden px-4 py-6">
            <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 overflow-hidden">
                <header className="flex flex-col gap-4 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 sm:p-6 shadow-sm dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
                    <div className="flex flex-row items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <h2 className="text-lg sm:text-3xl font-bold text-blue-700 dark:text-blue-400 break-all">
                                {roomId}
                            </h2>
                            <div className="flex items-center gap-2">
                                <p className="text-xs sm:text-sm text-blue-600/70 dark:text-blue-400/70 hidden sm:block">Game Room</p>
                                <ConnectionIndicator />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={handleCopyRoomLink}
                                className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-blue-300 bg-white px-2 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-blue-700 transition-all hover:bg-blue-50 hover:shadow-md active:scale-95 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70"
                            >
                                {linkCopied ? (
                                    <>
                                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Link Copied!</span>
                                        <span className="sm:hidden">Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Invite Friends</span>
                                        <span className="sm:hidden">Invite</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleLeaveRoom}
                                className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-red-300 bg-white px-2 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-red-700 transition-all hover:bg-red-50 hover:shadow-md active:scale-95 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70"
                            >
                                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Leave Room</span>
                                <span className="sm:hidden">Leave</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 flex-col gap-6 overflow-hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-6 overflow-auto md:pr-2">
                        <PlayerList
                            players={playerUuids}
                            mapping={uuidToName}
                            botUuids={botUuids}
                            readyPlayers={readyPlayers}
                            connectedPlayers={connectedPlayers}
                            currentUserUuid={currentUserUuid}
                            currentUsername={username}
                            hostUuid={derivedHostUuid}
                            isHost={isHost}
                            addingBot={addingBot}
                            botDifficulty={botDifficulty}
                            canAddBot={canAddBot}
                            playerStats={roomStats?.player_stats}
                            gamesPlayed={roomStats?.games_played || 0}
                            onBotDifficultyChange={setBotDifficulty}
                            onAddBot={handleAddBot}
                            onRemoveBot={handleRemoveBot}
                            onKickPlayer={handleKickPlayer}
                            onToggleReady={handleToggleReady}
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
                                    {playerUuids.length < 4
                                        ? "Waiting for players..."
                                        : !allHumansReady
                                            ? "Waiting for players to ready..."
                                            : "Start Game"}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex min-h-[300px] md:min-h-0 flex-col overflow-hidden">
                        <ChatBox messages={displayMessages} onSendMessage={sendChatMessage} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameRoom;
