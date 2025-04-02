import React, { useState } from "react";
import "./ChatBox.css";

interface DisplayMessage {
    text: string;
    isCurrentUser: boolean;
}

interface ChatBoxProps {
    messages: DisplayMessage[];
    onSendMessage: (message: string) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage }) => {
    const [chatInput, setChatInput] = useState<string>("");
    const [isMinimized, setIsMinimized] = useState<boolean>(false);

    const handleSend = () => {
        if (chatInput.trim() === "") return;
        onSendMessage(chatInput);
        setChatInput("");
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`chat-box ${isMinimized ? "minimized" : ""}`}>
            <div className="chat-header" onClick={() => setIsMinimized(!isMinimized)}>
                <span>Chat</span>
                <button className="toggle-button">
                    {isMinimized ? "▲" : "▼"}
                </button>
            </div>
            {!isMinimized && (
                <div className="chat-content">
                    <div className="messages-container">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`message-text ${msg.isCurrentUser ? 'current-user' : 'other-user'}`}
                            >
                                {msg.text}
                            </div>
                        ))}
                    </div>
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Type a message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button className="chat-button" onClick={handleSend}>
                        Send
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatBox;