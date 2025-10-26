import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { WebSocketMessage } from "../types.websocket";
import PlayerHand from "./PlayerHand";
import { sortSelectedCards, SortType, findCardsByRank } from "../utils/cardSorting";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";
import { useThemeContext } from "../contexts/ThemeContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { HelpCircle } from "lucide-react";
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
    socket: WebSocket | null;
    initialGameData?: {
        cards: string[];
        currentTurn: string;
        playerList: string[];
        lastPlayedCards?: string[];
        lastPlayedBy?: string;
    };
    mapping: Record<string, string>; // uuid to display name mapping
    botUuids?: Set<string>; // Set of bot UUIDs
    onReturnToLobby?: () => void;
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
    gameWon: boolean; // Track if the game has been won
    winner: string; // Track who won the game
    uuidToName: Record<string, string>; // UUID to username mapping
    focusedCardIndex: number | null; // Track which card has keyboard focus (cursor)
}

const GameScreen: React.FC<GameScreenProps> = ({ username, uuid, socket, initialGameData, mapping, botUuids = new Set(), onReturnToLobby }) => {
    const { theme } = useThemeContext();

    // Track cycling state for cards with same rank
    const rankCycleIndexRef = useRef<Record<string, number>>({});

    // Helper function to get display name from UUID or return the original value if it's already a username
    const getDisplayName = (uuidOrName: string, mapping: Record<string, string>) => {
        return mapping[uuidOrName] || uuidOrName;
    };

    // Helper function to render player name with bot badge if applicable
    const renderPlayerName = (playerUuid: string, mapping: Record<string, string>, size: "xs" | "sm" | "md" | "lg" = "xs") => {
        const displayName = getDisplayName(playerUuid, mapping);
        const isBot = botUuids.has(playerUuid);

        return (
            <div className="flex items-center justify-center gap-1.5 text-foreground">
                <span className={cn("font-semibold", {
                    "text-xs": size === "xs",
                    "text-sm": size === "sm",
                    "text-base": size === "md",
                    "text-lg": size === "lg"
                })}>
                    {displayName || "Opponent"}
                </span>
                {isBot && (
                    <Badge variant="secondary" className="px-1 py-0 text-[10px] uppercase tracking-wide">
                        Bot
                    </Badge>
                )}
            </div>
        );
    };

    // Helper function to get player position based on player list
    const getPlayerPositions = (playerList: string[], currentPlayerUuid: string) => {
        const currentIndex = playerList.indexOf(currentPlayerUuid);
        if (currentIndex === -1) return { top: "", left: "", right: "" };

        // Calculate positions: current player is at bottom, others positioned clockwise
        // For 4 players: current player at bottom, then clockwise: right, top, left
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
            const payload = message.payload as {
                current_turn?: string;
                cards?: string[];
                player_list?: string[];
                card_counts?: Record<string, number>;
                last_played_cards?: string[];
                last_played_by?: string;
            };

            if (!payload?.current_turn || !Array.isArray(payload.cards) || !Array.isArray(payload.player_list)) {
                return;
            }

            const cardCounts = payload.card_counts;
            const lastCards = payload.last_played_cards;
            const lastPlayer = payload.last_played_by;

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

                return {
                    ...prev,
                    lastPlayedCards: cards.length > 0 ? cards : prev.lastPlayedCards,
                    lastPlayedBy: cards.length > 0 ? player : prev.lastPlayedBy,
                    players: updatedPlayers,
                    focusedCardIndex: shouldResetFocus ? null : prev.focusedCardIndex,
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

    // Set up WebSocket message listener
    useEffect(() => {
        if (socket) {
            const messageHandler = (event: MessageEvent) => {
                processMessage(event.data);
            };

            socket.addEventListener("message", messageHandler);

            // Cleanup function to remove event listener
            return () => {
                socket.removeEventListener("message", messageHandler);
            };
        }
    }, [socket]);

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

        if (socket) {
            socket.send(JSON.stringify({
                type: "MOVE",
                payload: {
                    cards: gameState.selectedCards,
                },
            }));
        }

        setGameState(prev => ({
            ...prev,
            selectedCards: [],
            focusedCardIndex: 0, // Reset focus to first card after playing
        }));
        // Reset rank cycle tracking when playing cards
        rankCycleIndexRef.current = {};
    };

    const handlePass = () => {
        if (socket) {
            socket.send(JSON.stringify({
                type: "MOVE",
                payload: {
                    cards: [],
                },
            }));
        }
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
        isCurrentTurn: isCurrentTurn,
        gameWon: gameState.gameWon,
        canPass: gameState.lastPlayedCards.length > 0,
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
                        "h-9 w-6 rounded border border-blue-600/40 bg-blue-500/80 shadow-sm md:h-10 md:w-7",
                        index > 0 && "-ml-2 md:-ml-2.5"
                    )}
                    style={{ zIndex: 13 - index }}
                />
            ))}
        </div>
    );

    const renderPassedTag = (hasPassed?: boolean) => {
        if (!hasPassed) {
            return null;
        }

        return (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                Passed
            </span>
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
        const getSuitColorClass = (suit: string) => {
            switch (suit) {
                case "H":
                case "D":
                    return "text-destructive";
                case "S":
                case "C":
                    return theme === "dark" ? "text-white" : "text-black";
                default:
                    return theme === "dark" ? "text-white" : "text-black";
            }
        };

        const getSuitSymbol = (suit: string) => {
            switch (suit) {
                case "H":
                    return "♥";
                case "D":
                    return "♦";
                case "S":
                    return "♠";
                case "C":
                    return "♣";
                default:
                    return suit;
            }
        };

        const displayName = getDisplayName(gameState.lastPlayedBy, gameState.uuidToName);
        const isSelfPlay = gameState.lastPlayedBy === uuid;
        const desktopLabel = labelOverride ?? (isSelfPlay ? "You played:" : `${displayName} played:`);
        const mobileLabel = mobileLabelOverride ?? (isSelfPlay ? "You" : displayName.slice(0, 8));

        return (
            <div className="flex flex-col items-center gap-2">
                <span className="hidden text-sm uppercase tracking-wide text-muted-foreground md:block">
                    {desktopLabel}
                </span>
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground md:hidden">
                    {mobileLabel}
                </span>
                <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
                    {gameState.lastPlayedCards.map((card, index) => {
                        const suit = card.slice(-1);
                        const rank = card.slice(0, -1);

                        return (
                            <div
                                key={`${card}-${index}`}
                                className={cn(
                                    "flex flex-col items-center justify-center rounded border-2 border-border bg-white font-bold shadow-md dark:border-slate-700 dark:bg-slate-900",
                                    "h-16 w-12 text-sm md:h-20 md:w-14 md:text-lg",
                                    getSuitColorClass(suit)
                                )}
                            >
                                <span>{rank}</span>
                                <span className="text-2xl md:text-3xl">{getSuitSymbol(suit)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Theme-responsive background styling
    const containerClassName = cn(
        "flex h-full min-h-0 w-full justify-center bg-gradient-to-br",
        theme === "light"
            ? "from-slate-50 via-blue-50/60 to-blue-100/70"
            : "from-slate-950 via-slate-900 to-slate-800",
        "transition-colors duration-300"
    );

    return (
        <div className={containerClassName}>
            {/* Keyboard Shortcuts Help Button - Fixed position in top-right corner (desktop only) */}
            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="fixed right-2 top-2 z-50 hidden h-8 w-8 rounded-full bg-background/80 shadow-md backdrop-blur-sm hover:bg-background/90 md:flex md:h-10 md:w-10"
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

            <div className="flex h-full min-h-0 w-full flex-col px-2 py-1">
                {/* Top Player - Desktop layout */}
                <section className="hidden flex-shrink-0 flex-col items-center justify-start gap-0.5 py-0.5 md:flex">
                    <div className="flex items-center gap-3">
                        <Badge
                            variant={gameState.currentTurn === playerPositions.top ? "secondary" : "outline"}
                            className={cn(
                                "flex min-h-[32px] min-w-[100px] flex-col items-center justify-center rounded px-2.5 py-1 text-center text-xs uppercase tracking-wide shadow-sm transition-all",
                                gameState.currentTurn === playerPositions.top && "animate-pulse border-primary/40 bg-primary/20"
                            )}
                        >
                            <div className="flex flex-col items-center gap-0">
                                {renderPlayerName(playerPositions.top, gameState.uuidToName, "xs")}
                                <span className="text-[9px] font-medium text-muted-foreground">
                                    {getCardCountLabel(topPlayer)}
                                </span>
                                {renderPassedTag(topPlayer?.hasPassed)}
                            </div>
                        </Badge>
                        {renderTopCardBacks(topPlayer?.cardCount)}
                    </div>
                </section>

                {/* Top Player - Mobile compact layout */}
                <section className="flex flex-shrink-0 items-center justify-center py-1 md:hidden">
                    <Badge
                        variant={gameState.currentTurn === playerPositions.top ? "secondary" : "outline"}
                        className={cn(
                            "flex h-8 items-center gap-2 rounded-full px-3 py-1 text-xs",
                            gameState.currentTurn === playerPositions.top && "animate-pulse border-primary/40 bg-primary/20"
                        )}
                    >
                        {renderPlayerName(playerPositions.top, gameState.uuidToName, "xs")}
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            {topPlayer?.cardCount || 0}
                        </Badge>
                        {renderPassedTag(topPlayer?.hasPassed)}
                    </Badge>
                </section>

                {/* Middle Row - Desktop layout */}
                <section className="hidden min-h-0 grid flex-1 grid-cols-[minmax(120px,0.9fr)_minmax(0,1.6fr)_minmax(120px,0.9fr)] items-center gap-4 overflow-hidden py-1 md:grid">
                    {/* Left Player */}
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                        <Badge
                            variant={gameState.currentTurn === playerPositions.left ? "secondary" : "outline"}
                            className={cn(
                                "flex w-full max-w-[150px] flex-col items-center justify-center rounded px-2 py-2 text-center text-xs uppercase tracking-wide shadow-sm transition-all",
                                gameState.currentTurn === playerPositions.left && "animate-pulse border-primary/40 bg-primary/20"
                            )}
                        >
                            <div className="flex flex-col items-center gap-0">
                                {renderPlayerName(playerPositions.left, gameState.uuidToName, "xs")}
                                <span className="text-[9px] font-medium text-muted-foreground">
                                    {getCardCountLabel(leftPlayer)}
                                </span>
                                {renderPassedTag(leftPlayer?.hasPassed)}
                            </div>
                        </Badge>
                        {renderTopCardBacks(leftPlayer?.cardCount)}
                    </div>

                    {/* Center Game Area */}
                    <div className="flex flex-1 flex-col items-center justify-center overflow-hidden">
                        <Card className="w-full max-w-4xl overflow-hidden border border-primary/10 bg-card/90 text-center shadow-xl backdrop-blur">
                            <CardContent className="flex max-h-full flex-col items-center gap-4 overflow-y-auto p-8">
                                {gameState.gameWon ? (
                                    <div className="flex flex-col items-center gap-4 pb-2">
                                        <p className="text-3xl font-bold text-emerald-500">
                                            🎉 {gameState.winner === uuid ? "You won!" : `${getDisplayName(gameState.winner, gameState.uuidToName)} won!`} 🎉
                                        </p>
                                        <p className="text-xl text-muted-foreground">Game Over</p>
                                        {gameState.lastPlayedBy === gameState.winner && renderLastPlayedCards({
                                            labelOverride: gameState.winner === uuid
                                                ? "Your winning hand:"
                                                : `${getDisplayName(gameState.winner, gameState.uuidToName)}'s winning hand:`,
                                            mobileLabelOverride: gameState.winner === uuid
                                                ? "You"
                                                : getDisplayName(gameState.winner, gameState.uuidToName).slice(0, 8),
                                        })}
                                        <Button
                                            onClick={onReturnToLobby}
                                            size="lg"
                                            className="mt-4 min-w-[220px] bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
                                        >
                                            Return to Lobby
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <p className="text-xl font-semibold">
                                            {isCurrentTurn
                                                ? "Your turn!"
                                                : `${getDisplayName(gameState.currentTurn, gameState.uuidToName)}'s turn`}
                                        </p>
                                        {renderLastPlayedCards()}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Player */}
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                        <Badge
                            variant={gameState.currentTurn === playerPositions.right ? "secondary" : "outline"}
                            className={cn(
                                "flex w-full max-w-[150px] flex-col items-center justify-center rounded px-2 py-2 text-center text-xs uppercase tracking-wide shadow-sm transition-all",
                                gameState.currentTurn === playerPositions.right && "animate-pulse border-primary/40 bg-primary/20"
                            )}
                        >
                            <div className="flex flex-col items-center gap-0">
                                {renderPlayerName(playerPositions.right, gameState.uuidToName, "xs")}
                                <span className="text-[9px] font-medium text-muted-foreground">
                                    {getCardCountLabel(rightPlayer)}
                                </span>
                                {renderPassedTag(rightPlayer?.hasPassed)}
                            </div>
                        </Badge>
                        {renderTopCardBacks(rightPlayer?.cardCount)}
                    </div>
                </section>

                {/* Middle Row - Mobile layout */}
                <section className="flex min-h-[200px] flex-1 overflow-y-auto py-2 md:hidden">
                    <div className="flex flex-1 flex-col">
                        {/* Left Player - Mobile horizontal layout */}
                        <div className="flex flex-shrink-0 items-center justify-start px-2 py-1">
                            <Badge
                                variant={gameState.currentTurn === playerPositions.left ? "secondary" : "outline"}
                                className={cn(
                                    "flex h-8 items-center gap-2 rounded-full px-3 py-1 text-xs",
                                    gameState.currentTurn === playerPositions.left && "animate-pulse border-primary/40 bg-primary/20"
                                )}
                            >
                                {renderPlayerName(playerPositions.left, gameState.uuidToName, "xs")}
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                    {leftPlayer?.cardCount || 0}
                                </Badge>
                                {renderPassedTag(leftPlayer?.hasPassed)}
                            </Badge>
                        </div>

                        {/* Center Game Area - Mobile compact */}
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 overflow-y-auto px-2">
                            {gameState.gameWon ? (
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <p className="text-lg font-bold text-emerald-500">
                                        🎉 {gameState.winner === uuid ? "You won!" : `${getDisplayName(gameState.winner, gameState.uuidToName)} won!`}
                                    </p>
                                    <Button
                                        onClick={onReturnToLobby}
                                        size="sm"
                                        className="min-w-[150px] bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
                                    >
                                        Return to Lobby
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    {isCurrentTurn ? (
                                        <p className="text-base font-bold text-primary">
                                            Your turn!
                                        </p>
                                    ) : (
                                        <p className="text-xs font-semibold text-muted-foreground">
                                            {getDisplayName(gameState.currentTurn, gameState.uuidToName)}'s turn
                                        </p>
                                    )}
                                    {renderLastPlayedCards()}
                                </div>
                            )}
                        </div>

                        {/* Right Player - Mobile horizontal layout */}
                        <div className="flex flex-shrink-0 items-center justify-end px-2 py-1">
                            <Badge
                                variant={gameState.currentTurn === playerPositions.right ? "secondary" : "outline"}
                                className={cn(
                                    "flex h-8 items-center gap-2 rounded-full px-3 py-1 text-xs",
                                    gameState.currentTurn === playerPositions.right && "animate-pulse border-primary/40 bg-primary/20"
                                )}
                            >
                                {renderPlayerName(playerPositions.right, gameState.uuidToName, "xs")}
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                    {rightPlayer?.cardCount || 0}
                                </Badge>
                                {renderPassedTag(rightPlayer?.hasPassed)}
                            </Badge>
                        </div>
                    </div>
                </section>

                {/* Bottom Player */}
                <section className="mt-auto flex flex-shrink-0 flex-col gap-1.5 pt-1">
                    {/* Desktop: Full layout with sort buttons and badge */}
                    <div className="hidden items-center justify-between md:flex">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSortCards("numerical")}
                                title="Sort by rank (3 smallest, 2 biggest)"
                                className="h-8 px-3 text-xs"
                            >
                                Rank
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSortCards("suit")}
                                title="Sort by suit (♦♣♥♠)"
                                className="h-8 px-3 text-xs"
                            >
                                Suit
                            </Button>
                        </div>
                        <Badge
                            variant={gameState.currentTurn === uuid ? "secondary" : "outline"}
                            className={cn(
                                "flex min-h-[36px] min-w-[120px] flex-col items-center justify-center rounded-lg px-3 py-2 text-center text-xs uppercase tracking-wide",
                                gameState.currentTurn === uuid && !gameState.gameWon && "animate-pulse border-primary/40 bg-primary/20"
                            )}
                        >
                            <span className="text-xs font-semibold">
                                {gameState.uuidToName[uuid] || username}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground">
                                {getCardCountLabel(currentPlayer)}
                            </span>
                        </Badge>
                        <div className="w-32" aria-hidden />
                    </div>

                    {/* Mobile: Compact layout with sort and user info combined */}
                    <div className="flex items-center justify-between gap-1 md:hidden">
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSortCards("numerical")}
                                title="Sort by rank"
                                className="h-7 px-2 text-[10px]"
                            >
                                Rank
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSortCards("suit")}
                                title="Sort by suit"
                                className="h-7 px-2 text-[10px]"
                            >
                                Suit
                            </Button>
                        </div>
                        <Badge
                            variant={gameState.currentTurn === uuid ? "secondary" : "outline"}
                            className={cn(
                                "flex h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                gameState.currentTurn === uuid && !gameState.gameWon && "animate-pulse border-primary/40 bg-primary/20"
                            )}
                        >
                            <span className="max-w-[5rem] truncate">{gameState.uuidToName[uuid] || username}</span>
                            <Badge variant="outline" className="h-4 px-1 text-[9px]">
                                {currentPlayer?.cardCount || 0}
                            </Badge>
                        </Badge>
                    </div>

                    <div className="flex justify-center">
                        <PlayerHand
                            cards={currentPlayer?.cards || []}
                            selectedCards={gameState.selectedCards}
                            focusedCardIndex={gameState.focusedCardIndex}
                            onCardClick={handleCardClick}
                            onCardsReorder={handleCardsReorder}
                        />
                    </div>

                    {/* Desktop: Larger buttons */}
                    <div className="hidden flex-wrap items-center justify-center gap-3 pb-1 md:flex">
                        <Button
                            className="min-w-[120px]"
                            size="lg"
                            onClick={handlePlayCards}
                            disabled={gameState.selectedCards.length === 0 || !isCurrentTurn || gameState.gameWon}
                        >
                            Play
                            {gameState.selectedCards.length > 0 && (
                                <span className="ml-2 text-sm font-medium">({gameState.selectedCards.length})</span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            className="min-w-[120px]"
                            size="lg"
                            onClick={handleDeselectAll}
                            disabled={gameState.selectedCards.length === 0}
                            title={gameState.selectedCards.length === 0 ? "No cards selected" : "Deselect all selected cards"}
                        >
                            Clear
                        </Button>
                        <Button
                            variant="outline"
                            className="min-w-[120px] border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-300 dark:hover:bg-orange-500/10"
                            size="lg"
                            onClick={handlePass}
                            disabled={!isCurrentTurn || gameState.lastPlayedCards.length === 0 || gameState.gameWon}
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
                            className="flex-1 max-w-[120px]"
                            size="sm"
                            onClick={handlePlayCards}
                            disabled={gameState.selectedCards.length === 0 || !isCurrentTurn || gameState.gameWon}
                        >
                            Play
                            {gameState.selectedCards.length > 0 && (
                                <span className="ml-1 text-xs">({gameState.selectedCards.length})</span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 max-w-[100px]"
                            size="sm"
                            onClick={handleDeselectAll}
                            disabled={gameState.selectedCards.length === 0}
                            title="Clear selection"
                        >
                            Clear
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 max-w-[100px] border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-300 dark:hover:bg-orange-500/10"
                            size="sm"
                            onClick={handlePass}
                            disabled={!isCurrentTurn || gameState.lastPlayedCards.length === 0 || gameState.gameWon}
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