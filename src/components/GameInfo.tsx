import React from "react";

interface GameInfoProps {
    currentTurn: string;
}

const GameInfo: React.FC<GameInfoProps> = ({ currentTurn }) => {
    return (
        <div className="game-info">
            <h3>Current Turn: {currentTurn}</h3>
        </div>
    );
};

export default GameInfo;
