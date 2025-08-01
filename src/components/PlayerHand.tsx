import React from "react";

interface CardProps {
    card: string;
    isSelected: boolean;
    onClick: (card: string) => void;
}

const Card: React.FC<CardProps> = ({ card, isSelected, onClick }) => {
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
            className={`card ${isSelected ? 'selected' : ''}`}
            onClick={() => onClick(card)}
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
};

interface PlayerHandProps {
    cards: string[];
    selectedCards: string[];
    onCardClick: (card: string) => void;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
    cards,
    selectedCards,
    onCardClick
}) => {
    return (
        <div className="player-hand">
            {cards.map((card, index) => (
                <Card
                    key={index}
                    card={card}
                    isSelected={selectedCards.includes(card)}
                    onClick={onCardClick}
                />
            ))}
        </div>
    );
};

export default PlayerHand;
