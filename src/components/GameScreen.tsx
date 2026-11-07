import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { WebSocketMessage } from "../types.websocket";
import { ReconnectingWebSocket, ConnectionState } from "../services/websocket-reconnect";
import PlayerHand from "./PlayerHand";
import { GameActions, GameBoard, GameOpponent, GameTable } from "./GameBoard";
import { sortSelectedCards, SortType, findCardsByRank } from "../utils/cardSorting";
import { getMoveError } from "../utils/moveValidation";
import PlayingCard from "./PlayingCard";
import { Button } from "./ui/button";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { getFullCardFlightAnimationDurationMs, rectFromElement, useCardFlightLayer } from "../hooks/useCardFlightLayer";
import { useGameFeelSettings } from "../hooks/useGameFeelSettings";
import { isCardFlightAnimationEnabled } from "../utils/config";
import { HelpCircle, Layers } from "lucide-react";
import GameFeelSettingsDialog from "./GameFeelSettingsDialog";
import PostGameFeedback from "./PostGameFeedback";
import { usePostGameFeedback } from "../hooks/usePostGameFeedback";
import { FeedbackBotDifficulty } from "../types.feedback";
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
    roomId?: string; // room the game is played in, used as feedback context
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
    botDifficultyByUuid?: Record<string, "easy" | "ai" | "expert">;
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
const MOVE_ERROR_DISPLAY_MS = 3000;
const MOVE_RESPONSE_TIMEOUT_MS = 5000;
const STARTING_HAND_SIZE = 13;

// A game already under way gets its last play replayed after GAME_STARTED on reconnect.
const isGameUnderWay = (cardCounts?: Record<string, number>) => (
    Object.values(cardCounts ?? {}).some(count => count < STARTING_HAND_SIZE)
);

