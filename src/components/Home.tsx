import React, { useState, useEffect } from "react";
import { createRoom, getRooms, RoomResponse } from "../services/api";
import { RefreshCw } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { cn } from "../lib/utils";

interface HomeProps {
    onJoinRoom: (roomId: string) => void;
    userUuid: string;
}

const Home: React.FC<HomeProps> = ({ onJoinRoom, userUuid }) => {
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
        <div className="flex min-h-[calc(100vh-60px)] items-start justify-center px-4 py-8">
            <Card className="w-full max-w-[600px]">
                <CardContent className="space-y-6 p-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Available Rooms</h2>
                        <Button
                            onClick={fetchRooms}
                            variant="outline"
                            size="icon"
                            title="Refresh rooms"
                            className="transition-transform hover:rotate-180"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    </div>

                    <Button
                        onClick={handleCreateRoom}
                        className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                        size="lg"
                    >
                        Create Room
                    </Button>

                    <ScrollArea className="h-[400px] rounded-md border">
                        {rooms.length === 0 ? (
                            <p className="py-12 text-center italic text-muted-foreground">
                                No available rooms. Create one!
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Room ID</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Players</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rooms.map((room) => (
                                        <TableRow key={room.id}>
                                            <TableCell className="font-medium">{room.id}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={room.status === 'waiting' ? 'default' : 'secondary'}
                                                    className={cn(
                                                        room.status === 'waiting' && "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                                                    )}
                                                >
                                                    {room.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{room.player_count}/4</TableCell>
                                            <TableCell>
                                                <Button
                                                    onClick={() => onJoinRoom(room.id)}
                                                    size="sm"
                                                    variant="secondary"
                                                >
                                                    Join
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default Home;