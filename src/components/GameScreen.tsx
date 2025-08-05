import React, { useState, useEffect, useRef } from "react";
import { WebSocketMessage } from "../types.websocket";
import PlayerHand from "./PlayerHand";
import { sortSelectedCards, SortType } from "../utils/cardSorting";
import "./GameScreen.css";

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

    return (
        <div className="game-screen">
            {/* Top Player */}
            <div className="player-position top">
                <div className={`player-info ${gameState.currentTurn === playerPositions.top ? 'current-turn' : ''}`}>
                    <span className="player-name">{playerPositions.top || "Opponent"}</span>
                    <span className="card-count">
                        {gameState.players.find(p => p.name === playerPositions.top)?.cards.length || 13}
                    </span>
                </div>
                <div className="card-back-row">
                    {Array(gameState.players.find(p => p.name === playerPositions.top)?.cards.length || 13).fill(null).map((_, index) => (
                        <div key={index} className="card-back"></div>
                    ))}
                </div>
            </div>

            {/* Left Player */}
            <div className="player-position left">
                <div className={`player-info ${gameState.currentTurn === playerPositions.left ? 'current-turn' : ''}`}>
                    <span className="player-name">{playerPositions.left || "Opponent"}</span>
                    <span className="card-count">
                        {gameState.players.find(p => p.name === playerPositions.left)?.cards.length || 13}
                    </span>
                </div>
                <div className="card-back-stack">
                    {Array(gameState.players.find(p => p.name === playerPositions.left)?.cards.length || 13).fill(null).map((_, index) => (
                        <div key={index} className="card-back"></div>
                    ))}
                </div>
            </div>

            {/* Right Player */}
            <div className="player-position right">
                <div className={`player-info ${gameState.currentTurn === playerPositions.right ? 'current-turn' : ''}`}>
                    <span className="player-name">{playerPositions.right || "Opponent"}</span>
                    <span className="card-count">
                        {gameState.players.find(p => p.name === playerPositions.right)?.cards.length || 13}
                    </span>
                </div>
                <div className="card-back-stack">
                    {Array(gameState.players.find(p => p.name === playerPositions.right)?.cards.length || 13).fill(null).map((_, index) => (
                        <div key={index} className="card-back"></div>
                    ))}
                </div>
            </div>

            {/* Center Game Area */}
            <div className="game-center">
                <div className="game-info">
                    {gameState.gameWon ? (
                        <div className="game-won">
                            <div className="winner-announcement">
                                🎉 {gameState.winner === username ? "You won!" : `${gameState.winner} won!`} 🎉
                            </div>
                            <div className="game-over">Game Over</div>
                        </div>
                    ) : (
                        <>
                            <div className="turn-indicator">
                                {isCurrentTurn ? "Your turn!" : `${gameState.currentTurn}'s turn`}
                            </div>

                            {/* Last played cards display */}
                            {gameState.lastPlayedCards.length > 0 && (
                                <div className="last-played">
                                    <div className="last-played-label">
                                        {gameState.lastPlayedBy === username ? "You played:" : `${gameState.lastPlayedBy} played:`}
                                    </div>
                                    <div className="last-played-cards">
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
                                                    className="played-card"
                                                    data-suit={suit}
                                                    title={card}
                                                    style={{ color: getSuitColor(suit) }}
                                                >
                                                    <div className="card-content">
                                                        <div className="card-rank">{rank}</div>
                                                        <div className="card-suit">{getSuitSymbol(suit)}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Player (Current Player) */}
            <div className="player-position bottom">
                {/* Top row with player info and controls */}
                <div className="bottom-top-row">
                    <div className={`player-info ${gameState.currentTurn === username ? 'current-turn' : ''}`}>
                        <span className="player-name">{username}</span>
                        <span className="card-count">{currentPlayer?.cards.length || 0}</span>
                    </div>

                    <div className="sort-controls">
                        <div className="sort-controls-label">Sort</div>
                        <div className="sort-buttons-row">
                            <button
                                className="sort-button"
                                onClick={() => handleSortCards('numerical')}
                                title="Sort by rank (3 smallest, 2 biggest)"
                            >
                                Rank
                            </button>
                            <button
                                className="sort-button"
                                onClick={() => handleSortCards('suit')}
                                title="Sort by suit (♦♣♥♠)"
                            >
                                Suit
                            </button>
                        </div>
                    </div>

                    <div className="play-controls">
                        <button
                            className="play-button"
                            onClick={handlePlayCards}
                            disabled={gameState.selectedCards.length === 0 || !isCurrentTurn || gameState.gameWon}
                        >
                            Play
                            {gameState.selectedCards.length > 0 && (
                                <span className="card-count">({gameState.selectedCards.length})</span>
                            )}
                        </button>
                        <button
                            className="pass-button"
                            onClick={handlePass}
                            disabled={!isCurrentTurn || gameState.lastPlayedCards.length === 0 || gameState.gameWon}
                            title={gameState.gameWon ? "Game is over" : !isCurrentTurn ? "Not your turn" : gameState.lastPlayedCards.length === 0 ? "Cannot pass on first move" : "Pass your turn"}
                        >
                            Pass
                        </button>
                    </div>
                </div>

                {/* Player's Hand */}
                <PlayerHand
                    cards={currentPlayer?.cards || []}
                    selectedCards={gameState.selectedCards}
                    onCardClick={handleCardClick}
                    onCardsReorder={handleCardsReorder}
                />
            </div>
        </div>
    );
};

export default GameScreen; 