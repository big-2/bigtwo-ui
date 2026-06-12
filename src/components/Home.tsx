import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createRoom, getCurrentRoom, getRooms, leaveRoom, RoomResponse } from "../services/api";
import { BarChart3, LogOut, RefreshCw, RotateCw } from "lucide-react";
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

type RoomListItem = RoomResponse & {
    isCurrentRoom?: boolean;
    isDisconnected?: boolean;
};

const Home: React.FC<HomeProps> = ({ onJoinRoom, userUuid }) => {
    const [rooms, setRooms] = useState<RoomListItem[]>([]);
    const [isLeavingRoom, setIsLeavingRoom] = useState(false);
    const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);

    const fetchRooms = async () => {
        const [availableRooms, currentRoom] = await Promise.all([
            getRooms(),
            getCurrentRoom(),
        ]);

        if (!currentRoom) {
            setRooms(availableRooms);
            return;
        }

        const canShowCurrentRoom = currentRoom.has_active_game || currentRoom.room.player_count < 4;
        if (!canShowCurrentRoom) {
            setRooms(availableRooms);
            return;
        }

        const currentRoomRow: RoomListItem = {
            ...currentRoom.room,
            isCurrentRoom: true,
            isDisconnected: !currentRoom.is_connected,
        };
        const otherRooms = availableRooms.filter((room) => room.id !== currentRoom.room.id);
        setRooms([currentRoomRow, ...otherRooms]);
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

    const handleLeaveCurrentRoom = async (roomId: string) => {
        setIsLeavingRoom(true);
        const didLeave = await leaveRoom(roomId);
        setIsLeavingRoom(false);

        if (didLeave) {
            await fetchRooms();
        }
    };

    const handleJoinClick = (roomId: string) => {
        if (pendingRoomId) {
            return;
        }

        setPendingRoomId(roomId);
        onJoinRoom(roomId);
    };

    const getRoomRowClassName = (room: RoomListItem) => cn(
        room.isCurrentRoom && "border-l-4 border-l-sky-500 bg-sky-500/10 dark:bg-sky-400/10",
        room.isDisconnected && "border-l-amber-500 bg-amber-500/15 dark:bg-amber-400/15"
    );

    const getRoomStatusBadge = (room: RoomListItem) => {
        if (room.isDisconnected) {
            return (
                <Badge className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950">
                    Disconnected
                </Badge>
            );
        }

        if (room.isCurrentRoom) {
            return (
                <Badge className="bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-sky-950">
                    Your room
                </Badge>
            );
        }

        return (
            <Badge
                variant={room.status === 'waiting' ? 'default' : 'secondary'}
                className={cn(
                    room.status === 'waiting' && "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                )}
            >
                {room.status}
            </Badge>
        );
    };

    const renderRoomActions = (room: RoomListItem) => {
        if (!room.isCurrentRoom) {
            return (
                <Button
                    onClick={() => handleJoinClick(room.id)}
                    size="sm"
                    variant="secondary"
                    disabled={pendingRoomId === room.id}
                    className="flex-shrink-0"
                >
                    Join
                </Button>
            );
        }

        return (
            <div className="flex flex-wrap justify-end gap-2">
                <Button
                    onClick={() => handleJoinClick(room.id)}
                    size="sm"
                    variant="default"
                    disabled={pendingRoomId === room.id}
                    className="flex-shrink-0"
                >
                    <RotateCw className="h-4 w-4" />
                    Rejoin
                </Button>
                <Button
                    onClick={() => handleLeaveCurrentRoom(room.id)}
                    size="sm"
                    variant="outline"
                    disabled={isLeavingRoom}
                    className="flex-shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                    <LogOut className="h-4 w-4" />
                    Leave
                </Button>
            </div>
        );
    };

    return (
        <>
            <SeoHead
                title="Big Two Online | Play With Friends, Bots, Stats And Match History | big2.app"
                description="Play Big Two online in a clean browser app. Create private games with friends, practice against bots, and track stats and recent match history."
                canonicalPath="/"
            />
            <div className="flex min-h-[calc(100vh-60px)] items-start justify-center px-2 py-4 sm:px-4 sm:py-8">
                <div className="flex w-full max-w-7xl flex-col gap-3 sm:gap-4">
                {/* Hero Section - SEO optimized with H1, visible on all devices */}
                <section className="text-center px-2" aria-label="Welcome">
                    <h1 className="text-xl font-bold mb-1 sm:text-2xl lg:text-3xl">Big Two Online With Friends, Bots, Stats And Match History</h1>
                    <p className="text-xs text-muted-foreground sm:text-sm">Play Big 2 in a clean browser app. Start private games with friends, practice against bots, and track your recent results.</p>
                    <div className="mt-3 flex justify-center">
                        <Button asChild variant="outline" size="sm">
                            <Link to="/me/stats">
                                <BarChart3 className="h-4 w-4" />
                                View My Stats
                            </Link>
                        </Button>
                    </div>
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
                                                    className={cn(
                                                        "flex items-center justify-between gap-2 rounded-lg border bg-card p-3",
                                                        getRoomRowClassName(room)
                                                    )}
                                                >
                                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                        <span className="font-medium text-sm truncate max-w-[140px]">{room.id}</span>
                                                        <div className="flex items-center gap-2">
                                                            {getRoomStatusBadge(room)}
                                                            <span className="text-xs text-muted-foreground">{room.player_count}/4</span>
                                                        </div>
                                                    </div>
                                                    {renderRoomActions(room)}
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
                                                    <TableRow key={room.id} className={getRoomRowClassName(room)}>
                                                        <TableCell className="font-medium">{room.id}</TableCell>
                                                        <TableCell>{getRoomStatusBadge(room)}</TableCell>
                                                        <TableCell>{room.player_count}/4</TableCell>
                                                        <TableCell>{renderRoomActions(room)}</TableCell>
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
                                <p className="text-sm text-muted-foreground">Learn the rules, improve your decisions, and then jump into a tracked match.</p>
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
                            <CardContent className="space-y-3 p-4 sm:p-6">
                                <h2 className="text-lg font-bold sm:text-xl">Big Two Around The World</h2>
                                <p className="text-sm text-muted-foreground">
                                    Big Two is also known by several regional names. If you searched for one of these, you are in the right place.
                                </p>
                                <ul className="list-disc space-y-1 pl-5 text-sm">
                                    <li><Link className="underline text-primary" to="/pusoy-dos">Pusoy Dos online</Link></li>
                                    <li><Link className="underline text-primary" to="/dai-di">Dai Di online</Link></li>
                                    <li><Link className="underline text-primary" to="/choh-dai-di">Choh Dai Di online</Link></li>
                                    <li><Link className="underline text-primary" to="/capsa-banting">Capsa Banting online</Link></li>
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
                                    If you are learning Big 2 strategy, this is a practical way to improve fast. Join a room, invite friends, or test your skill against the AI and then review your stats and recent completed matches.
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
