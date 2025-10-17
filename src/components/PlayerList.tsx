import React from "react";
import { IconRobot, IconTrash } from "@tabler/icons-react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

type BotDifficulty = "easy" | "medium" | "hard";
const MAX_PLAYERS = 4;

interface PlayerListProps {
    players: string[];
    mapping: Record<string, string>;
    botUuids: Set<string>;
    currentUserUuid?: string;
    currentUsername: string;
    hostUuid?: string;
    isHost: boolean;
    addingBot: boolean;
    botDifficulty: BotDifficulty;
    canAddBot: boolean;
    onBotDifficultyChange: (difficulty: BotDifficulty) => void;
    onAddBot: () => void;
    onRemoveBot: (botUuid: string) => void;
    onKickPlayer: (playerUuid: string) => void;
}

const PlayerList: React.FC<PlayerListProps> = ({
    players,
    mapping,
    botUuids,
    currentUserUuid,
    currentUsername,
    hostUuid,
    isHost,
    addingBot,
    botDifficulty,
    canAddBot,
    onBotDifficultyChange,
    onAddBot,
    onRemoveBot,
    onKickPlayer,
}) => {
    const getDisplayName = (uuid: string) => {
        if (mapping[uuid]) {
            return mapping[uuid];
        }

        if (uuid === currentUserUuid && currentUsername) {
            return currentUsername;
        }

        return uuid;
    };

    const handleDifficultyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onBotDifficultyChange(event.target.value as BotDifficulty);
    };

    const handleRemovePlayer = (uuid: string, isBot: boolean) => {
        if (isBot) {
            onRemoveBot(uuid);
            return;
        }

        onKickPlayer(uuid);
    };

    const slots = React.useMemo(() => (
        Array.from({ length: MAX_PLAYERS }, (_, index) => players[index] ?? null)
    ), [players]);

    return (
        <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <CardTitle>Players</CardTitle>
                    <Badge variant="secondary">{players.length}/{MAX_PLAYERS}</Badge>
                </div>
                {isHost && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <IconRobot size={16} />
                                {botUuids.size} bot{botUuids.size === 1 ? "" : "s"}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                value={botDifficulty}
                                onChange={handleDifficultyChange}
                                disabled={addingBot || !canAddBot}
                                aria-label="Select bot difficulty"
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                            <Button
                                onClick={onAddBot}
                                disabled={addingBot || !canAddBot}
                                className="min-w-[120px]"
                                aria-label="Add bot to room"
                            >
                                Add Bot
                            </Button>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="grid gap-2">
                {slots.map((uuid, index) => {
                    if (!uuid) {
                        return (
                            <div
                                key={`empty-${index}`}
                                className="flex h-12 items-center justify-between rounded-lg border border-dashed border-slate-200 bg-muted/40 px-3 py-2"
                            >
                                <span className="text-sm font-medium text-muted-foreground"></span>
                            </div>
                        );
                    }

                    const displayName = getDisplayName(uuid);
                    const isBot = botUuids.has(uuid);
                    const isCurrentUser = uuid === currentUserUuid || displayName === currentUsername;
                    const isHostPlayer = uuid === hostUuid;

                    return (
                        <div
                            key={uuid}
                            className={cn(
                                "flex h-12 items-center justify-between rounded-lg border border-slate-200 bg-card px-3 py-2",
                                isCurrentUser && "border-primary/60 bg-primary/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {isBot && <IconRobot aria-hidden className="h-4 w-4 text-muted-foreground" />}
                                <span className="text-sm font-medium text-foreground">{displayName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {isHostPlayer && <Badge variant="secondary">Host</Badge>}
                                {isCurrentUser && <Badge>You</Badge>}
                                {isBot && <Badge variant="outline">Bot</Badge>}
                                {isHost && !isCurrentUser && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemovePlayer(uuid, isBot)}
                                        aria-label={isBot ? `Remove bot ${displayName}` : `Remove player ${displayName}`}
                                    >
                                        <IconTrash className="h-4 w-4" />
                                        <span className="sr-only">Remove</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};

export default PlayerList;