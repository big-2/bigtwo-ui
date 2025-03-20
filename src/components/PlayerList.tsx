import React from "react";
import "./PlayerList.css";

interface PlayerListProps {
    players: string[];
    currentPlayer: string;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayer }) => {
    return (
        <div className="player-list-container">
            <h3>Players in Game</h3>
            <ul className="players-list">
                {players.map((player) => (
                    <li key={player} className={player === currentPlayer ? "current-player" : ""}>
                        {player} {player === currentPlayer ? "(You)" : ""}
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