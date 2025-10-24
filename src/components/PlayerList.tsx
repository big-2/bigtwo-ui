import React from "react";
import { Bot, Trash2, Trophy, TrendingDown, Flame } from "lucide-react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";
import { PlayerStats } from "../types.stats";

type BotDifficulty = "easy" | "medium" | "hard";
const MAX_PLAYERS = 4;

interface PlayerListProps {
    players: string[];
    mapping: Record<string, string>;
    botUuids: Set<string>;
    readyPlayers: Set<string>;
    currentUserUuid?: string;
    currentUsername: string;
    hostUuid?: string;
    isHost: boolean;
    addingBot: boolean;
    botDifficulty: BotDifficulty;
    canAddBot: boolean;
    playerStats?: Record<string, PlayerStats>;
    gamesPlayed?: number;
    onBotDifficultyChange: (difficulty: BotDifficulty) => void;
    onAddBot: () => void;
    onRemoveBot: (botUuid: string) => void;
    onKickPlayer: (playerUuid: string) => void;
    onToggleReady: () => void;
}

const PlayerList: React.FC<PlayerListProps> = ({
    players,
    mapping,
    botUuids,
    readyPlayers,
    currentUserUuid,
    currentUsername,
    hostUuid,
    isHost,
    addingBot,
    botDifficulty,
    canAddBot,
    playerStats,
    gamesPlayed = 0,
    onBotDifficultyChange,
    onAddBot,
    onRemoveBot,
    onKickPlayer,
    onToggleReady,
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
                <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle>Players</CardTitle>
                    <Badge variant="secondary">{players.length}/{MAX_PLAYERS}</Badge>
                    {gamesPlayed > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {gamesPlayed} game{gamesPlayed === 1 ? '' : 's'}
                        </Badge>
                    )}
                </div>
                {isHost && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <Bot className="h-4 w-4" />
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
                    const isReady = readyPlayers.has(uuid);
                    const stats = playerStats?.[uuid];
                    const showWinStreak = stats && stats.current_win_streak >= 2;

                    return (
                        <div
                            key={uuid}
                            className={cn(
                                "flex items-center rounded-lg border border-slate-200 bg-card px-3 py-2 gap-2 min-h-12",
                                isCurrentUser && "border-primary/60 bg-primary/5"
                            )}
                        >
                            {/* Player name - flexible width */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                {isBot && <Bot aria-hidden className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                                <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                            </div>

                            {/* Stats section - fixed width for alignment */}
                            {gamesPlayed > 0 && (
                                <div className="flex items-center gap-2 text-xs flex-shrink-0">
                                    {/* Wins - fixed width */}
                                    <div className="flex items-center gap-1 w-9 justify-end">
                                        <Trophy className="h-3 w-3 text-yellow-500" />
                                        <span className="font-semibold w-3 text-right">
                                            {stats?.wins ?? 0}
                                        </span>
                                    </div>

                                    {/* Score - fixed width */}
                                    <div className="flex items-center gap-1 w-11 justify-end">
                                        <TrendingDown className="h-3 w-3 text-muted-foreground" />
                                        <span className={cn(
                                            'font-mono w-6 text-right',
                                            (stats?.total_score ?? 0) <= 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                                        )}>
                                            {stats?.total_score ?? 0}
                                        </span>
                                    </div>

                                    {/* Win streak - fixed width placeholder */}
                                    <div className="flex items-center gap-1 w-8 justify-end">
                                        {showWinStreak && (
                                            <>
                                                <Flame className="h-3 w-3 text-orange-500" />
                                                <span className="font-semibold text-orange-600 dark:text-orange-400 w-3 text-right">
                                                    {stats.current_win_streak}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Status badges section - fixed width */}
                            <div className="flex items-center gap-2 flex-shrink-0" style={{ width: '160px', justifyContent: 'flex-end' }}>
                                {isHostPlayer && <Badge variant="secondary" className="w-14 justify-center">Host</Badge>}
                                {isCurrentUser && <Badge className="w-14 justify-center">You</Badge>}
                                {isBot && <Badge variant="outline" className="w-14 justify-center">Bot</Badge>}
                            </div>

                            {/* Ready section - fixed width */}
                            <div className="flex items-center gap-2 flex-shrink-0" style={{ width: '140px', justifyContent: 'flex-end' }}>
                                {isCurrentUser && !isBot ? (
                                    <Button
                                        variant={isReady ? "outline" : "default"}
                                        size="sm"
                                        onClick={onToggleReady}
                                        aria-label={isReady ? "Mark as not ready" : "Mark as ready"}
                                        className={cn(
                                            "w-[100px]",
                                            isReady && "border-green-600 text-green-600 hover:bg-green-600/10 dark:hover:bg-green-600/20 hover:text-green-700 dark:hover:text-green-500"
                                        )}
                                    >
                                        {isReady ? "✓ Ready" : "Ready Up"}
                                    </Button>
                                ) : !isBot ? (
                                    <Badge
                                        variant={isReady ? "default" : "outline"}
                                        className={cn(
                                            "w-[100px] justify-center",
                                            isReady ? "bg-green-600 hover:bg-green-600" : "text-muted-foreground"
                                        )}
                                    >
                                        {isReady ? "✓ Ready" : "Not Ready"}
                                    </Badge>
                                ) : null}

                                {isHost && !isCurrentUser && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemovePlayer(uuid, isBot)}
                                        aria-label={isBot ? `Remove bot ${displayName}` : `Remove player ${displayName}`}
                                        className="w-10 p-0"
                                    >
                                        <Trash2 className="h-4 w-4" />
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