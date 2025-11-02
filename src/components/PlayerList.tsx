import React from "react";
import { Bot, Trash2, Trophy, BarChart3, Flame } from "lucide-react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";
import { PlayerStats } from "../types.stats";

type BotDifficulty = "easy" | "medium" | "hard";
const MAX_PLAYERS = 4;
const MIN_WIN_STREAK_DISPLAY = 2;

interface PlayerListProps {
    players: string[];
    mapping: Record<string, string>;
    botUuids: Set<string>;
    readyPlayers: Set<string>;
    connectedPlayers: Set<string>;
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
    connectedPlayers,
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
            <CardHeader className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <CardContent className="grid gap-1.5">
                {slots.map((uuid, index) => {
                    if (!uuid) {
                        return (
                            <div
                                key={`empty-${index}`}
                                className="flex flex-col sm:flex-row sm:items-center rounded-lg border border-dashed border-slate-200 bg-muted/40 px-3 py-1.5 gap-2 sm:h-12"
                            >
                                {/* Player name section - flexible width */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-4 h-4 flex-shrink-0"></div>
                                </div>

                                {/* Stats section - fixed width for alignment */}
                                {gamesPlayed > 0 && (
                                    <div className="flex items-center gap-2 text-xs flex-shrink-0 sm:w-[8.5rem] opacity-0 pointer-events-none">
                                        <div className="flex items-center gap-1 w-[2.5rem] justify-end">
                                            <span className="w-4"></span>
                                        </div>
                                        <div className="flex items-center gap-1 w-[3rem] justify-end">
                                            <span className="w-6"></span>
                                        </div>
                                        <div className="flex items-center gap-1 w-[2.5rem] justify-end">
                                            <span className="w-4"></span>
                                        </div>
                                    </div>
                                )}

                                {/* Badges section - fixed width for alignment */}
                                <div className="flex items-center gap-1 flex-shrink-0 sm:w-[9rem] justify-start"></div>

                                {/* Ready section - fixed width for alignment */}
                                <div className="flex items-center gap-2 flex-shrink-0 justify-end sm:w-[9rem]"></div>
                            </div>
                        );
                    }

                    const displayName = getDisplayName(uuid);
                    const isBot = botUuids.has(uuid);
                    const isCurrentUser = uuid === currentUserUuid || displayName === currentUsername;
                    const isHostPlayer = uuid === hostUuid;
                    const isReady = readyPlayers.has(uuid);
                    const stats = playerStats?.[uuid];
                    const showWinStreak = stats && stats.current_win_streak >= MIN_WIN_STREAK_DISPLAY;

                    return (
                        <div
                            key={uuid}
                            className={cn(
                                "flex flex-col sm:flex-row sm:items-center rounded-lg border border-slate-200 bg-card px-3 py-1.5 gap-2 sm:h-12",
                                isCurrentUser && "border-primary/60 bg-primary/5"
                            )}
                        >
                            {/* Player name section - flexible width */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                    {isBot ? (
                                        <Bot aria-hidden className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <span
                                            aria-label={connectedPlayers.has(uuid) ? "Connected" : "Disconnected"}
                                            role="status"
                                            className={cn(
                                                "block h-2 w-2 rounded-full",
                                                connectedPlayers.has(uuid) ? "bg-green-500" : "bg-red-500"
                                            )}
                                        />
                                    )}
                                </div>
                                <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                            </div>

                            {/* Stats section - fixed width for alignment */}
                            {gamesPlayed > 0 && (
                                <div className="flex items-center gap-2 text-xs flex-shrink-0 sm:w-[8.5rem]">
                                    {/* Wins - fixed width */}
                                    <div className="flex items-center gap-1 w-[2.5rem] justify-end">
                                        <Trophy className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                                        <span className="font-semibold font-mono w-4 text-right tabular-nums">
                                            {stats?.wins ?? 0}
                                        </span>
                                    </div>

                                    {/* Score - fixed width */}
                                    <div className="flex items-center gap-1 w-[3rem] justify-end">
                                        <BarChart3 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                        <span className={cn(
                                            'font-mono w-6 text-right tabular-nums',
                                            (stats?.total_score ?? 0) <= 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                                        )}>
                                            {stats?.total_score ?? 0}
                                        </span>
                                    </div>

                                    {/* Win streak - fixed width placeholder */}
                                    <div className="flex items-center gap-1 w-[2.5rem] justify-end">
                                        {showWinStreak && (
                                            <>
                                                <Flame className="h-3 w-3 text-orange-500 flex-shrink-0" />
                                                <span className="font-semibold font-mono text-orange-600 dark:text-orange-400 w-4 text-right tabular-nums">
                                                    {stats.current_win_streak}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Badges section - fixed width for alignment */}
                            <div className="flex items-center gap-1 flex-shrink-0 sm:w-[9rem] justify-start">
                                {isHostPlayer && <Badge variant="secondary" className="text-xs px-2">Host</Badge>}
                                {isCurrentUser && <Badge className="text-xs px-2">You</Badge>}
                                {isBot && <Badge variant="outline" className="text-xs px-2">Bot</Badge>}
                            </div>

                            {/* Ready section - fixed width for alignment */}
                            <div className="flex items-center gap-2 flex-shrink-0 justify-end sm:w-[9rem]">
                                {isCurrentUser && !isBot ? (
                                    <Button
                                        variant={isReady ? "outline" : "default"}
                                        size="sm"
                                        onClick={onToggleReady}
                                        aria-label={isReady ? "Mark as not ready" : "Mark as ready"}
                                        className={cn(
                                            "min-w-[72px] sm:min-w-[80px]",
                                            isReady && "border-green-600 text-green-600 hover:bg-green-600/10 dark:hover:bg-green-600/20 hover:text-green-700 dark:hover:text-green-500"
                                        )}
                                    >
                                        {isReady ? "✓ Ready" : "Ready Up"}
                                    </Button>
                                ) : !isBot ? (
                                    <Badge
                                        variant={isReady ? "default" : "outline"}
                                        className={cn(
                                            "min-w-[72px] sm:min-w-[80px] justify-center",
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
                                        className="w-8 h-8 p-0"
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