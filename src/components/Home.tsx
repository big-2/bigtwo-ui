import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createRoom, getRooms, RoomResponse } from "../services/api";
import { RefreshCw } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { cn } from "../lib/utils";
import AboutBigTwo from "./AboutBigTwo";
import SeoHead from "./SeoHead";

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
        <>
            <SeoHead
                title="Big Two Online - Free Multiplayer Card Game | big2.app"
                description="Play Big Two online for free with friends or challenge an AI agent trained with self-play and reinforcement learning. Start a real-time 4-player game instantly."
                canonicalPath="/"
            />
            <div className="flex min-h-[calc(100vh-60px)] items-start justify-center px-2 py-4 sm:px-4 sm:py-8">
                <div className="flex w-full max-w-7xl flex-col gap-3 sm:gap-4">
                {/* Hero Section - SEO optimized with H1, visible on all devices */}
                <section className="text-center px-2" aria-label="Welcome">
                    <h1 className="text-xl font-bold mb-1 sm:text-2xl lg:text-3xl">Big Two - Free Online Multiplayer Card Game</h1>
                    <p className="text-xs text-muted-foreground sm:text-sm">Play Big 2 with friends in real-time. Free for 4 players, no download required.</p>
                </section>

                    <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row">
                        {/* Room List Section */}
                        <section className="flex-1">
                            <Card>
                                <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-6 lg:space-y-6 lg:p-8">
                            <header className="flex flex-row items-center justify-between gap-2">
                                <h2 className="text-lg font-bold sm:text-xl lg:text-2xl">Available Rooms</h2>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={handleCreateRoom}
                                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-xs sm:text-sm"
                                        size="sm"
                                    >
                                        <span className="hidden sm:inline">Create Room</span>
                                        <span className="sm:hidden">Create</span>
                                    </Button>
                                    <Button
                                        onClick={fetchRooms}
                                        variant="outline"
                                        size="icon"
                                        title="Refresh rooms"
                                        className="transition-transform hover:rotate-180 h-8 w-8 sm:h-9 sm:w-9"
                                    >
                                        <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                </div>
                            </header>

                            <ScrollArea className="h-80 sm:h-96 rounded-md border">
                                {rooms.length === 0 ? (
                                    <p className="py-12 text-center italic text-muted-foreground">
                                        No available rooms. Create one!
                                    </p>
                                ) : (
                                    <>
                                        {/* Mobile: Card layout */}
                                        <div className="flex flex-col gap-2 p-2 sm:hidden">
                                            {rooms.map((room) => (
                                                <div
                                                    key={room.id}
                                                    className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3"
                                                >
                                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                        <span className="font-medium text-sm truncate max-w-[140px]">{room.id}</span>
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant={room.status === 'waiting' ? 'default' : 'secondary'}
                                                                className={cn(
                                                                    "text-xs px-1.5 py-0",
                                                                    room.status === 'waiting' && "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                                                                )}
                                                            >
                                                                {room.status}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">{room.player_count}/4</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => onJoinRoom(room.id)}
                                                        size="sm"
                                                        variant="secondary"
                                                        className="flex-shrink-0"
                                                    >
                                                        Join
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Desktop: Table layout */}
                                        <Table className="hidden sm:table">
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
                                    </>
                                )}
                            </ScrollArea>
                                </CardContent>
                            </Card>
                        </section>

                        {/* About Big Two Section */}
                        <aside className="hidden sm:block lg:w-96">
                            <AboutBigTwo />
                        </aside>
                    </div>

                    <section className="w-full">
                        <Card>
                            <CardContent className="space-y-3 p-4 sm:p-6">
                                <h2 className="text-lg font-bold sm:text-xl">Big Two Guides</h2>
                                <p className="text-sm text-muted-foreground">Learn rules and strategy, then jump into a match.</p>
                                <ul className="list-disc space-y-1 pl-5 text-sm">
                                    <li><Link className="underline text-primary" to="/how-to-play">How to Play Big Two</Link></li>
                                    <li><Link className="underline text-primary" to="/rules">Big Two Rules and Rankings</Link></li>
                                    <li><Link className="underline text-primary" to="/strategy">Big Two Strategy Tips</Link></li>
                                    <li><Link className="underline text-primary" to="/faq">Big Two FAQ</Link></li>
                                </ul>
                            </CardContent>
                        </Card>
                    </section>

                    <section className="w-full">
                        <Card>
                            <CardContent className="space-y-4 p-4 sm:p-6">
                                <h2 className="text-lg font-bold sm:text-xl">Play Big Two Against A Trained AI Agent</h2>
                                <p className="text-sm text-muted-foreground">
                                    Want a tougher challenge? You can play Big Two online against our AI bot, built with self-play and reinforcement learning.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    In simple terms: the AI practices by playing thousands of Big Two games against versions of itself, then learns which moves help it win more often.
                                    Over time, it gets better at timing, hand control, and endgame decisions.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    If you are learning Big 2 strategy, this is a great way to improve fast. Join a room, invite friends, or test your skill against the AI and see how your decisions compare.
                                </p>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </>
    );
};

export default Home;
