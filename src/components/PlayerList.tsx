import React, { useEffect } from "react";
import { Paper, Title, List, Text, Badge, Group } from "@mantine/core";

interface PlayerListProps {
    players: string[];
    currentPlayer: string;
    host?: string;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayer, host }) => {
    console.log("Players", players, "Current Player", currentPlayer, "Host", host);
    useEffect(() => {
        // Check if player names match the current player
        players.forEach(player => {
            console.log(`Comparing: '${player}' === '${currentPlayer}' -> ${player === currentPlayer}`);
        });
    }, [players, currentPlayer]);
    return (
        <Paper shadow="sm" p="md" radius="md" style={{ width: 250, margin: 10 }}>
            <Title order={4} ta="center" mb="md" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                Players in Game
            </Title>
            <List spacing="xs" size="sm">
                {players.map((player) => (
                    <List.Item key={player}>
                        <Group justify="space-between" wrap="wrap" gap="xs">
                            <Text 
                                fw={player === currentPlayer ? 700 : 400}
                                c={player === currentPlayer ? "green" : undefined}
                                style={{ flexGrow: 1 }}
                            >
                                {player}
                            </Text>
                            <Group gap="xs">
                                {player === currentPlayer && (
                                    <Badge color="green" size="xs">You</Badge>
                                )}
                                {player === host && (
                                    <Badge color="blue" size="xs">Host</Badge>
                                )}
                            </Group>
                        </Group>
                    </List.Item>
                ))}
            </List>
            <Text ta="center" mt="md" size="sm" c="dimmed">
                {players.length}/4 Players
            </Text>
        </Paper>
    );
};

export default PlayerList; 