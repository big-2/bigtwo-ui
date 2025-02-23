import React, { useState, useEffect, useRef } from "react";
import { connectToRoom } from "../services/socket";
import "./GameRoom.css";
import PlayerHand from "./PlayerHand";
import MoveInput from "./MoveInput";
import ChatBox from "./ChatBox";
import GameInfo from "./GameInfo";

interface GameRoomProps {
    roomId: string;
    playerId: number;
}

const GameRoom: React.FC<GameRoomProps> = ({ roomId, playerId }) => {
    const [messages, setMessages] = useState<{ text: string, isCurrentUser: boolean }[]>([]);
    const [rawMessages, setRawMessages] = useState<string[]>([]);

    const [playerName, setPlayerName] = useState<string>("");
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        socketRef.current = connectToRoom(roomId, (msg) => {
            if (msg.startsWith("CHAT:")) {
                setRawMessages((prevMessages) => [...prevMessages, msg]);
            }
            else if (msg.startsWith("PLAYER_NAME:")) {
                const receivedPlayerName = msg.replace("PLAYER_NAME:", "").trim();
                console.log("Received player name:", receivedPlayerName);
                setPlayerName(receivedPlayerName);
            }
        });

        return () => {
            socketRef.current?.close();
        };
    }, []);

    useEffect(() => {
        // Process raw messages once playerName is set and/or messages arrive
        if (playerName && rawMessages.length > 0) {
            setMessages(prevMessages => [
                ...prevMessages,
                ...rawMessages.map(msg => {
                    const messageContent = msg.replace("CHAT:", "").trim();
                    const isCurrentUser = messageContent.startsWith(playerName);
                    return { text: messageContent, isCurrentUser };
                })
            ]);
            // Clear raw messages once they've been processed
            setRawMessages([]);
        }
    }, [playerName, rawMessages]); // Trigger processing when messages or the name change

    const playMove = (move: string) => {
        socketRef.current?.send(`MOVE: ${move}`);
    };

    const sendChatMessage = (message: string) => {
        socketRef.current?.send(`CHAT: ${message}`);
    };

    return (
        <div className="game-room-wrapper">
            <h1 className="game-title">Big Two Game</h1>
            <div className="game-room-container wide">
                <h2 className="game-room-title">Game Room {roomId}</h2>
                <>
                    {/* <GameInfo currentTurn={currentTurn} />
                    <PlayerHand hand={hand} /> */}
                    {/* <MoveInput currentTurn={currentTurn} playerName={playerName} onPlayMove={playMove} /> */}
                    <ChatBox messages={messages} onSendMessage={sendChatMessage} />
                </>
            </div>
        </div>
    );
};

export default GameRoom;
