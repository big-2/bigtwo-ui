import React, { useState, useEffect, useRef } from "react";
import { WebSocketMessage } from "../types.websocket";
import "./GameScreen.css";

interface GameScreenProps {
    username: string;
    socket: WebSocket | null;
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
}

const GameScreen: React.FC<GameScreenProps> = ({ username, socket }) => {
    const [gameState, setGameState] = useState<GameState>({
        players: [],
        currentTurn: "",
        currentPlayer: username,
        selectedCards: [],
        gameStarted: false,
    });

    const [messages, setMessages] = useState<string[]>([]);

    // WebSocket message handlers
    const messageHandlers = useRef<Record<string, (message: WebSocketMessage) => void>>({
        GAME_STARTED: (message) => {
            console.log("Game started!", message.payload);
            const currentTurn = message.payload.current_turn as string;
            const cards = message.payload.cards as string[];

            // Initialize players with the current player's cards
            const currentPlayer: Player = {
                name: username,
                cards: cards,
                isCurrentPlayer: true,
                isCurrentTurn: currentTurn === username,
            };

            // Create placeholder players for other positions
            const otherPlayers: Player[] = [
                { name: "Player 1", cards: Array(13).fill(""), isCurrentPlayer: false, isCurrentTurn: false },
                { name: "Player 2", cards: Array(13).fill(""), isCurrentPlayer: false, isCurrentTurn: false },
                { name: "Player 3", cards: Array(13).fill(""), isCurrentPlayer: false, isCurrentTurn: false },
            ];

            setGameState(prev => ({
                ...prev,
                players: [currentPlayer, ...otherPlayers],
                currentTurn,
                gameStarted: true,
            }));

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

    if (!gameState.gameStarted) {
        return (
            <div className="game-loading">
                <div className="loading-spinner"></div>
                <p>Waiting for game to start...</p>
            </div>
        );
    }

    return (
        <div className="game-screen">
            {/* Top Player */}
            <div className="player-position top">
                <div className="player-info">
                    <span className="player-name">Player 1</span>
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
                    <span className="player-name">Player 2</span>
                    <span className="card-count">13</span>
                </div>
                <div className="card-back-column">
                    {Array(13).fill(null).map((_, index) => (
                        <div key={index} className="card-back vertical"></div>
                    ))}
                </div>
            </div>

            {/* Right Player */}
            <div className="player-position right">
                <div className="player-info">
                    <span className="player-name">Player 3</span>
                    <span className="card-count">13</span>
                </div>
                <div className="card-back-column">
                    {Array(13).fill(null).map((_, index) => (
                        <div key={index} className="card-back vertical"></div>
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
                    {currentPlayer?.cards.map((card, index) => (
                        <div
                            key={index}
                            className={`card ${gameState.selectedCards.includes(card) ? 'selected' : ''}`}
                            onClick={() => handleCardClick(card)}
                        >
                            {card}
                        </div>
                    ))}
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