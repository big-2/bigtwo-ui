import React, { useState } from "react";

interface MoveInputProps {
    currentTurn: string;
    playerName: string;
    onPlayMove: (move: string) => void;
}

const MoveInput: React.FC<MoveInputProps> = ({ currentTurn, playerName, onPlayMove }) => {
    const [moveInput, setMoveInput] = useState<string>("");

    const handleSubmit = () => {
        if (currentTurn === playerName && moveInput.trim() !== "") {
            onPlayMove(moveInput);
            setMoveInput(""); // Clear input after move
        }
    };

    return (
        <div className="move-section">
            <input
                type="text"
                className="move-input"
                placeholder="Enter your move..."
                value={moveInput}
                onChange={(e) => setMoveInput(e.target.value)}
                disabled={currentTurn !== playerName}
            />
            <button
                className="move-button"
                onClick={handleSubmit}
                disabled={currentTurn !== playerName}
            >
                Play Move
            </button>
        </div>
    );
};

export default MoveInput;
