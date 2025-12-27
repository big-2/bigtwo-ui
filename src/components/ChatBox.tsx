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
    // Optional controlled input for draft persistence
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    // Hide the Card wrapper and title (useful for mobile drawer)
    hideCard?: boolean;
    // Keep input focused after sending (useful for mobile)
    keepFocusAfterSend?: boolean;
    // Trigger scroll to bottom when this value changes (useful for modal open)
    scrollTrigger?: number;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, draftValue, onDraftChange, hideCard = false, keepFocusAfterSend = false, scrollTrigger }) => {
    const isControlled = typeof draftValue === "string" && typeof onDraftChange === "function";
    const [uncontrolledInput, setUncontrolledInput] = useState<string>("");
    const chatInput = isControlled ? (draftValue as string) : uncontrolledInput;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Scroll to bottom when scrollTrigger changes (e.g., when modal opens)
    useEffect(() => {
        if (scrollTrigger !== undefined && scrollTrigger > 0) {
            // Use a small delay to ensure the container is fully rendered
            const timeoutId = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
            }, 50);
            return () => clearTimeout(timeoutId);
        }
    }, [scrollTrigger]);

    const handleSend = () => {
        if (chatInput.trim() === "") return;
        onSendMessage(chatInput);
        if (isControlled) {
            onDraftChange!("");
        } else {
            setUncontrolledInput("");
        }

        // Keep focus on input to prevent keyboard from closing on mobile
        if (keepFocusAfterSend) {
            // Use setTimeout to ensure the input is cleared first
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        }
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

    const content = (
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            <ScrollArea
                ref={scrollAreaRef}
                className={cn(
                    "flex-1 pr-2",
                    // Smooth scrolling
                    "[&>[data-radix-scroll-area-viewport]]:scroll-smooth",
                    // Make scrollbar more visible
                    "[&>[data-radix-scroll-area-scrollbar]]:w-2",
                    "[&>[data-radix-scroll-area-scrollbar]>div]:bg-muted-foreground/40",
                    "[&>[data-radix-scroll-area-scrollbar]:hover>div]:bg-muted-foreground/60"
                )}
            >
                <div className="space-y-1 pr-2">
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
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            <div className="flex gap-2">
                <Input
                    ref={inputRef}
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => {
                        if (isControlled) {
                            onDraftChange && onDraftChange(e.target.value);
                        } else {
                            setUncontrolledInput(e.target.value);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                />
                <Button onClick={handleSend} size="sm">
                    Send
                </Button>
            </div>
        </div>
    );

    if (hideCard) {
        return content;
    }

    return (
        <Card className="flex h-full flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-4 pt-0">
                {content}
            </CardContent>
        </Card>
    );
};

export default ChatBox;
