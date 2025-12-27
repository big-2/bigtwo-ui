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
            <CardHeader className="flex flex-col gap-2 p-3 sm:p-6 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <CardTitle className="text-base sm:text-lg">Players</CardTitle>
                    <Badge variant="secondary" className="text-xs">{players.length}/{MAX_PLAYERS}</Badge>
                    {gamesPlayed > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Trophy className="h-3 w-3" />
                            {gamesPlayed}
                        </Badge>
                    )}
                </div>
                {isHost && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <div className="hidden sm:flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                                {botUuids.size} bot{botUuids.size === 1 ? "" : "s"}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <select
                                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
                                className="min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm"
                                size="sm"
                                aria-label="Add bot to room"
                            >
                                Add Bot
                            </Button>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="grid gap-1.5 p-3 pt-0 sm:p-6 sm:pt-0">
                {slots.map((uuid, index) => {
                    if (!uuid) {
                        return (
                            <div
                                key={`empty-${index}`}
                                className="flex flex-row items-center rounded-lg border border-dashed border-slate-200 bg-muted/40 px-2 py-1.5 gap-2 h-10 sm:px-3 sm:h-12"
                            >
                                {/* Player name section - flexible width */}
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"></div>
                                </div>
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
                                "flex flex-row items-center rounded-lg border border-slate-200 bg-card px-2 py-1.5 gap-1.5 h-10 sm:px-3 sm:gap-2 sm:h-12",
                                isCurrentUser && "border-primary/60 bg-primary/5"
                            )}
                        >
                            {/* Player name section - flexible width */}
                            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 flex items-center justify-center">
                                    {isBot ? (
                                        <Bot aria-hidden className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
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
                                <span className="text-xs sm:text-sm font-medium text-foreground truncate">{displayName}</span>
                            </div>

                            {/* Stats section - visible on all screen sizes */}
                            {gamesPlayed > 0 && (
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs flex-shrink-0">
                                    {/* Wins */}
                                    <div className="flex items-center gap-0.5 sm:gap-1">
                                        <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500 flex-shrink-0" />
                                        <span className="font-semibold font-mono tabular-nums">
                                            {stats?.wins ?? 0}
                                        </span>
                                    </div>

                                    {/* Score */}
                                    <div className="flex items-center gap-0.5 sm:gap-1">
                                        <BarChart3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-500 flex-shrink-0" />
                                        <span className={cn(
                                            'font-mono tabular-nums',
                                            (stats?.total_score ?? 0) <= 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                                        )}>
                                            {stats?.total_score ?? 0}
                                        </span>
                                    </div>

                                    {/* Win streak */}
                                    {showWinStreak && (
                                        <div className="flex items-center gap-0.5 sm:gap-1">
                                            <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-500 flex-shrink-0" />
                                            <span className="font-semibold font-mono text-orange-600 dark:text-orange-400 tabular-nums">
                                                {stats.current_win_streak}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Badges section */}
                            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                                {isHostPlayer && <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2 py-0">Host</Badge>}
                                {isCurrentUser && <Badge className="text-[10px] sm:text-xs px-1 sm:px-2 py-0">You</Badge>}
                                {isBot && <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2 py-0">Bot</Badge>}
                            </div>

                            {/* Ready section */}
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                {isCurrentUser && !isBot ? (
                                    <Button
                                        variant={isReady ? "outline" : "default"}
                                        size="sm"
                                        onClick={onToggleReady}
                                        aria-label={isReady ? "Mark as not ready" : "Mark as ready"}
                                        className={cn(
                                            "min-w-[60px] sm:min-w-[80px] h-7 sm:h-8 text-[10px] sm:text-xs",
                                            isReady && "border-green-600 text-green-600 hover:bg-green-600/10 dark:hover:bg-green-600/20 hover:text-green-700 dark:hover:text-green-500"
                                        )}
                                    >
                                        {isReady ? "✓ Ready" : "Ready"}
                                    </Button>
                                ) : !isBot ? (
                                    <Badge
                                        variant={isReady ? "default" : "outline"}
                                        className={cn(
                                            "min-w-[50px] sm:min-w-[70px] justify-center text-[10px] sm:text-xs py-0.5",
                                            isReady ? "bg-green-600 hover:bg-green-600" : "text-muted-foreground"
                                        )}
                                    >
                                        {isReady ? "Ready" : "Not Ready"}
                                    </Badge>
                                ) : null}

                                {isHost && !isCurrentUser && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemovePlayer(uuid, isBot)}
                                        aria-label={isBot ? `Remove bot ${displayName}` : `Remove player ${displayName}`}
                                        className="w-6 h-6 sm:w-8 sm:h-8 p-0"
                                    >
                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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