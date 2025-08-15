import React, { useState } from "react";
import { Paper, Group, Text, ActionIcon, ScrollArea, TextInput, Button, Stack, Collapse } from "@mantine/core";

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
        <Paper
            shadow="md"
            radius="md"
            style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                width: 320,
                overflow: 'hidden'
            }}
        >
            <Group 
                justify="space-between" 
                p="sm" 
                bg="blue" 
                c="white"
                style={{ cursor: 'pointer' }}
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <Text fw={600}>Chat</Text>
                <ActionIcon variant="transparent" c="white" size="sm">
                    {isMinimized ? "▲" : "▼"}
                </ActionIcon>
            </Group>
            
            <Collapse in={!isMinimized}>
                <Stack gap="sm" p="sm">
                    <ScrollArea h={200}>
                        <Stack gap="xs">
                            {messages.map((msg, index) => (
                                <Text
                                    key={index}
                                    size="sm"
                                    c={msg.isCurrentUser ? "blue" : "red"}
                                    ta={msg.isCurrentUser ? "right" : "left"}
                                >
                                    {msg.text}
                                </Text>
                            ))}
                        </Stack>
                    </ScrollArea>
                    
                    <TextInput
                        placeholder="Type a message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.currentTarget.value)}
                        onKeyDown={handleKeyDown}
                        size="sm"
                    />
                    
                    <Button onClick={handleSend} size="sm" fullWidth>
                        Send
                    </Button>
                </Stack>
            </Collapse>
        </Paper>
    );
};

export default ChatBox;