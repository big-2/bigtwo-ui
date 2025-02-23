import React from "react";

interface PlayerHandProps {
    hand: string[];
}

const PlayerHand: React.FC<PlayerHandProps> = ({ hand }) => {
    return (
        <div className="hand-container">
            <h3>Your Hand:</h3>
            <div className="card-list">
                {hand.map((card, index) => (
                    <span key={index} className="card">{card}</span>
                ))}
            </div>
        </div>
    );
};

export default PlayerHand;
