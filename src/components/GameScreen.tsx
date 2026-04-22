import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { WebSocketMessage } from "../types.websocket";
import { ReconnectingWebSocket, ConnectionState } from "../services/websocket-reconnect";
import PlayerHand from "./PlayerHand";
import { sortSelectedCards, SortType, findCardsByRank } from "../utils/cardSorting";
import { getSuitColorClass, getSuitSymbol, getRankDisplay } from "../utils/cardDisplay";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";
import { useThemeContext } from "../contexts/ThemeContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { getFullCardFlightAnimationDurationMs, rectFromElement, useCardFlightLayer } from "../hooks/useCardFlightLayer";
import { useGameFeelSettings } from "../hooks/useGameFeelSettings";
import { isCardFlightAnimationEnabled } from "../utils/config";
import { Bot, BrainCircuit, HelpCircle, WifiOff } from "lucide-react";
import GameFeelSettingsDialog from "./GameFeelSettingsDialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";

interface GameScreenProps {
    username: string; // display name for current client
    uuid: string; // uuid for current client
    socket: ReconnectingWebSocket | null;
    initialGameData?: {
        cards: string[];
        currentTurn: string;
        playerList: string[];
        cardCounts?: Record<string, number>;
        lastPlayedCards?: string[];
        lastPlayedBy?: string;
    };
    mapping: Record<string, string>; // uuid to display name mapping
    botUuids?: Set<string>; // Set of bot UUIDs
    botDifficultyByUuid?: Record<string, "easy" | "ai">;
    onReturnToLobby?: () => void;
    connectionState?: ConnectionState;
}

interface Player {
    name: string;
    cards: string[];
    cardCount: number;
    isCurrentPlayer: boolean;
    isCurrentTurn: boolean;
    hasPassed: boolean;
}

interface GameState {
    players: Player[];
    currentTurn: string;
    currentPlayer: string;
    selectedCards: string[];
    gameStarted: boolean;
    playerList: string[]; // Track the full player list order
    lastPlayedCards: string[]; // Track the last played cards for validation
    lastPlayedBy: string; // Track who played the last cards
    lastPlaysByPlayer: Record<string, string[]>; // Track last cards played by each player (UUID -> cards)
    gameWon: boolean; // Track if the game has been won
    winner: string; // Track who won the game
    uuidToName: Record<string, string>; // UUID to username mapping
    focusedCardIndex: number | null; // Track which card has keyboard focus (cursor)
}

const getTablePlayKey = (playerUuid: string, cards: string[]) => `${playerUuid}:${cards.join("|")}`;
const PACED_GAME_MESSAGE_TYPES = new Set(["TURN_CHANGE", "MOVE_PLAYED", "GAME_WON"]);

const getVisibleElementRect = (elements: Array<HTMLElement | null>) => {
    for (const element of elements) {
        if (!element) {
            continue;
        }

        const rect = rectFromElement(element);
        if (rect.width > 0 && rect.height > 0) {
            return rect;
        }
    }

    return null;
};

