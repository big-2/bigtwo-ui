import React, { useState, useEffect, useRef } from "react";
import { WebSocketMessage } from "../types.websocket";
import PlayerHand from "./PlayerHand";
import { sortSelectedCards, SortType } from "../utils/cardSorting";
import { IconRobot } from "@tabler/icons-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";
import { useThemeContext } from "../contexts/ThemeContext";

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
    countdown: number; // Countdown seconds after game won
    uuidToName: Record<string, string>; // UUID to username mapping
}

const GameScreen: React.FC<GameScreenProps> = ({ username, uuid, socket, initialGameData, mapping, botUuids = new Set(), onReturnToLobby }) => {
    const { theme } = useThemeContext();

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
                {isBot && <IconRobot className={cn("text-muted-foreground", size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />}
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
            countdown: 0,
            uuidToName: {},
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
            countdown: 0,
            uuidToName: mapping,
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
            console.log("Game started!", message.payload);
            const currentTurn = message.payload.current_turn as string;
            const cards = message.payload.cards as string[];
            const playerList = message.payload.player_list as string[];
            const cardCounts = (message.payload as any).card_counts as Record<string, number> | undefined;

            const lastCards = (message.payload as any).last_played_cards as string[] | undefined;
            const lastPlayer = (message.payload as any).last_played_by as string | undefined;

            // Reset game state to ensure opponent card counts are correctly initialized
            setGameState(prev => {
                const nextState = createGameState(
                    cards,
                    currentTurn,
                    playerList,
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
            const player = message.payload.player as string;
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
            const player = message.payload.player as string;
            const cards = message.payload.cards as string[];
            // Use server-provided card count if available (recommended backend change)
            const serverCardCount = (message.payload as any).remaining_cards as number | undefined;

            setGameState(prev => ({
                ...prev,
                lastPlayedCards: cards.length > 0 ? cards : prev.lastPlayedCards,
                lastPlayedBy: cards.length > 0 ? player : prev.lastPlayedBy,
                players: prev.players.map(p => {
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
                }),
            }));
        },

        GAME_WON: (message) => {
            const winner = message.payload.winner as string;
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
                    countdown: 5, // Start 5-second countdown
                };
            });
        },

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        GAME_RESET: (_message) => {
            console.log("Game reset received, returning to lobby");
            if (onReturnToLobby) {
                onReturnToLobby();
            }
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
            socket.addEventListener("message", (event) => {
                processMessage(event.data);
            });
        }
    }, [socket]);

    // Handle countdown timer
    useEffect(() => {
        if (gameState.gameWon && gameState.countdown > 0) {
            const timer = setTimeout(() => {
                setGameState(prev => ({
                    ...prev,
                    countdown: prev.countdown - 1,
                }));
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [gameState.gameWon, gameState.countdown]);

    const currentPlayer = gameState.players.find(p => p.name === uuid);
    const isCurrentTurn = gameState.currentTurn === uuid && !gameState.gameWon;

    // Get player positions based on player list
    const playerPositions = getPlayerPositions(gameState.playerList, uuid);
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
        }));
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
    };

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
        <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(count ?? 0, 13) }).map((_, index) => (
                <div
                    key={`top-card-${index}`}
                    className={cn(
                        "h-16 w-12 rounded-md border border-blue-600/40 bg-blue-500/90 shadow",
                        index > 0 && "-ml-3"
                    )}
                    style={{ zIndex: 13 - index }}
                />
            ))}
        </div>
    );

    const renderSideCardBacks = (count?: number) => (
        <div className="flex flex-col items-center">
            {Array.from({ length: Math.min(count ?? 0, 13) }).map((_, index) => (
                <div
                    key={`side-card-${index}`}
                    className={cn(
                        "h-5 w-16 rounded-md border border-blue-600/40 bg-blue-500/85 shadow",
                        index > 0 && "-mt-2"
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

    const renderLastPlayedCards = () => {
        if (gameState.lastPlayedCards.length === 0) {
            return null;
        }

        const getSuitColor = (suit: string) => {
            switch (suit) {
                case "H":
                case "D":
                    return "#ef4444";
                case "S":
                case "C":
                    return "#111827";
                default:
                    return "#111827";
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

        return (
            <div className="flex flex-col items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {gameState.lastPlayedBy === uuid
                        ? "You played:"
                        : `${getDisplayName(gameState.lastPlayedBy, gameState.uuidToName)} played:`}
                </span>
                <div className="flex gap-2">
                    {gameState.lastPlayedCards.map((card, index) => {
                        const suit = card.slice(-1);
                        const rank = card.slice(0, -1);

                        return (
                            <div
                                key={`${card}-${index}`}
                                className="flex h-16 w-12 flex-col items-center justify-center rounded-md border border-border bg-white text-sm font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900"
                                style={{ color: getSuitColor(suit) }}
                            >
                                <span>{rank}</span>
                                <span className="text-lg">{getSuitSymbol(suit)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Theme-responsive background styling
    const containerClassName = cn(
        "min-h-screen w-full bg-gradient-to-br",
        theme === "light"
            ? "from-slate-50 via-blue-50/60 to-blue-100/70"
            : "from-slate-950 via-slate-900 to-slate-800",
        "transition-colors duration-300"
    );

    return (
        <div className={containerClassName}>
            <div className="mx-auto flex h-screen max-w-7xl flex-col px-4 py-6">
                {/* Top Player */}
                <section className="flex h-1/4 flex-col items-center justify-start gap-4">
                    <div className="flex items-center gap-6">
                        <Badge
                            variant={gameState.currentTurn === playerPositions.top ? "secondary" : "outline"}
                            className={cn(
                                "flex min-h-[48px] min-w-[140px] flex-col items-center justify-center rounded-xl px-5 py-3 text-center text-xs uppercase tracking-wide shadow-sm transition-all",
                                gameState.currentTurn === playerPositions.top && "animate-pulse border-primary/40 bg-primary/20"
                            )}
                        >
                            <div className="flex flex-col items-center gap-1">
                                {renderPlayerName(playerPositions.top, gameState.uuidToName, "sm")}
                                <span className="text-[11px] font-medium text-muted-foreground">
                                    {getCardCountLabel(topPlayer)}
                                </span>
                                {renderPassedTag(topPlayer?.hasPassed)}
                            </div>
                        </Badge>
                        {renderTopCardBacks(topPlayer?.cardCount)}
                    </div>
                </section>

                {/* Middle Row */}
                <section className="flex flex-1 items-center justify-between gap-6 py-4">
                    {/* Left Player */}
                    <div className="flex w-48 flex-col items-center gap-3 rounded-xl bg-white/60 p-4 shadow-sm backdrop-blur dark:bg-slate-800/50">
                        <Badge
                            variant={gameState.currentTurn === playerPositions.left ? "secondary" : "outline"}
                            className={cn(
                                "flex min-h-[48px] w-full flex-col items-center justify-center rounded-lg px-4 py-3 text-center text-xs uppercase tracking-wide",
                                gameState.currentTurn === playerPositions.left && "animate-pulse border-primary/40 bg-primary/20"
                            )}
                        >
                            <div className="flex flex-col items-center gap-1">
                                {renderPlayerName(playerPositions.left, gameState.uuidToName)}
                                <span className="text-[11px] font-medium text-muted-foreground">
                                    {getCardCountLabel(leftPlayer)}
                                </span>
                                {renderPassedTag(leftPlayer?.hasPassed)}
                            </div>
                        </Badge>
                        {renderSideCardBacks(leftPlayer?.cardCount)}
                    </div>

                    {/* Center Game Area */}
                    <div className="flex flex-1 flex-col items-center justify-center">
                        <Card className="w-full max-w-md border border-primary/10 bg-card/90 text-center shadow-xl backdrop-blur">
                            <CardContent className="flex flex-col items-center gap-4 p-6">
                                {gameState.gameWon ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-xl font-bold text-emerald-500">
                                            🎉 {gameState.winner === uuid ? "You won!" : `${getDisplayName(gameState.winner, gameState.uuidToName)} won!`} 🎉
                                        </p>
                                        <p className="text-base text-muted-foreground">Game Over</p>
                                        {gameState.countdown > 0 && (
                                            <p className="text-sm font-semibold text-blue-500">
                                                Returning to lobby in {gameState.countdown}...
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <p className="text-lg font-semibold">
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
                    <div className="flex w-48 flex-col items-center gap-3 rounded-xl bg-white/60 p-4 shadow-sm backdrop-blur dark:bg-slate-800/50">
                        <Badge
                            variant={gameState.currentTurn === playerPositions.right ? "secondary" : "outline"}
                            className={cn(
                                "flex min-h-[48px] w-full flex-col items-center justify-center rounded-lg px-4 py-3 text-center text-xs uppercase tracking-wide",
                                gameState.currentTurn === playerPositions.right && "animate-pulse border-primary/40 bg-primary/20"
                            )}
                        >
                            <div className="flex flex-col items-center gap-1">
                                {renderPlayerName(playerPositions.right, gameState.uuidToName)}
                                <span className="text-[11px] font-medium text-muted-foreground">
                                    {getCardCountLabel(rightPlayer)}
                                </span>
                                {renderPassedTag(rightPlayer?.hasPassed)}
                            </div>
                        </Badge>
                        {renderSideCardBacks(rightPlayer?.cardCount)}
                    </div>
                </section>

                {/* Bottom Player */}
                <section className="mt-auto flex flex-col gap-4 pt-4">
                    <div className="flex items-center justify-between">
                        <div className="w-32" aria-hidden />
                        <Badge
                            variant={gameState.currentTurn === uuid ? "secondary" : "outline"}
                            className={cn(
                                "flex min-h-[48px] min-w-[150px] flex-col items-center justify-center rounded-xl px-5 py-3 text-center text-xs uppercase tracking-wide",
                                gameState.currentTurn === uuid && !gameState.gameWon && "animate-pulse border-primary/40 bg-primary/20"
                            )}
                        >
                            <span className="text-xs font-semibold">
                                {gameState.uuidToName[uuid] || username}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground">
                                {getCardCountLabel(currentPlayer)}
                            </span>
                        </Badge>
                        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                            <span className="uppercase tracking-wide">Sort</span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSortCards("numerical")}
                                    title="Sort by rank (3 smallest, 2 biggest)"
                                >
                                    Rank
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSortCards("suit")}
                                    title="Sort by suit (♦♣♥♠)"
                                >
                                    Suit
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <PlayerHand
                            cards={currentPlayer?.cards || []}
                            selectedCards={gameState.selectedCards}
                            onCardClick={handleCardClick}
                            onCardsReorder={handleCardsReorder}
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button
                            className="min-w-[140px] text-base"
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
                            className="min-w-[140px]"
                            size="lg"
                            onClick={handleDeselectAll}
                            disabled={gameState.selectedCards.length === 0}
                            title={gameState.selectedCards.length === 0 ? "No cards selected" : "Deselect all selected cards"}
                        >
                            Clear selection
                        </Button>
                        <Button
                            variant="outline"
                            className="min-w-[140px] border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-300 dark:hover:bg-orange-500/10"
                            size="lg"
                            onClick={handlePass}
                            disabled={!isCurrentTurn || gameState.lastPlayedCards.length === 0 || gameState.gameWon}
                            title={gameState.gameWon
                                ? "Game is over"
                                : !isCurrentTurn
                                    ? "Not your turn"
                                    : gameState.lastPlayedCards.length === 0
                                        ? "Cannot pass on first move"
                                        : "Pass your turn"}
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