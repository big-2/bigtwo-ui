import React, { useState } from "react";
import Lobby from "./components/Lobby";
import GameRoom from "./components/GameRoom";
import "./index.css"; // Ensure global styles are included

const App: React.FC = () => {
    const [roomId, setRoomId] = useState<number | null>(null);

    return (
        <div className="app-wrapper">
            {roomId ? <GameRoom roomId={roomId} /> : <Lobby onJoinRoom={setRoomId} />}
        </div>
    );
};

export default App;
