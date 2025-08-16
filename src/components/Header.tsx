import React from "react";
import { useNavigate } from "react-router-dom";
import { useThemeContext } from "../contexts/ThemeContext";
import { Group, Title, Button, Text, Badge, useMantineTheme } from "@mantine/core";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
    username: string;
    showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ username, showBackButton = false }) => {
    const navigate = useNavigate();
    const { theme } = useThemeContext();
    const mantineTheme = useMantineTheme();

    const handleBack = () => {
        navigate("/");
    };

    // Theme-responsive header styling
    const headerStyle = {
        backgroundColor: theme === 'light'
            ? '#ffffff'
            : mantineTheme.colors.dark[7],
        borderBottom: `1px solid ${theme === 'light'
            ? mantineTheme.colors.gray[2]
            : mantineTheme.colors.dark[4]}`,
        boxShadow: theme === 'light'
            ? '0 1px 3px rgba(0, 0, 0, 0.1)'
            : '0 1px 3px rgba(0, 0, 0, 0.3)',
        position: 'sticky' as const,
        top: 0,
        zIndex: 100,
        transition: 'all 0.3s ease'
    };

    return (
        <Group
            justify="space-between"
            p="md"
            style={headerStyle}
        >
            <Title
                order={2}
                c={theme === 'light' ? 'blue.6' : 'blue.4'}
                style={{ transition: 'color 0.3s ease' }}
            >
                Big Two Game
            </Title>
            <Group gap="md">
                {showBackButton && (
                    <Button
                        onClick={handleBack}
                        variant="light"
                        color="blue"
                    >
                        Back to Home
                    </Button>
                )}
                <Badge
                    size="lg"
                    variant={theme === 'light' ? 'light' : 'filled'}
                    color="blue"
                >
                    <Text size="sm">
                        Playing as: <Text component="span" fw={700}>{username}</Text>
                    </Text>
                </Badge>
                <ThemeToggle />
            </Group>
        </Group>
    );
};

export default Header; 