const getNextPlayer = (playerList: string[], player: string) => {
    const index = playerList.indexOf(player);
    return index === -1 ? null : playerList[(index + 1) % playerList.length];
};

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
    roomId,
    socket,
    initialGameData,
    mapping,
    botUuids = new Set(),
    botDifficultyByUuid = {},
    onReturnToLobby,
    connectionState = ConnectionState.CONNECTED,
}) => {
    const isConnected = connectionState === ConnectionState.CONNECTED;

    // Track cycling state for cards with same rank
    const rankCycleIndexRef = useRef<Record<string, number>>({});
    const handCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const opponentSourceRefs = useRef<Record<string, Record<string, HTMLElement>>>({});
    const tableTargetRef = useRef<HTMLDivElement | null>(null);
    const cardLaneTargetRef = useRef<HTMLDivElement | null>(null);
    const [suppressedTablePlayKey, setSuppressedTablePlayKey] = useState<string | null>(null);
    const [moveError, setMoveError] = useState<string | null>(null);
    const [errorShakeKey, setErrorShakeKey] = useState(0);
    const moveErrorTimeoutRef = useRef<number | null>(null);
    const {
        settings: gameFeelSettings,
        setSettings: setGameFeelSettings,
        cardFlightSpeedMultiplier,
        actionPaceDelayMs,
    } = useGameFeelSettings();
    const [isMovePending, setIsMovePending] = useState(false);
    const movePendingRef = useRef(false);
    const movePendingTimeoutRef = useRef<number | null>(null);
    // A replayed play must not advance the turn: passes may have followed it.
    const nextMoveMayBeReplayRef = useRef(isGameUnderWay(initialGameData?.cardCounts));
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
    }, [clearActionPacingTimeout]);

    const resetGameProgressionQueue = useCallback(() => {
        gameProgressionResetTokenRef.current += 1;
        clearActionPacingTimeout();
        queuedGameProgressionMessagesRef.current = [];
        gameProgressionBlockedRef.current = false;
        isDrainingGameProgressionQueueRef.current = false;
        setSuppressedTablePlayKey(null);
    }, [clearActionPacingTimeout]);

    useEffect(() => () => {
        resetGameProgressionQueue();
    }, [resetGameProgressionQueue]);

    const showMoveError = useCallback((errorMessage: string) => {
        setMoveError(errorMessage);
        setErrorShakeKey(key => key + 1);

        if (moveErrorTimeoutRef.current !== null) {
            window.clearTimeout(moveErrorTimeoutRef.current);
        }
        moveErrorTimeoutRef.current = window.setTimeout(() => {
            setMoveError(null);
            moveErrorTimeoutRef.current = null;
        }, MOVE_ERROR_DISPLAY_MS);
    }, []);

    const clearMovePending = useCallback(() => {
        if (movePendingTimeoutRef.current !== null) {
            window.clearTimeout(movePendingTimeoutRef.current);
            movePendingTimeoutRef.current = null;
        }
        movePendingRef.current = false;
        setIsMovePending(false);
    }, []);

    const markMovePending = useCallback(() => {
        movePendingRef.current = true;
        setIsMovePending(true);
        movePendingTimeoutRef.current = window.setTimeout(() => {
            clearMovePending();
            showMoveError("No response from the server. Please try again.");
        }, MOVE_RESPONSE_TIMEOUT_MS);
    }, [clearMovePending, showMoveError]);

    useEffect(() => () => {
        if (moveErrorTimeoutRef.current !== null) {
            window.clearTimeout(moveErrorTimeoutRef.current);
        }
        if (movePendingTimeoutRef.current !== null) {
            window.clearTimeout(movePendingTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (!isConnected) {
            clearMovePending();
        }
    }, [clearMovePending, isConnected]);

    const releaseGameProgressionAfter = useCallback((delayMs: number) => {
        clearActionPacingTimeout();

        const release = () => {
            actionPacingTimeoutRef.current = null;
            gameProgressionBlockedRef.current = false;
            drainGameProgressionQueueRef.current();
        };

        if (delayMs <= 0) {
            requestAnimationFrame(release);
            return;
        }

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
            const passDelayMs = cards.length === 0 && paceDelayMs > 0
                ? paceDelayMs + passPacingAnimationMsRef.current
                : paceDelayMs;
            releaseGameProgressionAfterRef.current(passDelayMs);
            return;
        }

        const targetRect = getVisibleElementRect([cardLaneTargetRef.current, tableTargetRef.current]);
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

    // Difficulty recorded alongside feedback. Rooms are configured with a single
    // difficulty in practice, so the first bot's setting represents the game.
    const feedbackBotDifficulty = useMemo<FeedbackBotDifficulty | undefined>(() => {
        const firstBotUuid = Array.from(botUuids).find((botUuid) => botDifficultyByUuid[botUuid]);
        return firstBotUuid ? botDifficultyByUuid[firstBotUuid] : undefined;
    }, [botUuids, botDifficultyByUuid]);

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

    // Keep feedback state here so the shared board mounts one feedback form.
    const postGameFeedback = usePostGameFeedback({
        active: gameState.gameWon,
        roomId,
        won: gameState.winner === uuid,
        botDifficulty: feedbackBotDifficulty,
        hadBots: botUuids.size > 0,
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
            clearMovePending();

            const payload = message.payload as {
                current_turn?: string;
                cards?: string[];
                player_list?: string[];
                card_counts?: Record<string, number>;
                last_played_cards?: string[];
                last_played_by?: string;
                last_plays_by_player?: Record<string, string[]>;
            };
            nextMoveMayBeReplayRef.current = isGameUnderWay(payload?.card_counts);

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
            setGameState(prev => {
                // The turn coming back to the last player to play means everyone else passed.
                const tableCleared = prev.lastPlayedCards.length > 0 && prev.lastPlayedBy === player;
                return {
                    ...prev,
                    currentTurn: player,
                    lastPlayedCards: tableCleared ? [] : prev.lastPlayedCards,
                    lastPlaysByPlayer: tableCleared ? {} : prev.lastPlaysByPlayer,
                    players: prev.players.map(p => ({
                        ...p,
                        isCurrentTurn: p.name === player,
                        // Clear hasPassed when it becomes this player's turn
                        hasPassed: p.name === player ? false : p.hasPassed,
                    })),
                };
            });

            // Nothing can follow until this client acts, so don't hold up its own turn.
            const paceDelayMs = actionPaceDelayMsRef.current;
            if (paceDelayMs > 0 && player !== uuid) {
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

            // A move this client is waiting on was just played, so it can't be a replay.
            const isAwaitedOwnMove = player === uuid && movePendingRef.current;
            const mayBeReplay = nextMoveMayBeReplayRef.current && !isAwaitedOwnMove;
            nextMoveMayBeReplayRef.current = false;

            if (player === uuid) {
                clearMovePending();
                rankCycleIndexRef.current = {};
            }

            setGameState(prev => {
                const isCurrentPlayerMove = player === uuid && cards.length > 0;
                const nextPlayer = getNextPlayer(prev.playerList, player);
                // The table clears as soon as the last player passes, so the next
                // player can act without waiting for the paced TURN_CHANGE.
                const tableCleared = cards.length === 0
                    && prev.lastPlayedCards.length > 0
                    && prev.lastPlayedBy === nextPlayer;
                // A new round starts when someone plays onto a clear table.
                const isNewRound = prev.lastPlayedCards.length === 0 && cards.length > 0;
                const updatedPlayers = prev.players.map(p => {
                    if (p.name !== player) {
                        const clearPass = isNewRound || (!mayBeReplay && p.name === nextPlayer);
                        return clearPass ? { ...p, hasPassed: false } : p;
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

                // Update lastPlaysByPlayer to track this player's last play.
                // A replayed play joins the restored snapshot instead of starting a round.
                const updatedLastPlaysByPlayer = tableCleared
                    ? {}
                    : isNewRound && !mayBeReplay
                        ? { [player]: cards } // Start fresh for new round
                        : {
                            ...prev.lastPlaysByPlayer,
                            [player]: cards, // Empty array if pass, cards if played
                        };

                let lastPlayedCards = prev.lastPlayedCards;
                if (tableCleared) {
                    lastPlayedCards = [];
                } else if (cards.length > 0) {
                    lastPlayedCards = cards;
                }

                return {
                    ...prev,
                    currentTurn: !mayBeReplay && nextPlayer ? nextPlayer : prev.currentTurn,
                    lastPlayedCards,
                    lastPlayedBy: cards.length > 0 ? player : prev.lastPlayedBy,
                    lastPlaysByPlayer: updatedLastPlaysByPlayer,
                    players: updatedPlayers,
                    selectedCards: isCurrentPlayerMove
                        ? prev.selectedCards.filter(card => !cards.includes(card))
                        : prev.selectedCards,
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

        ERROR: (message) => {
            const payload = message.payload as { message?: string; error_type?: string };
            const errorMessage = payload?.message;
            if (!errorMessage) {
                return;
            }

            clearMovePending();
            showMoveError(errorMessage);
        },

        GAME_WON: (message) => {
            clearMovePending();
            const winner = message.payload.winner as string;
            const winningHand = Array.isArray(message.payload.winning_hand)
                ? (message.payload.winning_hand as string[])
                : [];

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

            // The server answered, even if pacing holds this message back for a while.
            const isOwnMove = message.type === "MOVE_PLAYED" && message.payload?.player === uuid;
            if (isOwnMove && movePendingTimeoutRef.current !== null) {
                window.clearTimeout(movePendingTimeoutRef.current);
                movePendingTimeoutRef.current = null;
            }

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
    }, [handleParsedMessageSafely, uuid]);

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
    const hasTablePlay = gameState.lastPlayedCards.length > 0;
    const canAct = isCurrentTurn && !isMovePending;
    // Once this client has sent a move, show the turn as already handed on.
    const displayedTurn = isMovePending
        ? getNextPlayer(gameState.playerList, uuid) ?? gameState.currentTurn
        : gameState.currentTurn;
    const isOpeningPlay = !gameState.lastPlayedBy && Boolean(currentPlayer?.cards.includes("3D"));

    // Get player positions based on player list (memoized to prevent unnecessary recalculations)
    const playerPositions = useMemo(
        () => getPlayerPositions(gameState.playerList, uuid),
        [gameState.playerList, uuid]
    );
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
        if (gameState.selectedCards.length === 0 || !isCurrentTurn || movePendingRef.current) return;

        if (!isConnected || !socket?.isConnected()) {
            showMoveError("Not connected. Your cards are still selected.");
            return;
        }

        const moveError = getMoveError(gameState.selectedCards, gameState.lastPlayedCards, isOpeningPlay);
        if (moveError) {
            showMoveError(moveError);
            return;
        }

        // Keep the selection until the server accepts the move, so a rejected play can be adjusted.
        markMovePending();
        socket.send(JSON.stringify({
            type: "MOVE",
            payload: {
                cards: gameState.selectedCards,
            },
        }));
    };

    const handlePass = () => {
        if (!isCurrentTurn || !hasTablePlay || movePendingRef.current) return;

        if (!isConnected || !socket?.isConnected()) {
            showMoveError("Not connected. Your pass was not sent.");
            return;
        }

        markMovePending();
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
        // A compact layout can still have a physical keyboard (for example a
        // laptop window or party game in a side panel).
        isEnabled: true,
        isCurrentTurn: canAct,
        gameWon: gameState.gameWon,
        canPass: hasTablePlay,
    });

    const opponentUuids = [playerPositions.right, playerPositions.top, playerPositions.left]
        .filter((playerUuid): playerUuid is string => Boolean(playerUuid))
        .filter((playerUuid, index, players) => players.indexOf(playerUuid) === index);
    const connectionStatus = !isConnected
        ? <span role="status">{connectionState === ConnectionState.RECONNECTING ? "Reconnecting…" : "Connection failed"}</span>
        : undefined;
    const tablePlayHidden = hasTablePlay
        && suppressedTablePlayKey === getTablePlayKey(gameState.lastPlayedBy, gameState.lastPlayedCards);
    const displayedTurnName = getDisplayName(displayedTurn, gameState.uuidToName);
    const winnerName = getDisplayName(gameState.winner, gameState.uuidToName);
    const winnerContent = gameState.gameWon ? (
        <div className="grid h-full w-full content-center justify-items-center gap-3 text-center">
            <p className="text-xl font-extrabold text-emerald-300">🎉 {gameState.winner === uuid ? "You won!" : `${winnerName} won!`}</p>
            {gameState.lastPlayedBy === gameState.winner && gameState.lastPlayedCards.length > 0 && (
                <div className="grid justify-items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">{gameState.winner === uuid ? "Winning hand" : `${winnerName}'s hand`}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {gameState.lastPlayedCards.map(card => (
                            <PlayingCard key={card} card={card} className="winner-card-pop" width={44} height={62} />
                        ))}
                    </div>
                </div>
            )}
            <Button onClick={onReturnToLobby} className="mt-2">Return to Lobby</Button>
        </div>
    ) : undefined;

    return (
        <>
            <GameBoard
                mode="classic"
                title="CLASSIC"
                subtitle="Classic table · 13 cards"
                status={connectionStatus}
                headerActions={(
                    <div className="game-board-header-actions">
                        <GameFeelSettingsDialog
                            settings={gameFeelSettings}
                            onSettingsChange={setGameFeelSettings}
                            triggerClassName="game-board-tool"
                        />
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="game-board-tool" title="Hand rankings" aria-label="Hand rankings">
                                    <Layers className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Hand Rankings</DialogTitle>
                                    <DialogDescription>Lowest to highest</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-2">
                                    <div>
                                        <h4 className="mb-2 font-semibold text-sm">Card Ranks</h4>
                                        <p className="text-sm text-muted-foreground">3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; A &lt; <span className="font-bold text-foreground">2</span></p>
                                    </div>
                                    <div>
                                        <h4 className="mb-2 font-semibold text-sm">Suits</h4>
                                        <p className="text-sm text-muted-foreground">♦ &lt; ♣ &lt; ♥ &lt; ♠</p>
                                    </div>
                                    <div>
                                        <h4 className="mb-2 font-semibold text-sm">Five-Card Hands</h4>
                                        <p className="text-sm text-muted-foreground">Straight &lt; Flush &lt; Full House &lt; Four of a Kind &lt; Straight Flush</p>
                                    </div>
                                    <div>
                                        <h4 className="mb-2 font-semibold text-sm">Playing</h4>
                                        <p className="text-sm text-muted-foreground">Singles beat singles, pairs beat pairs, triples beat triples, and five-card hands beat five-card hands of lower rank. Each play must match the type of the previous play and rank higher.</p>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="game-board-tool" title="Keyboard shortcuts" aria-label="Keyboard shortcuts">
                                    <HelpCircle className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                                    <DialogDescription>Use a keyboard to play at any window size.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-2">
                                    <div>
                                        <h4 className="mb-2 font-semibold text-sm">Card Selection</h4>
                                        <div className="space-y-1.5 text-sm">
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Move cursor left/right</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">← →</kbd></div>
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Select focused card</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">↑</kbd></div>
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Deselect focused card</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">↓</kbd></div>
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Toggle selection</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Space</kbd></div>
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Clear focus</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Esc</kbd></div>
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Clear selection</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Backspace</kbd></div>
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Select card by rank</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">2–9, T, J, Q, K, A</kbd></div>
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Cycle through same rank</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Press again</kbd></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="mb-2 font-semibold text-sm">Actions</h4>
                                        <div className="space-y-1.5 text-sm">
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Play selected cards</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">Enter</kbd></div>
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Pass turn</span><kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">P</kbd></div>
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
                opponents={opponentUuids.map(playerUuid => {
                    const player = gameState.players.find(candidate => candidate.name === playerUuid);
                    const difficulty = getBotDifficulty(playerUuid);
                    const botKind = difficulty === "expert" ? "EXPERT BOT" : difficulty === "ai" ? "AI BOT" : "BOT";
                    const lastCards = gameState.lastPlaysByPlayer[playerUuid] ?? [];
                    const isLastCardsHidden = suppressedTablePlayKey === getTablePlayKey(playerUuid, lastCards);
                    return (
                        <GameOpponent
                            key={playerUuid}
                            ref={element => registerOpponentSourceRef(playerUuid, "board", element)}
                            name={getDisplayName(playerUuid, gameState.uuidToName)}
                            cardCount={player?.cardCount ?? 13}
                            isActive={displayedTurn === playerUuid}
                            kind={botUuids.has(playerUuid) ? botKind : undefined}
                            hasPassed={player?.hasPassed}
                            lastCards={lastCards}
                            lastCardsHidden={isLastCardsHidden}
                        />
                    );
                })}
                table={(
                    <GameTable
                        turnLabel={gameState.gameWon
                            ? "Round complete"
                            : !displayedTurn
                                ? "Waiting for players"
                            : canAct
                                ? hasTablePlay ? "Your turn" : "Your lead"
                                : `${displayedTurnName}'s turn`}
                        isCurrentTurn={canAct}
                        cards={gameState.lastPlayedCards}
                        playedBy={gameState.lastPlayedBy === uuid ? "You played" : `${getDisplayName(gameState.lastPlayedBy, gameState.uuidToName)} played`}
                        handLabel={gameState.lastPlayedCards.length ? `${gameState.lastPlayedCards.length} card${gameState.lastPlayedCards.length === 1 ? "" : "s"}` : undefined}
                        emptyTitle={canAct
                            ? isOpeningPlay ? "You open" : "You lead"
                            : displayedTurn ? `${displayedTurnName} leads` : "Table"}
                        emptyHint={canAct
                            ? isOpeningPlay ? "Play any hand with the 3♦." : "Everyone passed. Play any hand."
                            : gameState.lastPlayedBy ? "Everyone passed. New round." : "Waiting for the opening play."}
                        cardsHidden={tablePlayHidden}
                        tableRef={tableTargetRef}
                        cardLaneRef={cardLaneTargetRef}
                    >
                        {winnerContent}
                    </GameTable>
                )}
                handName={gameState.uuidToName[uuid] || username}
                handCount={currentPlayer?.cards.length ?? 0}
                handStatus={canAct ? "YOUR TURN" : gameState.gameWon ? "GAME OVER" : "WAITING"}
                handTools={(
                    <>
                        <Button variant="outline" size="sm" className="game-board-tool" onClick={() => handleSortCards("numerical")} title="Sort by rank (3 smallest, 2 biggest)">Rank</Button>
                        <Button variant="outline" size="sm" className="game-board-tool" onClick={() => handleSortCards("suit")} title="Sort by suit (♦♣♥♠)">Suit</Button>
                    </>
                )}
                hand={(
                    <div className="relative">
                        <PlayerHand
                            cards={currentPlayer?.cards || []}
                            selectedCards={gameState.selectedCards}
                            focusedCardIndex={gameState.focusedCardIndex}
                            onCardClick={handleCardClick}
                            onCardsReorder={handleCardsReorder}
                            registerCardRef={registerHandCardRef}
                            onCardFocus={index => setGameState(prev => ({ ...prev, focusedCardIndex: index }))}
                            keyboardScope
                        />
                        {moveError && (
                            <div key={errorShakeKey} role="alert" className="shake-once pointer-events-none absolute inset-x-0 bottom-full z-[130] mb-1 flex justify-center">
                                <span className="game-move-error">{moveError}</span>
                            </div>
                        )}
                    </div>
                )}
                actions={(
                    <GameActions
                        selectedCount={gameState.selectedCards.length}
                        onPlay={handlePlayCards}
                        onClear={handleDeselectAll}
                        onPass={handlePass}
                        isPlayDisabled={gameState.selectedCards.length === 0 || !canAct}
                        isClearDisabled={gameState.selectedCards.length === 0}
                        isPassDisabled={!canAct || !hasTablePlay}
                        passTitle={gameState.gameWon ? "Game is over" : !canAct ? "Not your turn" : !hasTablePlay ? "You lead, so you must play" : "Pass your turn (or press P key)"}
                    />
                )}
                feedback={gameState.gameWon ? <PostGameFeedback feedback={postGameFeedback} /> : undefined}
            />
            {cardFlightOverlay}
        </>
    );
};

export default GameScreen; 
