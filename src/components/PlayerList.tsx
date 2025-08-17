import React, { useEffect } from "react";
import { Paper, Title, List, Text, Badge, Group } from "@mantine/core";

interface PlayerListProps {
    players: string[]; // UUIDs
    currentPlayer: string; // display name of current user
    host?: string; // display name of host
    mapping?: Record<string, string>; // uuid -> name
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayer, host, mapping = {} }) => {
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
                {players.map((uuid) => {
                    const displayName = mapping[uuid] || uuid;
                    return (
                        <List.Item key={uuid}>
                            <Group justify="space-between" wrap="wrap" gap="xs">
                                <Text
                                    fw={displayName === currentPlayer ? 700 : 400}
                                    c={displayName === currentPlayer ? "green" : undefined}
                                    style={{ flexGrow: 1 }}
                                >
                                    {displayName}
                                </Text>
                                <Group gap="xs">
                                    {displayName === currentPlayer && (
                                        <Badge color="green" size="xs">You</Badge>
                                    )}
                                    {displayName === host && (
                                        <Badge color="blue" size="xs">Host</Badge>
                                    )}
                                </Group>
                            </Group>
                        </List.Item>
                    );
                })}
            </List>
            <Text ta="center" mt="md" size="sm" c="dimmed">
                {players.length}/4 Players
            </Text>
        </Paper>
    );
};

export default PlayerList; 