const GameScreen: React.FC<GameScreenProps> = ({
    username,
    uuid,
    socket,
    initialGameData,
    mapping,
    botUuids = new Set(),
    botDifficultyByUuid = {},
    onReturnToLobby,
    connectionState = ConnectionState.CONNECTED,
}) => {
    const { theme } = useThemeContext();
    const isConnected = connectionState === ConnectionState.CONNECTED;

    // Track cycling state for cards with same rank
    const rankCycleIndexRef = useRef<Record<string, number>>({});
    const handCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const opponentSourceRefs = useRef<Record<string, Record<string, HTMLElement>>>({});
    const desktopTableTargetRef = useRef<HTMLDivElement | null>(null);
    const mobileTableTargetRef = useRef<HTMLDivElement | null>(null);
    const desktopCardLaneTargetRef = useRef<HTMLDivElement | null>(null);
    const mobileCardLaneTargetRef = useRef<HTMLDivElement | null>(null);
    const [suppressedTablePlayKey, setSuppressedTablePlayKey] = useState<string | null>(null);
    const {
        settings: gameFeelSettings,
        setSettings: setGameFeelSettings,
        cardFlightSpeedMultiplier,
        actionPaceDelayMs,
    } = useGameFeelSettings();
    const [isActionPacing, setIsActionPacing] = useState(false);
    const actionPacingTimeoutRef = useRef<number | null>(null);
    const gameProgressionBlockedRef = useRef(false);
    const gameProgressionResetTokenRef = useRef(0);
    const queuedGameProgressionMessagesRef = useRef<WebSocketMessage[]>([]);
    const isDrainingGameProgressionQueueRef = useRef(false);
    const drainGameProgressionQueueRef = useRef<() => void>(() => undefined);
    const {
        canAnimateCardFlights,
        overlay: cardFlightOverlay,
        queueCardFlight,
    } = useCardFlightLayer({
        enabled: isCardFlightAnimationEnabled(),
        speedMultiplier: cardFlightSpeedMultiplier,
    });
    const passPacingAnimationMs = canAnimateCardFlights
        ? getFullCardFlightAnimationDurationMs(cardFlightSpeedMultiplier)
        : 0;

    const clearActionPacingTimeout = useCallback(() => {
        if (actionPacingTimeoutRef.current !== null) {
            window.clearTimeout(actionPacingTimeoutRef.current);
            actionPacingTimeoutRef.current = null;
        }
    }, []);

    const blockGameProgression = useCallback(() => {
        clearActionPacingTimeout();
        gameProgressionBlockedRef.current = true;
        setIsActionPacing(true);
    }, [clearActionPacingTimeout]);

    const resetGameProgressionQueue = useCallback(() => {
        gameProgressionResetTokenRef.current += 1;
        clearActionPacingTimeout();
        queuedGameProgressionMessagesRef.current = [];
        gameProgressionBlockedRef.current = false;
        isDrainingGameProgressionQueueRef.current = false;
        setIsActionPacing(false);
        setSuppressedTablePlayKey(null);
    }, [clearActionPacingTimeout]);

    useEffect(() => () => {
        resetGameProgressionQueue();
    }, [resetGameProgressionQueue]);

    const releaseGameProgressionAfter = useCallback((delayMs: number) => {
        clearActionPacingTimeout();

        const release = () => {
            actionPacingTimeoutRef.current = null;
            gameProgressionBlockedRef.current = false;
            setIsActionPacing(false);
            drainGameProgressionQueueRef.current();
        };

        if (delayMs <= 0) {
            requestAnimationFrame(release);
            return;
        }

        setIsActionPacing(true);
        actionPacingTimeoutRef.current = window.setTimeout(release, delayMs);
    }, [clearActionPacingTimeout]);

    const blockGameProgressionRef = useRef(blockGameProgression);
    const releaseGameProgressionAfterRef = useRef(releaseGameProgressionAfter);

    useEffect(() => {
        blockGameProgressionRef.current = blockGameProgression;
        releaseGameProgressionAfterRef.current = releaseGameProgressionAfter;
    }, [blockGameProgression, releaseGameProgressionAfter]);

    const actionPaceDelayMsRef = useRef(actionPaceDelayMs);
    const passPacingAnimationMsRef = useRef(passPacingAnimationMs);
    useEffect(() => {
        actionPaceDelayMsRef.current = actionPaceDelayMs;
        passPacingAnimationMsRef.current = passPacingAnimationMs;
    }, [actionPaceDelayMs, passPacingAnimationMs]);

    const registerHandCardRef = useCallback((card: string, element: HTMLDivElement | null) => {
        if (element) {
            handCardRefs.current[card] = element;
        } else {
            delete handCardRefs.current[card];
        }
    }, []);

    const registerOpponentSourceRef = useCallback((playerUuid: string, sourceKey: string, element: HTMLElement | null) => {
        if (!playerUuid || !sourceKey) {
            return;
        }

        if (element) {
            opponentSourceRefs.current[playerUuid] = {
                ...opponentSourceRefs.current[playerUuid],
                [sourceKey]: element,
            };
        } else {
            const playerSources = opponentSourceRefs.current[playerUuid];
            if (!playerSources) {
                return;
            }

            delete playerSources[sourceKey];
            if (Object.keys(playerSources).length === 0) {
                delete opponentSourceRefs.current[playerUuid];
            }
        }
    }, []);

    const playCardFlight = useCallback((playerUuid: string, cards: string[]) => {
        const paceDelayMs = actionPaceDelayMsRef.current;
        const resetToken = gameProgressionResetTokenRef.current;
        blockGameProgressionRef.current();

        if (!canAnimateCardFlights || cards.length === 0) {
            const passDelayMs = cards.length === 0
                ? paceDelayMs + passPacingAnimationMsRef.current
                : paceDelayMs;
            releaseGameProgressionAfterRef.current(passDelayMs);
            return;
        }

        const targetRect = getVisibleElementRect([
            desktopCardLaneTargetRef.current,
            mobileCardLaneTargetRef.current,
            desktopTableTargetRef.current,
            mobileTableTargetRef.current,
        ]);
        if (!targetRect) {
            releaseGameProgressionAfterRef.current(paceDelayMs);
            return;
        }

        const isSelfPlay = playerUuid === uuid;
        const sourceRects = isSelfPlay
            ? cards
                .map(card => handCardRefs.current[card])
                .filter((element): element is HTMLDivElement => Boolean(element))
                .map(rectFromElement)
            : (() => {
                const sourceRect = getVisibleElementRect(Object.values(opponentSourceRefs.current[playerUuid] ?? {}));
                return sourceRect ? cards.map(() => sourceRect) : [];
            })();

        if (sourceRects.length === 0) {
            releaseGameProgressionAfterRef.current(paceDelayMs);
            return;
        }

        const playKey = getTablePlayKey(playerUuid, cards);
        setSuppressedTablePlayKey(playKey);

        void queueCardFlight({
            cards,
            sourceRects,
            targetRect,
            sourceKind: isSelfPlay ? "self" : "opponent",
        }).then(() => {
            if (gameProgressionResetTokenRef.current !== resetToken) {
                return;
            }

            releaseGameProgressionAfterRef.current(paceDelayMs);
            setSuppressedTablePlayKey(currentKey => currentKey === playKey ? null : currentKey);
        });
    }, [canAnimateCardFlights, queueCardFlight, uuid]);

    const playCardFlightRef = useRef(playCardFlight);
    useEffect(() => {
        playCardFlightRef.current = playCardFlight;
    }, [playCardFlight]);

    // Helper function to get display name from UUID or return the original value if it's already a username
    const getDisplayName = (uuidOrName: string, mapping: Record<string, string>) => {
        return mapping[uuidOrName] || uuidOrName;
    };

    const getBotDifficulty = (playerUuid: string) => botDifficultyByUuid[playerUuid] ?? "easy";

    // Helper function to render player name with bot badge if applicable
    const renderPlayerName = (playerUuid: string, mapping: Record<string, string>, size: "xs" | "sm" | "md" | "lg" = "xs") => {
        const displayName = getDisplayName(playerUuid, mapping);
        const isBot = botUuids.has(playerUuid);
        const isAiBot = isBot && getBotDifficulty(playerUuid) === "ai";

        return (
            <div className="flex items-center justify-center gap-1.5 text-foreground min-w-0">
                <span className={cn("font-semibold truncate", {
                    "text-xs": size === "xs",
                    "text-sm": size === "sm",
                    "text-base": size === "md",
                    "text-lg": size === "lg"
                })}>
                    {displayName || "Opponent"}
                </span>
                {isBot && (
                    <Badge variant="secondary" className="px-1 py-0 text-[10px] uppercase tracking-wide flex-shrink-0 inline-flex items-center gap-1">
                        {isAiBot ? (
                            <BrainCircuit className="h-2.5 w-2.5" />
                        ) : (
                            <Bot className="h-2.5 w-2.5" />
                        )}
                        {isAiBot ? "AI" : "Bot"}
                    </Badge>
                )}
            </div>
        );
    };

    // Helper function to get player position based on player list
    const getPlayerPositions = (playerList: string[], currentPlayerUuid: string) => {
        const currentIndex = playerList.indexOf(currentPlayerUuid);
        if (currentIndex === -1) return { top: "", left: "", right: "" };

        // Calculate positions: current player is at bottom, turn order: right → top → left
        // For 4 players: current player at bottom, then right, top, left
        const rightIndex = (currentIndex + 1) % playerList.length;
        const topIndex = (currentIndex + 2) % playerList.length;
        const leftIndex = (currentIndex + 3) % playerList.length;

        return {
            top: playerList[topIndex],
            left: playerList[leftIndex],
            right: playerList[rightIndex],
        };
    };

    // Helper function to create game state from game data
    const createGameState = (
        cards: string[],
        currentTurn: string,
        playerList: string[],
        selfUuid: string,
        lastPlayedCards: string[] = [],
        lastPlayedBy = "",
    ) => {
        const currentPlayer: Player = {
            name: selfUuid,
            cards: cards,
            cardCount: cards.length,
            isCurrentPlayer: true,
            isCurrentTurn: false,
            hasPassed: false,
        };

        const otherPlayers: Player[] = playerList
            .filter(playerUuid => playerUuid !== selfUuid)
            .map(playerUuid => ({
                name: playerUuid,
                cards: [],
                cardCount: 13, // Default value, will be overridden by GAME_STARTED payload if available
                isCurrentPlayer: false,
                isCurrentTurn: false,
                hasPassed: false,
            }));

        return {
            players: [currentPlayer, ...otherPlayers],
            currentTurn,
            currentPlayer: selfUuid,
            selectedCards: [],
            gameStarted: true,
            playerList,
            lastPlayedCards,
            lastPlayedBy,
            lastPlaysByPlayer: {}, // Initialize empty
            gameWon: false,
            winner: "",
            uuidToName: {},
            focusedCardIndex: null,
        };
    };

    const [gameState, setGameState] = useState<GameState>(() => {
        // Initialize with initial game data if provided
        if (initialGameData) {
            const gameState = createGameState(
                initialGameData.cards,
                initialGameData.currentTurn,
                initialGameData.playerList,
                uuid,
                initialGameData.lastPlayedCards || [],
                initialGameData.lastPlayedBy || "",
            );
            if (initialGameData.cardCounts) {
                gameState.players = gameState.players.map(player => ({
                    ...player,
                    cardCount: initialGameData.cardCounts?.[player.name] ?? player.cardCount,
                }));
            }
            return { ...gameState, uuidToName: mapping };
        }

        return {
            players: [],
            currentTurn: "",
            currentPlayer: uuid,
            selectedCards: [],
            gameStarted: false,
            playerList: [uuid],
            lastPlayedCards: [],
            lastPlayedBy: "",
            lastPlaysByPlayer: {},
            gameWon: false,
            winner: "",
            uuidToName: mapping,
            focusedCardIndex: null,
        };
    });

    // Keep UUID to name mapping in sync with parent component updates
    useEffect(() => {
        setGameState(prev => ({
            ...prev,
            uuidToName: mapping,
        }));
    }, [mapping]);

    // WebSocket message handlers
    const messageHandlers = useRef<Record<string, (message: WebSocketMessage) => void>>({
        // PLAYERS_LIST: No longer needed - mapping is passed as prop from GameRoom

        GAME_STARTED: (message) => {
            resetGameProgressionQueue();

            const payload = message.payload as {
                current_turn?: string;
                cards?: string[];
                player_list?: string[];
                card_counts?: Record<string, number>;
                last_played_cards?: string[];
                last_played_by?: string;
                last_plays_by_player?: Record<string, string[]>;
            };

            if (!payload?.current_turn || !Array.isArray(payload.cards) || !Array.isArray(payload.player_list)) {
                return;
            }

            const cardCounts = payload.card_counts;
            const lastCards = payload.last_played_cards;
            const lastPlayer = payload.last_played_by;
            const lastPlaysByPlayer = payload.last_plays_by_player || {};

            // Reset game state to ensure opponent card counts are correctly initialized
            setGameState(prev => {
                const nextState = createGameState(
                    Array.isArray(payload.cards) ? payload.cards : [],
                    payload.current_turn || "",
                    Array.isArray(payload.player_list) ? payload.player_list : [],
                    uuid,
                    Array.isArray(lastCards) ? lastCards : [],
                    lastPlayer || "",
                );

                // Override card counts with server-provided values if available
                if (cardCounts) {
                    nextState.players = nextState.players.map(player => ({
                        ...player,
                        cardCount: cardCounts[player.name] ?? player.cardCount,
                    }));
                }

                return {
                    ...nextState,
                    lastPlaysByPlayer, // Set the per-player last plays from server
                    uuidToName: prev.uuidToName,
                };
            });
        },

        TURN_CHANGE: (message) => {
            const payload = message.payload as { player?: string };
            const player = payload?.player;
            if (!player) {
                return;
            }
            setGameState(prev => ({
                ...prev,
                currentTurn: player,
                players: prev.players.map(p => ({
                    ...p,
                    isCurrentTurn: p.name === player,
                    // Clear hasPassed when it becomes this player's turn
                    hasPassed: p.name === player ? false : p.hasPassed,
                })),
            }));

            const paceDelayMs = actionPaceDelayMsRef.current;
            if (paceDelayMs > 0) {
                blockGameProgressionRef.current();
                releaseGameProgressionAfterRef.current(paceDelayMs);
            }
        },

        MOVE_PLAYED: (message) => {
            const payload = message.payload as {
                player?: string;
                cards?: string[];
                remaining_cards?: number;
            };
            const player = payload?.player;
            const cards = payload?.cards;
            // Use server-provided card count if available (recommended backend change)
            const serverCardCount = payload?.remaining_cards;

            if (!player || !Array.isArray(cards)) {
                return;
            }

            playCardFlightRef.current(player, cards);

            setGameState(prev => {
                const isCurrentPlayerMove = player === uuid && cards.length > 0;
                const updatedPlayers = prev.players.map(p => {
                    if (p.name !== player) {
                        return p;
                    }

                    if (cards.length === 0) {
                        return { ...p, hasPassed: true };
                    }

                    // For current player, use the actual cards array as source of truth
                    if (player === uuid) {
                        const remainingCards = p.cards.filter(card => !cards.includes(card));
                        return {
                            ...p,
                            cards: remainingCards,
                            cardCount: remainingCards.length,
                            hasPassed: false,
                        };
                    }

                    // For opponents, prefer server-provided count if available, otherwise calculate
                    // Use server count if provided, otherwise fall back to calculation
                    const updatedCount = serverCardCount !== undefined
                        ? serverCardCount
                        : Math.max(0, p.cardCount - cards.length);

                    return {
                        ...p,
                        cardCount: updatedCount,
                        hasPassed: false,
                    };
                });

                // Reset focusedCardIndex when current player's cards change, or if it's out of bounds
                const newCardCount = isCurrentPlayerMove
                    ? updatedPlayers.find(p => p.isCurrentPlayer)?.cardCount || 0
                    : prev.players.find(p => p.isCurrentPlayer)?.cardCount || 0;
                const shouldResetFocus = isCurrentPlayerMove ||
                    (prev.focusedCardIndex !== null && prev.focusedCardIndex >= newCardCount);

                // Detect if this is a new round: when someone plays cards after the table was cleared
                // (i.e., lastPlayedCards was empty and now someone is playing cards)
                const isNewRound = prev.lastPlayedCards.length === 0 && cards.length > 0;

                // Update lastPlaysByPlayer to track this player's last play
                // Clear all last plays if this is a new round (table was cleared by 3 consecutive passes)
                const updatedLastPlaysByPlayer = isNewRound
                    ? { [player]: cards } // Start fresh for new round
                    : {
                        ...prev.lastPlaysByPlayer,
                        [player]: cards, // Empty array if pass, cards if played
                    };

                return {
                    ...prev,
                    lastPlayedCards: cards.length > 0 ? cards : prev.lastPlayedCards,
                    lastPlayedBy: cards.length > 0 ? player : prev.lastPlayedBy,
                    lastPlaysByPlayer: updatedLastPlaysByPlayer,
                    players: updatedPlayers,
                    focusedCardIndex: shouldResetFocus ? null : prev.focusedCardIndex,
                };
            });
        },

        LEAVE: (message) => {
            resetGameProgressionQueue();

            const payload = message.payload as { player?: string };
            const departingPlayer = payload?.player;
            if (!departingPlayer) {
                return;
            }

            setGameState(prev => {
                if (!prev.playerList.includes(departingPlayer)) {
                    return prev;
                }

                const updatedPlayerList = prev.playerList.filter(uuid => uuid !== departingPlayer);
                const updatedPlayers = prev.players.filter(player => player.name !== departingPlayer);
                const remainingLastPlays = { ...prev.lastPlaysByPlayer };
                delete remainingLastPlays[departingPlayer];
                const shouldClearLastPlayed = prev.lastPlayedBy === departingPlayer;
                const isCurrentTurnDeparting = prev.currentTurn === departingPlayer;

                return {
                    ...prev,
                    players: updatedPlayers,
                    playerList: updatedPlayerList,
                    lastPlaysByPlayer: remainingLastPlays,
                    lastPlayedBy: shouldClearLastPlayed ? "" : prev.lastPlayedBy,
                    lastPlayedCards: shouldClearLastPlayed ? [] : prev.lastPlayedCards,
                    currentTurn: isCurrentTurnDeparting ? "" : prev.currentTurn,
                };
            });
        },

        GAME_WON: (message) => {
            const winner = message.payload.winner as string;
            const winningHand = Array.isArray(message.payload.winning_hand)
                ? (message.payload.winning_hand as string[])
                : [];
            console.log(`Game won by ${winner}!`);

            setGameState(prev => {
                const updatedPlayers = prev.players.map(player =>
                    player.name === winner
                        ? { ...player, cardCount: 0, cards: [] }
                        : player
                );

                return {
                    ...prev,
                    players: updatedPlayers,
                    gameWon: true,
                    winner: winner,
                    lastPlayedCards: winningHand.length > 0 ? winningHand : prev.lastPlayedCards,
                    lastPlayedBy: winner,
                };
            });
        },
    });

    const handleParsedMessage = useCallback((message: WebSocketMessage) => {
        const handler = messageHandlers.current[message.type];

        if (handler) {
            handler(message);
        } else {
            console.log(`Unhandled message type: ${message.type}`);
        }
    }, []);

    const handleParsedMessageSafely = useCallback((message: WebSocketMessage) => {
        try {
            handleParsedMessage(message);
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    }, [handleParsedMessage]);

    const drainGameProgressionQueue = useCallback(() => {
        if (gameProgressionBlockedRef.current || isDrainingGameProgressionQueueRef.current) {
            return;
        }

        isDrainingGameProgressionQueueRef.current = true;
        try {
            while (!gameProgressionBlockedRef.current && queuedGameProgressionMessagesRef.current.length > 0) {
                const nextMessage = queuedGameProgressionMessagesRef.current.shift();
                if (nextMessage) {
                    handleParsedMessageSafely(nextMessage);
                }
            }
        } finally {
            isDrainingGameProgressionQueueRef.current = false;
        }
    }, [handleParsedMessageSafely]);

    useEffect(() => {
        drainGameProgressionQueueRef.current = drainGameProgressionQueue;
    }, [drainGameProgressionQueue]);

    const processMessage = useCallback((msg: string) => {
        try {
            const message = JSON.parse(msg) as WebSocketMessage;

            if (
                gameProgressionBlockedRef.current &&
                !isDrainingGameProgressionQueueRef.current &&
                PACED_GAME_MESSAGE_TYPES.has(message.type)
            ) {
                queuedGameProgressionMessagesRef.current.push(message);
                return;
            }

            handleParsedMessageSafely(message);
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    }, [handleParsedMessageSafely]);

    // Set up WebSocket message listener for game-specific messages
    useEffect(() => {
        if (socket) {
            const cleanupListener = socket.addMessageListener((data: string) => {
                processMessage(data);
            });

            // Cleanup function to remove listener
            return () => {
                cleanupListener();
            };
        }
    }, [processMessage, socket]);

    const currentPlayer = gameState.players.find(p => p.name === uuid);
    const isCurrentTurn = gameState.currentTurn === uuid && !gameState.gameWon;

    // Get player positions based on player list (memoized to prevent unnecessary recalculations)
    const playerPositions = useMemo(
        () => getPlayerPositions(gameState.playerList, uuid),
        [gameState.playerList, uuid]
    );
    const topPlayer = playerPositions.top ? gameState.players.find(p => p.name === playerPositions.top) : undefined;
    const leftPlayer = playerPositions.left ? gameState.players.find(p => p.name === playerPositions.left) : undefined;
    const rightPlayer = playerPositions.right ? gameState.players.find(p => p.name === playerPositions.right) : undefined;

    const handleCardClick = (card: string) => {
        const newSelectedCards = gameState.selectedCards.includes(card)
            ? gameState.selectedCards.filter(c => c !== card)
            : [...gameState.selectedCards, card];

        setGameState(prev => ({
            ...prev,
            selectedCards: newSelectedCards,
        }));
    };

    const handleCardsReorder = (newOrder: string[]) => {
        setGameState(prev => {
            const currentPlayerState = prev.players.find(p => p.isCurrentPlayer);
            if (!currentPlayerState) return prev;

            const updatedPlayers = prev.players.map(player =>
                player.isCurrentPlayer
                    ? { ...player, cards: newOrder, cardCount: newOrder.length }
                    : player
            );

            return {
                ...prev,
                players: updatedPlayers,
                // Reset focus when cards are reordered to prevent stale index
                focusedCardIndex: null,
            };
        });
    };

    const handleSortCards = (sortType: SortType) => {
        setGameState(prev => {
            const currentPlayerState = prev.players.find(p => p.isCurrentPlayer);
            if (!currentPlayerState) return prev;

            const sortedCards = sortSelectedCards(
                currentPlayerState.cards,
                prev.selectedCards,
                sortType
            );

            const updatedPlayers = prev.players.map(player =>
                player.isCurrentPlayer
                    ? { ...player, cards: sortedCards, cardCount: sortedCards.length }
                    : player
            );

            return {
                ...prev,
                players: updatedPlayers,
                selectedCards: [], // Clear selection after sorting
                focusedCardIndex: null, // Reset focus when cards are reordered
            };
        });
    };

    const handlePlayCards = () => {
        if (gameState.selectedCards.length === 0) return;
        if (isActionPacing) return;

        if (!isConnected || !socket?.isConnected()) {
            console.warn("Cannot send move: not connected");
            return;
        }

        socket.send(JSON.stringify({
            type: "MOVE",
            payload: {
                cards: gameState.selectedCards,
            },
        }));

        setGameState(prev => ({
            ...prev,
            selectedCards: [],
            focusedCardIndex: 0, // Reset focus to first card after playing
        }));
        // Reset rank cycle tracking when playing cards
        rankCycleIndexRef.current = {};
    };

    const handlePass = () => {
        if (isActionPacing) return;

        if (!isConnected || !socket?.isConnected()) {
            console.warn("Cannot pass: not connected");
            return;
        }

        socket.send(JSON.stringify({
            type: "MOVE",
            payload: {
                cards: [],
            },
        }));
    };

    const handleDeselectAll = () => {
        setGameState(prev => ({
            ...prev,
            selectedCards: [],
        }));
        // Reset rank cycle tracking when clearing selection
        rankCycleIndexRef.current = {};
    };

    const handleEscape = () => {
        setGameState(prev => ({
            ...prev,
            focusedCardIndex: null,
        }));
    };

    // Keyboard shortcut handlers
    const handleRankKeyPress = useCallback((rank: string) => {
        const currentPlayerCards = currentPlayer?.cards || [];
        const matchingCards = findCardsByRank(currentPlayerCards, rank);

        if (matchingCards.length === 0) {
            return; // No cards with this rank
        }

        // Get current cycle index for this rank (default to 0)
        const currentIndex = rankCycleIndexRef.current[rank] || 0;

        // Stack behavior: if we've cycled through all cards, pop the first one
        if (currentIndex >= matchingCards.length) {
            const firstCardToRemove = matchingCards[0];

            setGameState(prev => ({
                ...prev,
                selectedCards: prev.selectedCards.filter(card => card !== firstCardToRemove),
            }));

            // Reset cycle to start from index 0 again
            rankCycleIndexRef.current[rank] = 0;
            return;
        }

        // Select the card at the current cycle index
        const cardToSelect = matchingCards[currentIndex];
        const cardIndexInHand = currentPlayerCards.indexOf(cardToSelect);

        setGameState(prev => {
            const isAlreadySelected = prev.selectedCards.includes(cardToSelect);

            if (!isAlreadySelected) {
                return {
                    ...prev,
                    selectedCards: [...prev.selectedCards, cardToSelect],
                    focusedCardIndex: cardIndexInHand, // Move cursor to selected card
                };
            }

            return {
                ...prev,
                focusedCardIndex: cardIndexInHand, // Move cursor even if already selected
            };
        });

        // Increment cycle index for next press
        rankCycleIndexRef.current[rank] = currentIndex + 1;
    }, [currentPlayer?.cards]);

    const handleArrowKeyScroll = useCallback((direction: "left" | "right", heldRank: string | null) => {
        const currentPlayerCards = currentPlayer?.cards || [];
        if (currentPlayerCards.length === 0) return;

        // Case 1: Holding a rank key - scroll through cards of that rank
        if (heldRank) {
            const matchingCards = findCardsByRank(currentPlayerCards, heldRank);

            if (matchingCards.length === 0) return;

            // Get current cycle index
            const currentIndex = rankCycleIndexRef.current[heldRank] || 0;

            // Calculate new index based on direction
            let newIndex = currentIndex;
            if (direction === "right") {
                newIndex = Math.min(currentIndex + 1, matchingCards.length);
            } else if (direction === "left") {
                newIndex = Math.max(currentIndex - 1, 0);
            }

            // Update cycle index
            rankCycleIndexRef.current[heldRank] = newIndex;

            // If index went beyond available cards, don't change selection
            if (newIndex >= matchingCards.length) {
                return;
            }

            // Deselect all cards with this rank, then select only the one at new index
            const cardAtNewIndex = matchingCards[newIndex];
            const cardIndexInHand = currentPlayerCards.indexOf(cardAtNewIndex);

            setGameState(prev => {
                const filteredSelection = prev.selectedCards.filter(
                    card => !matchingCards.includes(card)
                );

                return {
                    ...prev,
                    selectedCards: [...filteredSelection, cardAtNewIndex],
                    focusedCardIndex: cardIndexInHand,
                };
            });
        } else {
            // Case 2: Standalone arrow key navigation - just move cursor
            setGameState(prev => {
                let newIndex: number;

                if (prev.focusedCardIndex === null) {
                    // No cursor yet: start from leftmost (right) or rightmost (left)
                    newIndex = direction === "right" ? 0 : currentPlayerCards.length - 1;
                } else {
                    // Move cursor based on direction
                    newIndex = direction === "right"
                        ? prev.focusedCardIndex + 1
                        : prev.focusedCardIndex - 1;

                    // Boundary check - don't wrap
                    if (newIndex < 0 || newIndex >= currentPlayerCards.length) {
                        return prev;
                    }
                }

                return {
                    ...prev,
                    focusedCardIndex: newIndex,
                };
            });
        }
    }, [currentPlayer?.cards]);

    const handleSpacebarPress = useCallback(() => {
        const currentPlayerCards = currentPlayer?.cards || [];

        setGameState(prev => {
            // If no card is focused, do nothing
            if (prev.focusedCardIndex === null || prev.focusedCardIndex >= currentPlayerCards.length) {
                return prev;
            }

            const focusedCard = currentPlayerCards[prev.focusedCardIndex];

            // Toggle selection
            if (prev.selectedCards.includes(focusedCard)) {
                return {
                    ...prev,
                    selectedCards: prev.selectedCards.filter(c => c !== focusedCard),
                };
            } else {
                return {
                    ...prev,
                    selectedCards: [...prev.selectedCards, focusedCard],
                };
            }
        });
    }, [currentPlayer?.cards]);

    const handleUpArrowPress = useCallback(() => {
        const currentPlayerCards = currentPlayer?.cards || [];

        setGameState(prev => {
            // If no card is focused, do nothing
            if (prev.focusedCardIndex === null || prev.focusedCardIndex >= currentPlayerCards.length) {
                return prev;
            }

            const focusedCard = currentPlayerCards[prev.focusedCardIndex];

            // Select card (only if not already selected)
            if (!prev.selectedCards.includes(focusedCard)) {
                return {
                    ...prev,
                    selectedCards: [...prev.selectedCards, focusedCard],
                };
            }

            return prev;
        });
    }, [currentPlayer?.cards]);

    const handleDownArrowPress = useCallback(() => {
        const currentPlayerCards = currentPlayer?.cards || [];

        setGameState(prev => {
            // If no card is focused, do nothing
            if (prev.focusedCardIndex === null || prev.focusedCardIndex >= currentPlayerCards.length) {
                return prev;
            }

            const focusedCard = currentPlayerCards[prev.focusedCardIndex];

            // Deselect card (only if selected)
            if (prev.selectedCards.includes(focusedCard)) {
                return {
                    ...prev,
                    selectedCards: prev.selectedCards.filter(c => c !== focusedCard),
                };
            }

            return prev;
        });
    }, [currentPlayer?.cards]);

    // Detect if desktop (md breakpoint = 768px)
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setIsDesktop(window.innerWidth >= 768);
            }, 100);
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Integrate keyboard shortcuts hook
    useKeyboardShortcuts({
        onRankKey: handleRankKeyPress,
        onArrowKey: handleArrowKeyScroll,
        onUpArrow: handleUpArrowPress,
        onDownArrow: handleDownArrowPress,
        onSpacebar: handleSpacebarPress,
        onEnter: handlePlayCards,
        onBackspace: handleDeselectAll,
        onPass: handlePass,
        onEscape: handleEscape,
        isEnabled: isDesktop,
        isCurrentTurn: isCurrentTurn && !isActionPacing,
        gameWon: gameState.gameWon,
        canPass: gameState.lastPlayedCards.length > 0 && !isActionPacing,
    });

    const getCardCountLabel = (player?: Player) => {
        if (!player) {
            return "0 cards";
        }
        if (player.cardCount === 0 && gameState.gameWon) {
            return "WIN";
        }
        return `${player.cardCount} cards`;
    };

    const renderTopCardBacks = (count?: number) => (
        <div className="flex items-center justify-center">
            {Array.from({ length: Math.min(count ?? 0, 13) }).map((_, index) => (
                <div
                    key={`top-card-${index}`}
                    className={cn(
                        "h-8 w-5 rounded border border-blue-600/40 bg-blue-500/80 shadow-sm sm:h-9 sm:w-6 md:h-10 md:w-7",
                        index > 0 && "-ml-1.5 sm:-ml-2 md:-ml-2.5"
                    )}
                    style={{ zIndex: 13 - index }}
                />
            ))}
        </div>
    );

    const renderConnectionBanner = (compact = false) => {
        const isBannerVisible = connectionState === ConnectionState.RECONNECTING || connectionState === ConnectionState.FAILED;

        return (
            <div className={cn("flex min-h-[40px] items-center justify-center", compact && "min-h-[32px]")}>
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-opacity duration-200",
                        compact ? "px-3 py-1.5 text-xs" : "text-sm",
                        isBannerVisible
                            ? "opacity-100"
                            : "pointer-events-none opacity-0"
                    )}
                >
                    <WifiOff className={cn("h-4 w-4 flex-shrink-0", compact && "h-3 w-3")} />
                    <span>
                        {connectionState === ConnectionState.RECONNECTING
                            ? "Connection lost. Reconnecting..."
                            : "Connection failed. Please refresh the page."}
                    </span>
                </div>
            </div>
        );
    };

    const renderPlayerPassTag = (hasPassed?: boolean, compact = false, placement: "above" | "below" = "above") => {
        const isVisible = Boolean(hasPassed) && !gameState.gameWon;

        return (
            <div
                className={cn(
                    "pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 justify-center transition-opacity duration-200",
                    placement === "above"
                        ? "top-0 -translate-y-[calc(100%+0.25rem)]"
                        : "top-full translate-y-1",
                    !isVisible && "opacity-0"
                )}
                aria-hidden={!isVisible}
            >
                <Badge
                    variant="secondary"
                    className={cn(
                        "justify-center border-amber-500/40 bg-amber-500/20 uppercase tracking-wide text-amber-700 shadow-sm dark:text-amber-300",
                        compact ? "min-w-[72px] px-2.5 py-1 text-[10px]" : "min-w-[88px] px-3 py-1.5 text-xs"
                    )}
                >
                    Pass
                </Badge>
            </div>
        );
    };

    // Render side player with cards (for left/right players) - Desktop only
    const renderSidePlayer = (playerUuid: string, player: Player | undefined, rotation: "left" | "right") => {
        const rotationClass = rotation === "left" ? "rotate-90" : "-rotate-90";

        return (
            <div
                ref={(element) => registerOpponentSourceRef(playerUuid, `desktop-${rotation}`, element)}
                className={cn("flex flex-col gap-1.5 sm:gap-2", rotationClass, "origin-center")}
            >
                {/* Top Region: Last played cards */}
                <div className="flex items-center justify-center min-h-[50px] sm:min-h-[60px] md:min-h-[70px] min-w-[70px] sm:min-w-[80px] md:min-w-[100px]">
                    {renderLastPlayedForPlayer(playerUuid)}
                </div>

                {/* Bottom Region: Player info and card backs */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Badge
                            variant={gameState.currentTurn === playerUuid ? "secondary" : "outline"}
                            className={cn(
                                "relative flex items-center gap-1.5 overflow-visible rounded-full px-2 py-1 text-[10px] shadow-sm transition-colors whitespace-nowrap sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs md:py-2 md:text-sm",
                                gameState.currentTurn === playerUuid && "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                            )}
                        >
                        {renderPlayerPassTag(player?.hasPassed, true)}
                        {renderPlayerName(playerUuid, gameState.uuidToName, "xs")}
                        <Badge variant="outline" className="h-4 px-1 text-[10px] flex-shrink-0 sm:h-5 sm:px-1.5 sm:text-xs md:h-6 md:px-2 md:text-sm">
                            {player?.cardCount || 0}
                        </Badge>
                    </Badge>
                    <div className="flex items-center justify-center">
                        {Array.from({ length: Math.min(player?.cardCount ?? 0, 13) }).map((_, index) => (
                            <div
                                key={`side-card-${index}`}
                                className={cn(
                                    "h-5 w-3 rounded border border-blue-600/40 bg-blue-500/80 shadow-sm sm:h-6 sm:w-4 md:h-8 md:w-5",
                                    index > 0 && "-ml-1 sm:-ml-1.5 md:-ml-2"
                                )}
                                style={{ zIndex: 13 - index }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Render compact opponent card for mobile - minimal design
    const renderMobileOpponent = (playerUuid: string, player: Player | undefined) => {
        const isActive = gameState.currentTurn === playerUuid;
        const displayName = getDisplayName(playerUuid, gameState.uuidToName);
        const isBot = botUuids.has(playerUuid);
        const isAiBot = isBot && getBotDifficulty(playerUuid) === "ai";
        const lastPlayed = gameState.lastPlaysByPlayer[playerUuid];

        return (
            <div
                ref={(element) => registerOpponentSourceRef(playerUuid, "mobile", element)}
                key={playerUuid}
                className={cn(
                    "relative flex min-h-[78px] flex-col items-center gap-0.5 overflow-visible rounded-lg px-2 py-1.5 transition-colors",
                    isActive && "bg-primary/10 ring-1 ring-primary/30"
                )}
            >
                {renderPlayerPassTag(player?.hasPassed, true)}

                {/* Player circle indicator */}
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground"
                )}>
                    {player?.cardCount || 0}
                </div>

                {/* Player name - truncated */}
                <div className="flex items-center gap-0.5 max-w-[80px]">
                    <span className="text-[10px] font-medium truncate">
                        {displayName}
                    </span>
                    {isBot && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] px-1 rounded bg-secondary text-secondary-foreground">
                            {isAiBot ? (
                                <BrainCircuit className="h-2 w-2" />
                            ) : (
                                <Bot className="h-2 w-2" />
                            )}
                            {isAiBot ? "AI" : "Bot"}
                        </span>
                    )}
                </div>

                {/* Last played indicator - compact */}
                {lastPlayed !== undefined && lastPlayed.length > 0 && (
                    <div className="flex items-center justify-center min-h-[20px] mt-0.5">
                        <div className="flex items-center gap-0.5">
                            {lastPlayed.slice(0, 5).map((card, index) => {
                                const suit = card.slice(-1);
                                const rank = card.slice(0, -1);
                                return (
                                    <div
                                        key={`mini-${playerUuid}-${card}-${index}`}
                                        className={cn(
                                            "flex flex-col items-center justify-center rounded border border-border bg-white dark:bg-slate-900 shadow-sm",
                                            "h-5 w-3.5 text-[6px] font-bold",
                                            getSuitColorClass(suit, theme)
                                        )}
                                    >
                                        <span className="leading-none">{getRankDisplay(rank)}</span>
                                        <span className="text-[8px] leading-none">{getSuitSymbol(suit)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Helper function to render last played cards for a specific player
    const renderLastPlayedForPlayer = (playerUuid: string) => {
        const cards = gameState.lastPlaysByPlayer[playerUuid];

        const containerClassName = "flex h-[54px] w-[132px] items-center justify-center overflow-hidden sm:h-[64px] sm:w-[168px] md:h-[76px] md:w-[220px]";

        if (!cards) {
            return <div className={containerClassName} aria-hidden />;
        }

        if (cards.length === 0) {
            return <div className={containerClassName} aria-hidden />;
        }

        const isSuppressed = suppressedTablePlayKey === getTablePlayKey(playerUuid, cards);

        return (
            <div className={containerClassName}>
                <div className={cn("flex items-center justify-center transition-opacity duration-150", isSuppressed && "opacity-0")}>
                    {cards.map((card, index) => {
                        const suit = card.slice(-1);
                        const rank = card.slice(0, -1);

                        return (
                            <div
                                key={`${playerUuid}-${card}-${index}`}
                                className={cn(
                                    "flex flex-col items-center justify-center rounded border-2 border-border bg-white font-bold shadow-md dark:border-slate-700 dark:bg-slate-900",
                                    "w-8 aspect-[5/7] text-[10px] sm:w-10 sm:text-xs md:w-12 md:text-sm",
                                    getSuitColorClass(suit, theme),
                                    index > 0 && "-ml-2 sm:-ml-3 md:-ml-4"
                                )}
                                style={{ zIndex: cards.length - index }}
                            >
                                <span className="leading-tight">{getRankDisplay(rank)}</span>
                                <span className="text-sm leading-tight sm:text-lg md:text-2xl">{getSuitSymbol(suit)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderLastPlayedCards = (options: {
        labelOverride?: string;
        mobileLabelOverride?: string;
    } = {}) => {
        if (gameState.lastPlayedCards.length === 0) {
            return null;
        }

        const { labelOverride, mobileLabelOverride } = options;

        const displayName = getDisplayName(gameState.lastPlayedBy, gameState.uuidToName);
        const isSelfPlay = gameState.lastPlayedBy === uuid;
        const isSuppressed = suppressedTablePlayKey === getTablePlayKey(gameState.lastPlayedBy, gameState.lastPlayedCards);
        const desktopLabel = labelOverride ?? (isSelfPlay ? "You played:" : `${displayName} played:`);
        const mobileLabel = mobileLabelOverride ?? (isSelfPlay ? "You" : displayName.slice(0, 8));

        return (
            <div className="grid h-full w-full grid-rows-[18px_minmax(0,1fr)] items-center gap-2">
                <span className="hidden text-center text-sm uppercase tracking-wide text-muted-foreground md:block">
                    {desktopLabel}
                </span>
                <span className="block text-center text-xs uppercase tracking-wide text-muted-foreground md:hidden">
                    {mobileLabel}
                </span>
                <div
                    ref={desktopCardLaneTargetRef}
                    className={cn("flex h-full items-center justify-center overflow-hidden transition-opacity duration-100", isSuppressed && "opacity-0")}
                >
                    {gameState.lastPlayedCards.map((card, index) => {
                        const suit = card.slice(-1);
                        const rank = card.slice(0, -1);

                        return (
                            <div
                                key={`${card}-${index}`}
                                className={cn(
                                    "flex flex-col items-center justify-center rounded border-2 border-border bg-white font-bold shadow-md dark:border-slate-700 dark:bg-slate-900",
                                    "h-14 w-10 text-xs sm:h-16 sm:w-12 sm:text-sm md:h-[72px] md:w-[52px] md:text-base",
                                    getSuitColorClass(suit, theme),
                                    index > 0 && "-ml-2 sm:-ml-3 md:-ml-4"
                                )}
                                style={{ zIndex: gameState.lastPlayedCards.length - index }}
                            >
                                <span>{getRankDisplay(rank)}</span>
                                <span className="text-xl sm:text-2xl md:text-[28px]">{getSuitSymbol(suit)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Theme-responsive background styling
    const containerClassName = cn(
        "flex h-[calc(100dvh-60px)] min-h-0 w-full justify-center overflow-hidden bg-gradient-to-br",
        theme === "light"
            ? "from-slate-50 via-blue-50/60 to-blue-100/70"
            : "from-slate-950 via-slate-900 to-slate-800",
        "transition-colors duration-300"
    );

    return (
        <div className={containerClassName}>
            {cardFlightOverlay}
            <GameFeelSettingsDialog
                settings={gameFeelSettings}
                onSettingsChange={setGameFeelSettings}
            />

            {/* Keyboard Shortcuts Help Button - Fixed position in top-right corner (desktop only) */}
            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="fixed right-14 top-2 z-50 hidden h-8 w-8 rounded-full bg-background/80 shadow-md backdrop-blur-sm hover:bg-background/90 md:flex md:h-10 md:w-10"
                        title="Keyboard shortcuts"
                    >
                        <HelpCircle className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Keyboard Shortcuts</DialogTitle>
                        <DialogDescription>
                            Use these shortcuts to play more efficiently (desktop only)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        {/* Card Selection */}
                        <div>
                            <h4 className="mb-2 font-semibold text-sm">Card Selection</h4>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Move cursor left/right</span>
                                    <div className="flex gap-1">
                                        <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">←</kbd>
                                        <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">→</kbd>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Select focused card</span>
                                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">↑</kbd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Deselect focused card</span>
                                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">↓</kbd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Toggle selection</span>
                                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Space</kbd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Clear focus</span>
                                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Esc</kbd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Clear selection</span>
                                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Backspace</kbd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Select card by rank</span>
                                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">2-9, T (10), J, Q, K, A</kbd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Cycle through same rank</span>
                                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Press again</kbd>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div>
                            <h4 className="mb-2 font-semibold text-sm">Actions</h4>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Play selected cards</span>
                                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Enter</kbd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Pass turn</span>
                                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">P</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-2 py-1">
                {/* Top Player - Desktop layout */}
                <section className="hidden flex-shrink-0 flex-col items-center justify-start gap-1 py-0.5 md:flex">
                    {/* Bottom Region: Player info and card backs */}
                    <div
                        ref={(element) => registerOpponentSourceRef(playerPositions.top, "desktop-top", element)}
                        className="flex items-center gap-3"
                    >
                        <Badge
                            variant={gameState.currentTurn === playerPositions.top ? "secondary" : "outline"}
                            className={cn(
                                "relative flex min-h-[32px] min-w-[100px] flex-col items-center justify-center overflow-visible rounded px-2.5 py-1 text-center text-xs uppercase tracking-wide shadow-sm transition-colors",
                                gameState.currentTurn === playerPositions.top && "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                            )}
                        >
                            {renderPlayerPassTag(topPlayer?.hasPassed, true, "below")}
                            <div className="flex flex-col items-center gap-0">
                                {renderPlayerName(playerPositions.top, gameState.uuidToName, "xs")}
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    {getCardCountLabel(topPlayer)}
                                </span>
                            </div>
                        </Badge>
                        {renderTopCardBacks(topPlayer?.cardCount)}
                    </div>

                    {/* Top Region: Last played cards */}
                    <div className="flex items-center justify-center min-h-[44px] md:min-h-[56px] min-w-[100px] md:min-w-[120px]">
                        {renderLastPlayedForPlayer(playerPositions.top)}
                    </div>
                </section>

                {/* Mobile: Compact Opponents Bar - All 3 opponents in one row (turn order: left to right) */}
                <section className="flex flex-shrink-0 items-center justify-around gap-1 rounded-lg bg-muted/20 px-1 py-1.5 md:hidden">
                    {renderMobileOpponent(playerPositions.right, rightPlayer)}
                    {renderMobileOpponent(playerPositions.top, topPlayer)}
                    {renderMobileOpponent(playerPositions.left, leftPlayer)}
                </section>

                {/* Middle Row - Desktop layout */}
                <section className="hidden min-h-0 grid flex-1 grid-cols-[92px_1fr_92px] lg:grid-cols-[132px_1fr_132px] items-center gap-1.5 lg:gap-3 overflow-hidden py-0.5 md:grid">
                    {/* Left Player - Rotated 90deg clockwise */}
                    <div className="flex items-center justify-center px-2 lg:px-4">
                        {renderSidePlayer(playerPositions.left, leftPlayer, "left")}
                    </div>

                    {/* Center Game Area */}
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
                        {renderConnectionBanner()}
                        <Card className="w-full max-w-3xl overflow-hidden border border-primary/10 bg-card/90 text-center shadow-xl backdrop-blur">
                            <CardContent className="grid min-h-[220px] grid-rows-[auto_minmax(0,1fr)] gap-3 p-3 md:min-h-[250px] md:p-4">
                                {gameState.gameWon ? (
                                    <div className="flex h-full flex-col items-center justify-center gap-3 w-full">
                                        <p className="text-xl md:text-2xl font-bold text-emerald-500 flex-shrink-0">
                                            🎉 {gameState.winner === uuid ? "You won!" : `${getDisplayName(gameState.winner, gameState.uuidToName)} won!`}
                                        </p>
                                        {gameState.lastPlayedBy === gameState.winner && (
                                            <div className="py-1 w-full max-w-full overflow-hidden">
                                                <p className="text-xs md:text-sm uppercase tracking-wide text-muted-foreground mb-1.5 flex-shrink-0">
                                                    {gameState.winner === uuid
                                                        ? "Winning hand:"
                                                        : `${getDisplayName(gameState.winner, gameState.uuidToName)}'s hand:`}
                                                </p>
                                                <div className="flex flex-wrap justify-center gap-1 md:gap-1.5 max-w-full">
                                                    {gameState.lastPlayedCards.map((card, index) => {
                                                        const suit = card.slice(-1);
                                                        const rank = card.slice(0, -1);
                                                        return (
                                                            <div
                                                                key={`${card}-${index}`}
                                                                className={cn(
                                                                    "flex flex-col items-center justify-center rounded border-2 border-border bg-white font-bold shadow-md dark:border-slate-700 dark:bg-slate-900 flex-shrink-0",
                                                                    "h-12 w-9 text-xs md:h-14 md:w-10 md:text-sm",
                                                                    getSuitColorClass(suit, theme)
                                                                )}
                                                            >
                                                                <span>{getRankDisplay(rank)}</span>
                                                                <span className="text-lg md:text-xl">{getSuitSymbol(suit)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        <Button
                                            onClick={onReturnToLobby}
                                            size="default"
                                            className="mt-1 min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg flex-shrink-0"
                                        >
                                            Return to Lobby
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid h-full w-full grid-rows-[auto_minmax(0,1fr)] gap-3">
                                        <div className="flex min-h-[48px] items-center justify-center">
                                            <div className={cn(
                                                "flex min-h-[44px] min-w-[210px] items-center justify-center rounded-full border px-4 py-2 text-center text-base font-semibold shadow-sm transition-colors",
                                                isCurrentTurn
                                                    ? "border-primary/40 bg-primary/8 text-primary"
                                                    : "border-border/70 bg-background/70 text-foreground"
                                            )}>
                                                {isCurrentTurn
                                                    ? "Your turn"
                                                    : `${getDisplayName(gameState.currentTurn, gameState.uuidToName)}'s turn`}
                                            </div>
                                        </div>
                                        <div
                                            ref={desktopTableTargetRef}
                                            className="flex min-h-[132px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/35 px-3 py-3"
                                        >
                                            {gameState.lastPlayedCards.length > 0 ? (
                                                renderLastPlayedCards()
                                            ) : (
                                                <div
                                                    ref={desktopCardLaneTargetRef}
                                                    className="flex min-h-[84px] min-w-[180px] flex-col items-center justify-center gap-2 text-center"
                                                >
                                                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                                                        Table
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Waiting for the opening play.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Player - Rotated 270deg clockwise (-90deg) */}
                    <div className="flex items-center justify-center px-2 lg:px-4">
                        {renderSidePlayer(playerPositions.right, rightPlayer, "right")}
                    </div>
                </section>

                {/* Mobile: Center Game Area - Large focus on gameplay */}
                <section className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden py-2 px-2 md:hidden">
                    {renderConnectionBanner(true)}

                    {gameState.gameWon ? (
                        <div className="flex min-h-[210px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-primary/10 bg-card/90 px-4 py-4 text-center shadow-lg">
                            <p className="text-xl font-bold text-emerald-500">
                                🎉 {gameState.winner === uuid ? "You won!" : `${getDisplayName(gameState.winner, gameState.uuidToName)} won!`}
                            </p>
                            {gameState.lastPlayedBy === gameState.winner && (
                                <div className="w-full">
                                    <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
                                        {gameState.winner === uuid ? "Winning hand" : `${getDisplayName(gameState.winner, gameState.uuidToName)}'s hand`}
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-1.5">
                                        {gameState.lastPlayedCards.map((card, index) => {
                                            const suit = card.slice(-1);
                                            const rank = card.slice(0, -1);
                                            return (
                                                <div
                                                    key={`${card}-${index}`}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center rounded-lg border-2 border-border bg-white font-bold shadow-lg dark:border-slate-700 dark:bg-slate-900",
                                                        "h-16 w-11 text-sm",
                                                        getSuitColorClass(suit, theme)
                                                    )}
                                                >
                                                    <span>{getRankDisplay(rank)}</span>
                                                    <span className="text-2xl">{getSuitSymbol(suit)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <Button
                                onClick={onReturnToLobby}
                                size="default"
                                className="mt-2 min-w-[150px] bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
                            >
                                Back to Lobby
                            </Button>
                        </div>
                    ) : (
                        <div className="grid min-h-[196px] w-full grid-rows-[auto_minmax(0,1fr)] gap-3 rounded-2xl border border-primary/10 bg-card/90 px-3 py-4 shadow-lg">
                            <div className="flex items-center justify-center">
                                <div className={cn(
                                    "flex min-h-[42px] min-w-[190px] items-center justify-center rounded-full border px-4 py-2 text-center text-sm font-semibold shadow-sm transition-colors",
                                    isCurrentTurn
                                        ? "border-primary/40 bg-primary/8 text-primary"
                                        : "border-border/70 bg-background/70 text-foreground"
                                )}>
                                    {isCurrentTurn
                                        ? "Your turn"
                                        : `${getDisplayName(gameState.currentTurn, gameState.uuidToName)}'s turn`}
                                </div>
                            </div>

                            <div
                                ref={mobileTableTargetRef}
                                className="flex min-h-[118px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/35 px-3 py-3"
                            >
                                {gameState.lastPlayedCards.length > 0 ? (
                                    <div className="flex flex-col items-center gap-2 w-full">
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            {gameState.lastPlayedBy === uuid ? "You played" : `${getDisplayName(gameState.lastPlayedBy, gameState.uuidToName)} played`}
                                        </p>
                                        <div
                                            ref={mobileCardLaneTargetRef}
                                            className={cn(
                                                "flex flex-wrap justify-center gap-1.5 transition-opacity duration-100",
                                                suppressedTablePlayKey === getTablePlayKey(gameState.lastPlayedBy, gameState.lastPlayedCards) && "opacity-0"
                                            )}
                                        >
                                            {gameState.lastPlayedCards.map((card, index) => {
                                                const suit = card.slice(-1);
                                                const rank = card.slice(0, -1);
                                                return (
                                                    <div
                                                        key={`${card}-${index}`}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center rounded-lg border-2 border-border bg-white font-bold shadow-lg dark:border-slate-700 dark:bg-slate-900",
                                                            "h-16 w-11 text-sm",
                                                            getSuitColorClass(suit, theme)
                                                        )}
                                                    >
                                                        <span>{getRankDisplay(rank)}</span>
                                                        <span className="text-2xl">{getSuitSymbol(suit)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        ref={mobileCardLaneTargetRef}
                                        className="flex min-h-[76px] min-w-[150px] flex-col items-center justify-center gap-2 text-center"
                                    >
                                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                                            Table
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Waiting for the opening play.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Bottom Player */}
                <section className="mt-auto flex flex-shrink-0 flex-col gap-1 pt-1">
                    {/* Desktop: Full layout with sort buttons and badge */}
                    <div className="hidden items-center justify-between md:flex">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSortCards("numerical")}
                                title="Sort by rank (3 smallest, 2 biggest)"
                                className="h-7 px-3 text-xs"
                            >
                                Rank
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSortCards("suit")}
                                title="Sort by suit (♦♣♥♠)"
                                className="h-7 px-3 text-xs"
                            >
                                Suit
                            </Button>
                        </div>
                        <Badge
                            variant={gameState.currentTurn === uuid ? "secondary" : "outline"}
                            className={cn(
                                "relative flex min-h-[32px] min-w-[120px] flex-col items-center justify-center overflow-visible rounded-lg px-3 py-1.5 text-center text-xs uppercase tracking-wide",
                                gameState.currentTurn === uuid && !gameState.gameWon && "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                            )}
                        >
                            {renderPlayerPassTag(currentPlayer?.hasPassed)}
                            <span className="text-xs font-semibold">
                                {gameState.uuidToName[uuid] || username}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                                {getCardCountLabel(currentPlayer)}
                            </span>
                        </Badge>
                        <div className="w-32" aria-hidden />
                    </div>

                    {/* Mobile: Compact layout with sort and user info combined */}
                    <div className="flex items-center justify-between gap-1 md:hidden">
                        <div className="flex gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSortCards("numerical")}
                                title="Sort by rank"
                                className="h-7 px-2 text-xs"
                            >
                                Rank
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSortCards("suit")}
                                title="Sort by suit"
                                className="h-7 px-2 text-xs"
                            >
                                Suit
                            </Button>
                        </div>
                        <Badge
                            variant={gameState.currentTurn === uuid ? "secondary" : "outline"}
                            className={cn(
                                "relative flex h-7 items-center gap-1.5 overflow-visible rounded-full px-2 py-1 text-xs font-semibold",
                                gameState.currentTurn === uuid && !gameState.gameWon && "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                            )}
                        >
                            {renderPlayerPassTag(currentPlayer?.hasPassed, true)}
                            <span className="max-w-[6rem] truncate">{gameState.uuidToName[uuid] || username}</span>
                            <Badge variant="outline" className="h-5 px-1.5 text-xs">
                                {currentPlayer?.cardCount || 0}
                            </Badge>
                        </Badge>
                    </div>

                    <div className="flex min-h-0 justify-center">
                        <PlayerHand
                            cards={currentPlayer?.cards || []}
                            selectedCards={gameState.selectedCards}
                            focusedCardIndex={gameState.focusedCardIndex}
                            onCardClick={handleCardClick}
                            onCardsReorder={handleCardsReorder}
                            registerCardRef={registerHandCardRef}
                        />
                    </div>

                    {/* Desktop: Larger buttons */}
                    <div className="hidden flex-wrap items-center justify-center gap-2 pb-1 md:flex">
                        <Button
                            className="min-w-[120px]"
                            size="sm"
                            onClick={handlePlayCards}
                            disabled={gameState.selectedCards.length === 0 || !isCurrentTurn || isActionPacing || gameState.gameWon}
                        >
                            Play
                            {gameState.selectedCards.length > 0 && (
                                <span className="ml-2 text-sm font-medium">({gameState.selectedCards.length})</span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            className="min-w-[120px]"
                            size="sm"
                            onClick={handleDeselectAll}
                            disabled={gameState.selectedCards.length === 0}
                            title={gameState.selectedCards.length === 0 ? "No cards selected" : "Deselect all selected cards"}
                        >
                            Clear
                        </Button>
                        <Button
                            variant="outline"
                            className="min-w-[120px] border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-300 dark:hover:bg-orange-500/10"
                            size="sm"
                            onClick={handlePass}
                            disabled={!isCurrentTurn || isActionPacing || gameState.lastPlayedCards.length === 0 || gameState.gameWon}
                            title={gameState.gameWon
                                ? "Game is over"
                                : !isCurrentTurn
                                    ? "Not your turn"
                                    : gameState.lastPlayedCards.length === 0
                                        ? "Cannot pass on first move"
                                        : "Pass your turn (or press P key)"}
                        >
                            Pass
                        </Button>
                    </div>

                    {/* Mobile: Compact buttons */}
                    <div className="flex items-center justify-center gap-2 pb-1 md:hidden">
                        <Button
                            className="flex-1 max-w-[110px] h-9 text-sm"
                            size="sm"
                            onClick={handlePlayCards}
                            disabled={gameState.selectedCards.length === 0 || !isCurrentTurn || isActionPacing || gameState.gameWon}
                        >
                            Play
                            {gameState.selectedCards.length > 0 && (
                                <span className="ml-1 text-xs">({gameState.selectedCards.length})</span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 max-w-[90px] h-9 text-sm"
                            size="sm"
                            onClick={handleDeselectAll}
                            disabled={gameState.selectedCards.length === 0}
                            title="Clear selection"
                        >
                            Clear
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 max-w-[90px] h-9 text-sm border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-300 dark:hover:bg-orange-500/10"
                            size="sm"
                            onClick={handlePass}
                            disabled={!isCurrentTurn || isActionPacing || gameState.lastPlayedCards.length === 0 || gameState.gameWon}
                            title="Pass turn"
                        >
                            Pass
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default GameScreen; 
