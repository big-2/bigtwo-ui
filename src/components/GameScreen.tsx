import React, { useState, useEffect, useRef } from "react";
import { WebSocketMessage } from "../types.websocket";
import PlayerHand from "./PlayerHand";
import { sortSelectedCards, SortType } from "../utils/cardSorting";
import { Grid, Stack, Group, Text, Button, Card, Badge, Container, useMantineTheme } from "@mantine/core";
import { useThemeContext } from "../contexts/ThemeContext";

interface GameScreenProps {
    username: string;
    socket: WebSocket | null;
    initialGameData?: { cards: string[], currentTurn: string, playerList: string[] };
}

interface Player {
    name: string;
    cards: string[];
    isCurrentPlayer: boolean;
    isCurrentTurn: boolean;
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
}

const GameScreen: React.FC<GameScreenProps> = ({ username, socket, initialGameData }) => {
    const { theme } = useThemeContext();
    const mantineTheme = useMantineTheme();
    // Helper function to get player position based on player list
    const getPlayerPositions = (playerList: string[], currentPlayer: string) => {
        const currentIndex = playerList.indexOf(currentPlayer);
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
    const createGameState = (cards: string[], currentTurn: string, playerList: string[]) => {
        const currentPlayer: Player = {
            name: username,
            cards: cards,
            isCurrentPlayer: true,
            isCurrentTurn: currentTurn === username,
        };

        // Get player positions based on player list
        const playerPositions = getPlayerPositions(playerList, username);

        // Create other players with actual names
        const otherPlayers: Player[] = [
            { name: playerPositions.right, cards: Array(13).fill(""), isCurrentPlayer: false, isCurrentTurn: false },
            { name: playerPositions.top, cards: Array(13).fill(""), isCurrentPlayer: false, isCurrentTurn: false },
            { name: playerPositions.left, cards: Array(13).fill(""), isCurrentPlayer: false, isCurrentTurn: false },
        ];

        return {
            players: [currentPlayer, ...otherPlayers],
            currentTurn,
            currentPlayer: username,
            selectedCards: [],
            gameStarted: true,
            playerList,
            lastPlayedCards: [],
            lastPlayedBy: "",
            gameWon: false,
            winner: "",
        };
    };

    const [gameState, setGameState] = useState<GameState>(() => {
        // Initialize with initial game data if provided
        if (initialGameData) {
            return createGameState(initialGameData.cards, initialGameData.currentTurn, initialGameData.playerList);
        }

        return {
            players: [],
            currentTurn: "",
            currentPlayer: username,
            selectedCards: [],
            gameStarted: false,
            playerList: [username],
            lastPlayedCards: [],
            lastPlayedBy: "",
            gameWon: false,
            winner: "",
        };
    });

    // WebSocket message handlers
    const messageHandlers = useRef<Record<string, (message: WebSocketMessage) => void>>({
        GAME_STARTED: (message) => {
            console.log("Game started!", message.payload);
            const currentTurn = message.payload.current_turn as string;
            const cards = message.payload.cards as string[];
            const playerList = message.payload.player_list as string[];

            setGameState(createGameState(cards, currentTurn, playerList));
        },

        TURN_CHANGE: (message) => {
            const player = message.payload.player as string;
            setGameState(prev => ({
                ...prev,
                currentTurn: player,
                players: prev.players.map(p => ({
                    ...p,
                    isCurrentTurn: p.name === player,
                })),
            }));
        },

        MOVE_PLAYED: (message) => {
            const player = message.payload.player as string;
            const cards = message.payload.cards as string[];

            setGameState(prev => ({
                ...prev,
                // Only update lastPlayedCards if cards were actually played (not a pass)
                lastPlayedCards: cards.length > 0 ? cards : prev.lastPlayedCards,
                lastPlayedBy: cards.length > 0 ? player : prev.lastPlayedBy,
                players: prev.players.map(p => {
                    if (p.name === player) {
                        // Remove the played cards from the player's hand
                        const newCards = p.cards.filter(card => !cards.includes(card));
                        return { ...p, cards: newCards };
                    }
                    return p;
                }),
            }));
        },

        GAME_WON: (message) => {
            const winner = message.payload.winner as string;
            console.log(`Game won by ${winner}!`);

            setGameState(prev => ({
                ...prev,
                gameWon: true,
                winner: winner,
            }));
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

    const currentPlayer = gameState.players.find(p => p.name === username);
    const isCurrentTurn = gameState.currentTurn === username && !gameState.gameWon;

    // Get player positions based on player list
    const playerPositions = getPlayerPositions(gameState.playerList, username);

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
            const currentPlayer = prev.players.find(p => p.isCurrentPlayer);
            if (!currentPlayer) return prev;

            const updatedPlayers = prev.players.map(player =>
                player.isCurrentPlayer
                    ? { ...player, cards: newOrder }
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
            const currentPlayer = prev.players.find(p => p.isCurrentPlayer);
            if (!currentPlayer) return prev;

            const sortedCards = sortSelectedCards(
                currentPlayer.cards,
                prev.selectedCards,
                sortType
            );

            const updatedPlayers = prev.players.map(player =>
                player.isCurrentPlayer
                    ? { ...player, cards: sortedCards }
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
                                <Text size="xs" fw={700}>{playerPositions.top || "Opponent"}</Text>
                                <Text size="xs">
                                    {gameState.players.find(p => p.name === playerPositions.top)?.cards.length || 13} cards
                                </Text>
                            </Stack>
                        </Badge>
                        <Group gap={2}>
                            {Array(Math.min(gameState.players.find(p => p.name === playerPositions.top)?.cards.length || 13, 13)).fill(null).map((_, index) => (
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
                                <Text size="xs" fw={700}>{playerPositions.left || "Opponent"}</Text>
                                <Text size="xs">
                                    {gameState.players.find(p => p.name === playerPositions.left)?.cards.length || 13} cards
                                </Text>
                            </Stack>
                        </Badge>
                        <Stack gap={1}>
                            {Array(Math.min(gameState.players.find(p => p.name === playerPositions.left)?.cards.length || 13, 13)).fill(null).map((_, index) => (
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
                                        🎉 {gameState.winner === username ? "You won!" : `${gameState.winner} won!`} 🎉
                                    </Text>
                                    <Text size="lg" c="dimmed">Game Over</Text>
                                </Stack>
                            ) : (
                                <Stack align="center" gap="md">
                                    <Text size="lg" fw={600}>
                                        {isCurrentTurn ? "Your turn!" : `${gameState.currentTurn}'s turn`}
                                    </Text>

                                    {/* Last played cards display */}
                                    {gameState.lastPlayedCards.length > 0 && (
                                        <Stack align="center" gap="xs">
                                            <Text size="sm" c="dimmed">
                                                {gameState.lastPlayedBy === username ? "You played:" : `${gameState.lastPlayedBy} played:`}
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
                                <Text size="xs" fw={700}>{playerPositions.right || "Opponent"}</Text>
                                <Text size="xs">
                                    {gameState.players.find(p => p.name === playerPositions.right)?.cards.length || 13} cards
                                </Text>
                            </Stack>
                        </Badge>
                        <Stack gap={1}>
                            {Array(Math.min(gameState.players.find(p => p.name === playerPositions.right)?.cards.length || 13, 13)).fill(null).map((_, index) => (
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
                        {/* Top row with player info and controls */}
                        <Group justify="space-between" align="center">
                            <Badge 
                                color={gameState.currentTurn === username ? 'yellow' : 'gray'}
                                size="lg"
                                style={{ 
                                    animation: gameState.currentTurn === username ? 'pulse 2s infinite' : 'none',
                                    minHeight: '48px',
                                    padding: '12px 16px',
                                    borderRadius: '12px'
                                }}
                            >
                                <Stack gap={0} align="center">
                                    <Text size="xs" fw={700}>{username}</Text>
                                    <Text size="xs">{currentPlayer?.cards.length || 0} cards</Text>
                                </Stack>
                            </Badge>

                            <Group gap="md">
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

                                <Group gap="xs">
                                    <Button
                                        size="md"
                                        onClick={handlePlayCards}
                                        disabled={gameState.selectedCards.length === 0 || !isCurrentTurn || gameState.gameWon}
                                    >
                                        Play
                                        {gameState.selectedCards.length > 0 && (
                                            <Text component="span" size="xs" ml={4}>({gameState.selectedCards.length})</Text>
                                        )}
                                    </Button>
                                    <Button
                                        size="md"
                                        variant="light"
                                        color="orange"
                                        onClick={handlePass}
                                        disabled={!isCurrentTurn || gameState.lastPlayedCards.length === 0 || gameState.gameWon}
                                        title={gameState.gameWon ? "Game is over" : !isCurrentTurn ? "Not your turn" : gameState.lastPlayedCards.length === 0 ? "Cannot pass on first move" : "Pass your turn"}
                                    >
                                        Pass
                                    </Button>
                                </Group>
                            </Group>
                        </Group>

                        {/* Player's Hand */}
                        <PlayerHand
                            cards={currentPlayer?.cards || []}
                            selectedCards={gameState.selectedCards}
                            onCardClick={handleCardClick}
                            onCardsReorder={handleCardsReorder}
                        />
                    </Stack>
                </Grid.Col>
            </Grid>
        </Container>
    );
};

export default GameScreen; 