import React, { useState, useEffect, useRef } from "react";
import { WebSocketMessage } from "../types.websocket";
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
        };
    });

    const [messages, setMessages] = useState<string[]>(() => {
        return initialGameData ? ["Game started! You have 13 cards."] : [];
    });

    // WebSocket message handlers
    const messageHandlers = useRef<Record<string, (message: WebSocketMessage) => void>>({
        GAME_STARTED: (message) => {
            console.log("Game started!", message.payload);
            const currentTurn = message.payload.current_turn as string;
            const cards = message.payload.cards as string[];
            const playerList = message.payload.player_list as string[];

            setGameState(createGameState(cards, currentTurn, playerList));
            setMessages(prev => [...prev, "Game started! You have 13 cards."]);
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
            setMessages(prev => [...prev, `${player}'s turn`]);
        },

        MOVE_PLAYED: (message) => {
            const player = message.payload.player as string;
            const cards = message.payload.cards as string[];
            setMessages(prev => [...prev, `${player} played: ${cards.join(", ")}`]);
        },

        ERROR: (message) => {
            const errorMsg = message.payload.message as string;
            setMessages(prev => [...prev, `Error: ${errorMsg}`]);
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

    const handleCardClick = (card: string) => {
        setGameState(prev => ({
            ...prev,
            selectedCards: prev.selectedCards.includes(card)
                ? prev.selectedCards.filter(c => c !== card)
                : [...prev.selectedCards, card],
        }));
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

    const currentPlayer = gameState.players.find(p => p.name === username);
    const isCurrentTurn = gameState.currentTurn === username;

    // Get player positions based on player list
    const playerPositions = getPlayerPositions(gameState.playerList, username);

    // Remove the loading state check since we now initialize with game data
    return (
        <div className="game-screen">
            {/* Top Player */}
            <div className="player-position top">
                <div className="player-info">
                    <span className="player-name">{playerPositions.top || "Opponent"}</span>
                    <span className="card-count">13</span>
                </div>
                <div className="card-back-row">
                    {Array(13).fill(null).map((_, index) => (
                        <div key={index} className="card-back"></div>
                    ))}
                </div>
            </div>

            {/* Left Player */}
            <div className="player-position left">
                <div className="player-info">
                    <span className="player-name">{playerPositions.left || "Opponent"}</span>
                    <span className="card-count">13</span>
                </div>
                <div className="card-back-stack">
                    {Array(13).fill(null).map((_, index) => (
                        <div key={index} className="card-back"></div>
                    ))}
                </div>
            </div>

            {/* Right Player */}
            <div className="player-position right">
                <div className="player-info">
                    <span className="player-name">{playerPositions.right || "Opponent"}</span>
                    <span className="card-count">13</span>
                </div>
                <div className="card-back-stack">
                    {Array(13).fill(null).map((_, index) => (
                        <div key={index} className="card-back"></div>
                    ))}
                </div>
            </div>

            {/* Center Game Area */}
            <div className="game-center">
                <div className="game-info">
                    <div className="turn-indicator">
                        {isCurrentTurn ? "Your turn!" : `${gameState.currentTurn}'s turn`}
                    </div>
                    <div className="game-messages">
                        {messages.slice(-3).map((msg, index) => (
                            <div key={index} className="game-message">{msg}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Player (Current Player) */}
            <div className="player-position bottom">
                <div className="player-info">
                    <span className="player-name">{username}</span>
                    <span className="card-count">{currentPlayer?.cards.length || 0}</span>
                </div>

                {/* Player's Hand */}
                <div className="player-hand">
                    {currentPlayer?.cards.map((card, index) => {
                        // Extract suit from card (e.g., "4S" -> "S")
                        const suit = card.slice(-1);
                        return (
                            <div
                                key={index}
                                className={`card ${gameState.selectedCards.includes(card) ? 'selected' : ''}`}
                                onClick={() => handleCardClick(card)}
                                data-suit={suit}
                            >
                                {card}
                            </div>
                        );
                    })}
                </div>

                {/* Game Controls */}
                <div className="game-controls">
                    <button
                        className="play-button"
                        onClick={handlePlayCards}
                        disabled={gameState.selectedCards.length === 0 || !isCurrentTurn}
                    >
                        Play Cards ({gameState.selectedCards.length})
                    </button>
                    <button
                        className="pass-button"
                        onClick={handlePass}
                        disabled={!isCurrentTurn}
                    >
                        Pass
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GameScreen; 