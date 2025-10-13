import React, { useState, useEffect, useRef } from "react";
import { WebSocketMessage } from "../types.websocket";
import PlayerHand from "./PlayerHand";
import { sortSelectedCards, SortType } from "../utils/cardSorting";
import { Grid, Stack, Group, Text, Button, Card, Badge, Container, useMantineTheme } from "@mantine/core";
import { IconRobot } from "@tabler/icons-react";
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
    const mantineTheme = useMantineTheme();

    // Helper function to get display name from UUID or return the original value if it's already a username
    const getDisplayName = (uuidOrName: string, mapping: Record<string, string>) => {
        return mapping[uuidOrName] || uuidOrName;
    };

    // Helper function to render player name with bot badge if applicable
    const renderPlayerName = (playerUuid: string, mapping: Record<string, string>, size: "xs" | "sm" | "md" | "lg" = "xs") => {
        const displayName = getDisplayName(playerUuid, mapping);
        const isBot = botUuids.has(playerUuid);

        return (
            <Group gap={4} justify="center">
                {isBot && <IconRobot size={size === "xs" ? 12 : size === "sm" ? 14 : 16} />}
                <Text size={size} fw={700}>{displayName || "Opponent"}</Text>
                {isBot && <Badge size="xs" color="grape" variant="light">Bot</Badge>}
            </Group>
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
                cardCount: 13,
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

            const lastCards = (message.payload as any).last_played_cards as string[] | undefined;
            const lastPlayer = (message.payload as any).last_played_by as string | undefined;

            setGameState(prev => {
                const nextState = createGameState(
                    cards,
                    currentTurn,
                    playerList,
                    uuid,
                    Array.isArray(lastCards) ? lastCards : [],
                    lastPlayer || "",
                );
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

                    // For opponents, decrement count optimistically
                    // Note: This assumes server and client stay in sync. If desyncs occur,
                    // consider adding periodic state validation from the backend.
                    const updatedCount = Math.max(0, p.cardCount - cards.length);
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

    // Theme-responsive background styling
    const containerStyle = {
        height: '100vh',
        background: theme === 'light'
            ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
            : `
                linear-gradient(135deg, ${mantineTheme.colors.dark[7]} 0%, ${mantineTheme.colors.dark[6]} 100%),
                linear-gradient(45deg, rgba(96, 165, 250, 0.05) 25%, transparent 25%), 
                linear-gradient(-45deg, rgba(96, 165, 250, 0.05) 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, rgba(96, 165, 250, 0.05) 75%), 
                linear-gradient(-45deg, transparent 75%, rgba(96, 165, 250, 0.05) 75%)
              `,
        backgroundSize: theme === 'light'
            ? '100% 100%'
            : '100% 100%, 80px 80px, 80px 80px, 80px 80px, 80px 80px',
        backgroundPosition: theme === 'light'
            ? '0 0'
            : '0 0, 0 0, 40px 0, 40px -40px, 0px 40px',
        padding: 0,
        transition: 'background 0.3s ease'
    };

    return (
        <Container
            fluid
            style={containerStyle}
        >
            <Grid
                style={{ height: '100vh', margin: 0 }}
                gutter={0}
            >
                {/* Top Player */}
                <Grid.Col span={12} style={{ height: '25%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 10 }}>
                    <Group gap="lg" align="center">
                        <Badge
                            color={gameState.currentTurn === playerPositions.top ? 'yellow' : 'gray'}
                            size="lg"
                            style={{
                                animation: gameState.currentTurn === playerPositions.top ? 'pulse 2s infinite' : 'none',
                                minHeight: '48px',
                                padding: '12px 16px',
                                borderRadius: '12px'
                            }}
                        >
                            <Stack gap={0} align="center">
                                {renderPlayerName(playerPositions.top, gameState.uuidToName)}
                                <Text size="xs">
                                    {topPlayer
                                        ? topPlayer.cardCount === 0 && gameState.gameWon
                                            ? "WIN"
                                            : `${topPlayer.cardCount} cards`
                                        : "0 cards"}
                                </Text>
                                {topPlayer?.hasPassed && (
                                    <Text size="xs" c="dimmed" fw={600}>PASSED</Text>
                                )}
                            </Stack>
                        </Badge>
                        <Group gap={2}>
                            {Array(Math.min(topPlayer?.cardCount ?? 0, 13)).fill(null).map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        width: 45,
                                        height: 60,
                                        background: '#1c7ed6',
                                        border: '1px solid #1864ab',
                                        borderRadius: 6,
                                        marginLeft: index > 0 ? -8 : 0,
                                        position: 'relative',
                                        zIndex: 13 - index
                                    }}
                                />
                            ))}
                        </Group>
                    </Group>
                </Grid.Col>

                {/* Middle Row with Left Player, Center, Right Player */}
                <Grid.Col span={12} style={{ height: '50%', display: 'flex' }}>
                    {/* Left Player */}
                    <div style={{ width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <Badge
                            color={gameState.currentTurn === playerPositions.left ? 'yellow' : 'gray'}
                            size="lg"
                            mb="md"
                            style={{
                                animation: gameState.currentTurn === playerPositions.left ? 'pulse 2s infinite' : 'none',
                                minHeight: '48px',
                                padding: '12px 16px',
                                borderRadius: '12px'
                            }}
                        >
                            <Stack gap={0} align="center">
                                {renderPlayerName(playerPositions.left, gameState.uuidToName)}
                                <Text size="xs">
                                    {leftPlayer
                                        ? leftPlayer.cardCount === 0 && gameState.gameWon
                                            ? "WIN"
                                            : `${leftPlayer.cardCount} cards`
                                        : "0 cards"}
                                </Text>
                                {leftPlayer?.hasPassed && (
                                    <Text size="xs" c="dimmed" fw={600}>PASSED</Text>
                                )}
                            </Stack>
                        </Badge>
                        <Stack gap={1}>
                            {Array(Math.min(leftPlayer?.cardCount ?? 0, 13)).fill(null).map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        width: 60,
                                        height: 20,
                                        background: '#1c7ed6',
                                        border: '1px solid #1864ab',
                                        borderRadius: 4,
                                        marginTop: index > 0 ? -8 : 0,
                                        position: 'relative',
                                        zIndex: 13 - index
                                    }}
                                />
                            ))}
                        </Stack>
                    </div>

                    {/* Center Game Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <Card shadow="md" padding="lg" radius="md" style={{ minWidth: 300, textAlign: 'center' }}>
                            {gameState.gameWon ? (
                                <Stack align="center" gap="sm">
                                    <Text size="xl" fw={700} c="green">
                                        🎉 {gameState.winner === uuid ? "You won!" : `${getDisplayName(gameState.winner, gameState.uuidToName)} won!`} 🎉
                                    </Text>
                                    <Text size="lg" c="dimmed">Game Over</Text>
                                    {gameState.countdown > 0 && (
                                        <Text size="md" c="blue" fw={600}>
                                            Returning to lobby in {gameState.countdown}...
                                        </Text>
                                    )}
                                </Stack>
                            ) : (
                                <Stack align="center" gap="md">
                                    <Text size="lg" fw={600}>
                                        {isCurrentTurn ? "Your turn!" : `${getDisplayName(gameState.currentTurn, gameState.uuidToName)}'s turn`}
                                    </Text>

                                    {/* Last played cards display */}
                                    {gameState.lastPlayedCards.length > 0 && (
                                        <Stack align="center" gap="xs">
                                            <Text size="sm" c="dimmed">
                                                {gameState.lastPlayedBy === uuid ? "You played:" : `${getDisplayName(gameState.lastPlayedBy, gameState.uuidToName)} played:`}
                                            </Text>
                                            <Group gap="xs">
                                                {gameState.lastPlayedCards.map((card, index) => {
                                                    const suit = card.slice(-1);
                                                    const rank = card.slice(0, -1);

                                                    const getSuitColor = (suit: string) => {
                                                        switch (suit) {
                                                            case 'H':
                                                            case 'D':
                                                                return '#ff6b6b';
                                                            case 'S':
                                                            case 'C':
                                                                return '#000000';
                                                            default:
                                                                return '#000000';
                                                        }
                                                    };

                                                    const getSuitSymbol = (suit: string) => {
                                                        switch (suit) {
                                                            case 'H': return '♥';
                                                            case 'D': return '♦';
                                                            case 'S': return '♠';
                                                            case 'C': return '♣';
                                                            default: return suit;
                                                        }
                                                    };

                                                    return (
                                                        <div
                                                            key={index}
                                                            style={{
                                                                width: 40,
                                                                height: 55,
                                                                background: 'white',
                                                                border: '1px solid #ddd',
                                                                borderRadius: 4,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: getSuitColor(suit),
                                                                fontSize: '12px',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            <div>{rank}</div>
                                                            <div style={{ fontSize: '16px' }}>{getSuitSymbol(suit)}</div>
                                                        </div>
                                                    );
                                                })}
                                            </Group>
                                        </Stack>
                                    )}
                                </Stack>
                            )}
                        </Card>
                    </div>

                    {/* Right Player */}
                    <div style={{ width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <Badge
                            color={gameState.currentTurn === playerPositions.right ? 'yellow' : 'gray'}
                            size="lg"
                            mb="md"
                            style={{
                                animation: gameState.currentTurn === playerPositions.right ? 'pulse 2s infinite' : 'none',
                                minHeight: '48px',
                                padding: '12px 16px',
                                borderRadius: '12px'
                            }}
                        >
                            <Stack gap={0} align="center">
                                {renderPlayerName(playerPositions.right, gameState.uuidToName)}
                                <Text size="xs">
                                    {rightPlayer
                                        ? rightPlayer.cardCount === 0 && gameState.gameWon
                                            ? "WIN"
                                            : `${rightPlayer.cardCount} cards`
                                        : "0 cards"}
                                </Text>
                                {rightPlayer?.hasPassed && (
                                    <Text size="xs" c="dimmed" fw={600}>PASSED</Text>
                                )}
                            </Stack>
                        </Badge>
                        <Stack gap={1}>
                            {Array(Math.min(rightPlayer?.cardCount ?? 0, 13)).fill(null).map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        width: 60,
                                        height: 20,
                                        background: '#1c7ed6',
                                        border: '1px solid #1864ab',
                                        borderRadius: 4,
                                        marginTop: index > 0 ? -8 : 0,
                                        position: 'relative',
                                        zIndex: 13 - index
                                    }}
                                />
                            ))}
                        </Stack>
                    </div>
                </Grid.Col>

                {/* Bottom Player (Current Player) */}
                <Grid.Col span={12} style={{ height: '25%' }}>
                    <Stack gap="xs" p="sm">
                        {/* Top row with player info centered and sort controls on right */}
                        <Group justify="space-between" align="center">
                            <div style={{ width: 120 }}></div> {/* Spacer for balance */}

                            <Badge
                                color={gameState.currentTurn === uuid ? 'yellow' : 'gray'}
                                size="lg"
                                style={{
                                    animation: gameState.currentTurn === uuid ? 'pulse 2s infinite' : 'none',
                                    minHeight: '48px',
                                    padding: '12px 16px',
                                    borderRadius: '12px'
                                }}
                            >
                                <Stack gap={0} align="center">
                                    <Text size="xs" fw={700}>{gameState.uuidToName[uuid] || username}</Text>
                                    <Text size="xs">
                                        {currentPlayer
                                            ? currentPlayer.cardCount === 0 && gameState.gameWon
                                                ? "WIN"
                                                : `${currentPlayer.cardCount} cards`
                                            : "0 cards"}
                                    </Text>
                                </Stack>
                            </Badge>

                            <div>
                                <Text size="xs" c="dimmed" mb={4}>Sort</Text>
                                <Group gap="xs">
                                    <Button
                                        size="xs"
                                        variant="light"
                                        onClick={() => handleSortCards('numerical')}
                                        title="Sort by rank (3 smallest, 2 biggest)"
                                    >
                                        Rank
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="light"
                                        onClick={() => handleSortCards('suit')}
                                        title="Sort by suit (♦♣♥♠)"
                                    >
                                        Suit
                                    </Button>
                                </Group>
                            </div>
                        </Group>

                        {/* Player's Hand */}
                        <PlayerHand
                            cards={currentPlayer?.cards || []}
                            selectedCards={gameState.selectedCards}
                            onCardClick={handleCardClick}
                            onCardsReorder={handleCardsReorder}
                        />

                        {/* Game Action Buttons - Centered below hand */}
                        <Group justify="center" gap="lg" mt="sm">
                            <Button
                                size="lg"
                                color={theme === 'dark' && gameState.selectedCards.length > 0 && isCurrentTurn && !gameState.gameWon ? 'green' : undefined}
                                onClick={handlePlayCards}
                                disabled={gameState.selectedCards.length === 0 || !isCurrentTurn || gameState.gameWon}
                                style={{ minWidth: 120 }}
                            >
                                Play
                                {gameState.selectedCards.length > 0 && (
                                    <Text component="span" size="sm" ml={4}>({gameState.selectedCards.length})</Text>
                                )}
                            </Button>
                            <Button
                                size="lg"
                                variant="light"
                                onClick={handleDeselectAll}
                                disabled={gameState.selectedCards.length === 0}
                                title={gameState.selectedCards.length === 0 ? "No cards selected" : "Deselect all selected cards"}
                                style={{ minWidth: 120 }}
                            >
                                Clear selection
                            </Button>
                            <Button
                                size="lg"
                                variant="light"
                                color="orange"
                                onClick={handlePass}
                                disabled={!isCurrentTurn || gameState.lastPlayedCards.length === 0 || gameState.gameWon}
                                title={gameState.gameWon ? "Game is over" : !isCurrentTurn ? "Not your turn" : gameState.lastPlayedCards.length === 0 ? "Cannot pass on first move" : "Pass your turn"}
                                style={{ minWidth: 120 }}
                            >
                                Pass
                            </Button>
                        </Group>
                    </Stack>
                </Grid.Col>
            </Grid>
        </Container>
    );
};

export default GameScreen; 