import React from "react";

interface JoinRoomProps {

}

const JoinRoom: React.FC<JoinRoomProps> = () => {
    return (
        <div className="join-room-container">
            <h2 className="join-room-title">Join a Room</h2>
            <form
                className="join-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleJoinGame();
                }}
            >
                <input
                    type="text"
                    className="name-input"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
                <button className="join-button" type="submit">Join Game</button>
            </form>
        </div>
    );
};