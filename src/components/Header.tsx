import React from "react";
import { useNavigate } from "react-router-dom";
import { useThemeContext } from "../contexts/ThemeContext";
import { Group, Title, Button, Text, ActionIcon, Badge } from "@mantine/core";

interface HeaderProps {
    username: string;
    showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ username, showBackButton = false }) => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useThemeContext();

    const handleBack = () => {
        navigate("/");
    };

    return (
        <Group 
            justify="space-between" 
            p="md" 
            style={{ 
                backgroundColor: 'var(--mantine-color-blue-6)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}
        >
            <Title order={2} c="white">Big Two Game</Title>
            <Group gap="md">
                {showBackButton && (
                    <Button onClick={handleBack} variant="light" color="white">
                        Back to Lobby
                    </Button>
                )}
                <Badge size="lg" variant="light" color="white">
                    <Text size="sm">Playing as: <Text component="span" fw={700}>{username}</Text></Text>
                </Badge>
                <ActionIcon
                    onClick={toggleTheme}
                    variant="light"
                    color="white"
                    size="lg"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </ActionIcon>
            </Group>
        </Group>
    );
};

export default Header; 