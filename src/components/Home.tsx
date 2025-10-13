import React, { useState, useEffect } from "react";
import { createRoom, getRooms, RoomResponse } from "../services/api";
import { Container, Card, Group, Title, Button, ActionIcon, Table, Text, Stack, ScrollArea } from "@mantine/core";

interface HomeProps {
    onJoinRoom: (roomId: string) => void;
    username: string;
    userUuid: string;
}

const Home: React.FC<HomeProps> = ({ onJoinRoom, username: _username, userUuid }) => {
    const [rooms, setRooms] = useState<RoomResponse[]>([]);

    const fetchRooms = async () => {
        setRooms(await getRooms());
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleCreateRoom = async () => {
        const newRoom = await createRoom(userUuid);
        if (newRoom) {
            setRooms([...rooms, newRoom]);
            console.log("Rooms:", rooms);
            onJoinRoom(newRoom.id);
        };
    }

    return (
        <Container size={600} py="xl" style={{ minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ textAlign: 'center', width: '100%' }}>
                <Card shadow="md" padding="xl" radius="md" style={{ display: 'inline-block', textAlign: 'left', width: '100%', maxWidth: 560 }}>
                    <Stack gap="lg">
                        <Group justify="space-between" align="center">
                            <Title order={2}>Available Rooms</Title>
                            <ActionIcon
                                onClick={fetchRooms}
                                variant="light"
                                size="lg"
                                title="Refresh rooms"
                                style={{ '&:hover': { transform: 'rotate(180deg)', transition: 'transform 0.2s' } }}
                            >
                                ↻
                            </ActionIcon>
                        </Group>

                        <Button
                            onClick={handleCreateRoom}
                            color="green"
                            size="md"
                            fullWidth
                        >
                            Create Room
                        </Button>

                        <ScrollArea h={400}>
                            {rooms.length === 0 ? (
                                <Text ta="center" c="dimmed" py="xl" fs="italic">
                                    No available rooms. Create one!
                                </Text>
                            ) : (
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Room ID</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                            <Table.Th>Players</Table.Th>
                                            <Table.Th>Action</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {rooms.map((room) => (
                                            <Table.Tr key={room.id}>
                                                <Table.Td>{room.id}</Table.Td>
                                                <Table.Td>
                                                    <Text c={room.status === 'waiting' ? 'green' : 'orange'}>
                                                        {room.status}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td>{room.player_count}/4</Table.Td>
                                                <Table.Td>
                                                    <Button
                                                        onClick={() => onJoinRoom(room.id)}
                                                        size="sm"
                                                        variant="light"
                                                    >
                                                        Join
                                                    </Button>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            )}
                        </ScrollArea>
                    </Stack>
                </Card>
            </div>
        </Container>
    );
};

export default Home;