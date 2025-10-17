import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

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
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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

    const parseMessage = (text: string) => {
        const match = text.match(/^(.*?):\s*(.*)$/);
        if (match) {
            return { sender: match[1], content: match[2] };
        }
        return { sender: "", content: text };
    };

    return (
        <Card className="flex h-full flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-4 pt-0">
                <ScrollArea className="flex-1 pr-4">
                    <div ref={scrollRef} className="space-y-1">
                        {messages.map((msg, index) => {
                            const { sender, content } = parseMessage(msg.text);
                            const isSystem = sender === "SYSTEM";

                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "rounded-md px-3 py-2 text-sm transition-colors",
                                        index % 2 === 0 ? "bg-muted/30" : "bg-transparent"
                                    )}
                                >
                                    {isSystem ? (
                                        <p className="text-muted-foreground italic">
                                            {content}
                                        </p>
                                    ) : (
                                        <p>
                                            <span className={cn(
                                                "font-semibold",
                                                msg.isCurrentUser ? "text-primary" : "text-foreground"
                                            )}>
                                                {sender}
                                            </span>
                                            <span className="text-muted-foreground">: </span>
                                            <span className="text-foreground">{content}</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                <div className="flex gap-2">
                    <Input
                        placeholder="Type a message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} size="sm">
                        Send
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default ChatBox;
