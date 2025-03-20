import React, { useEffect } from "react";
import "./PlayerList.css";

interface PlayerListProps {
    players: string[];
    currentPlayer: string;
    host?: string;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayer, host }) => {
    console.log("Players", players, "Current Player", currentPlayer, "Host", host);
    useEffect(() => {
        // Check if player names match the current player
        players.forEach(player => {
            console.log(`Comparing: '${player}' === '${currentPlayer}' -> ${player === currentPlayer}`);
        });
    }, [players, currentPlayer]);
    return (
        <div className="player-list-container">
            <h3>Players in Game</h3>
            <ul className="players-list">
                {players.map((player) => (
                    <li key={player} className={player === currentPlayer ? "current-player" : ""}>
                        <span className="player-name">{player}</span>
                        {player === currentPlayer && <span className="you-indicator">(You)</span>}
                        {player === host && <span className="host-indicator">(Host)</span>}
                    </li>
                ))}
            </ul>
            <div className="player-count">
                {players.length}/4 Players
            </div>
        </div>
    );
};

export default PlayerList; 