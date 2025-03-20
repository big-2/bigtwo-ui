import React, { useState, useEffect, useRef } from "react";
import { connectToRoom } from "../services/socket";
import { Room } from '../services/api';
import "./GameRoom.css";
import ChatBox from "./ChatBox";
import PlayerList from "./PlayerList";


interface GameRoomProps {
    roomId: string;
    username: string;
    roomDetails: Room | null;
}


const GameRoom: React.FC<GameRoomProps> = ({ roomId, username, roomDetails }) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<{ text: string, isCurrentUser: boolean }[]>([]);
    const [rawMessages, setRawMessages] = useState<string[]>([]);
    const [players, setPlayers] = useState<string[]>([username]);  // Default to have self, update when players_list message received
    const [hostName, setHostName] = useState<string>(roomDetails?.host_name || "");

    useEffect(() => {
        socketRef.current = connectToRoom(roomId, username, (msg) => {
            if (msg.startsWith("CHAT:")) {
                setRawMessages((prevMessages) => [...prevMessages, msg]);
            }
            else if (msg.startsWith("PLAYERS_LIST:")) {
                const playersList = msg.substring("PLAYERS_LIST:".length).trim().split(",");
                setPlayers(playersList);
            }
            else if (msg.startsWith("LEAVE:")) {
                const leftPlayerName = msg.substring("LEAVE:".length).trim();
                console.log(`Player left: ${leftPlayerName}`);

                setPlayers(currentPlayers =>
                    currentPlayers.filter(player => player !== leftPlayerName)
                );
            }
            else if (msg.startsWith("HOST_CHANGE:")) {
                const newHost = msg.substring("HOST_CHANGE:".length).trim();
                console.log(`New host: ${newHost}`);
                setHostName(newHost);

                // Add a message to the chat
                if (newHost === username) {
                    setRawMessages(prevMessages => [
                        ...prevMessages,
                        `CHAT: SYSTEM: You are now the host of this room.`
                    ]);
                } else {
                    setRawMessages(prevMessages => [
                        ...prevMessages,
                        `CHAT: SYSTEM: ${newHost} is now the host of this room.`
                    ]);
                }
            }
        });

        return () => {
            socketRef.current?.close();
        };
    }, []);

    useEffect(() => {
        // Process raw messages once playerName is set and/or messages arrive
        if (username && rawMessages.length > 0) {
            setMessages(prevMessages => [
                ...prevMessages,
                ...rawMessages.map(msg => {
                    const messageContent = msg.replace("CHAT:", "").trim();
                    const isCurrentUser = messageContent.startsWith(username);
                    return { text: messageContent, isCurrentUser };
                })
            ]);
            // Clear raw messages once they've been processed
            setRawMessages([]);
        }
    }, [rawMessages]); // Trigger processing when messages or the name change

    const sendChatMessage = (message: string) => {
        socketRef.current?.send(`CHAT: ${message}`);
    };

    // Set the initial host name from room details when they change
    useEffect(() => {
        if (roomDetails?.host_name) {
            setHostName(roomDetails.host_name);
        }
    }, [roomDetails]);

    return (
        <div className="game-room-wrapper">
            <div className="game-room-container wide">
                <h2 className="game-room-title">Game Room {roomId}</h2>
                <PlayerList players={players} currentPlayer={username} host={hostName} />
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
