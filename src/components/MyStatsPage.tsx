import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bot, RefreshCcw, TrendingUp } from "lucide-react";

import {
    getCompletedGame,
    getMyProfileStats,
    getMyRecentGames,
} from "../services/api";
import {
    CompletedGameDetailPlayer,
    CompletedGameDetailResponse,
    GameOpponentSummary,
    PlayerProfileStatsResponse,
    PlayerRecentGamesResponse,
} from "../types.profile";
import { useSessionContext } from "../contexts/SessionContext";
import SeoHead from "./SeoHead";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const MyStatsPage: React.FC = () => {
    const { userUuid } = useSessionContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const [stats, setStats] = useState<PlayerProfileStatsResponse | null>(null);
    const [recentGames, setRecentGames] = useState<PlayerRecentGamesResponse | null>(null);
    const [selectedGame, setSelectedGame] = useState<CompletedGameDetailResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailRefreshKey, setDetailRefreshKey] = useState(0);

    const selectedGameId = searchParams.get("game");
    const selectedGameSummary =
        recentGames?.games.find((game) => game.game_id === selectedGameId) ?? null;

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        setPageError(null);

        try {
            const [statsResponse, recentGamesResponse] = await Promise.all([
                getMyProfileStats(),
                getMyRecentGames(),
            ]);

            setStats(statsResponse);
            setRecentGames(recentGamesResponse);
        } catch (error) {
            console.error("Failed to load profile page:", error);
            setPageError("Unable to load your stats right now. Try again in a moment.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        if (!recentGames) {
            return;
        }

        if (recentGames.games.length === 0) {
            if (selectedGameId) {
                setSearchParams({}, { replace: true });
            }
            setSelectedGame(null);
            setDetailError(null);
            return;
        }

        if (!selectedGameId) {
            setSearchParams({ game: recentGames.games[0].game_id }, { replace: true });
            return;
        }

        const hasSelectedGame = recentGames.games.some((game) => game.game_id === selectedGameId);
        if (!hasSelectedGame) {
            setSearchParams({ game: recentGames.games[0].game_id }, { replace: true });
        }
    }, [recentGames, selectedGameId, setSearchParams]);

    useEffect(() => {
        if (!selectedGameId) {
            setSelectedGame(null);
            setDetailError(null);
            return;
        }

        let cancelled = false;

        const loadDetail = async () => {
            setIsDetailLoading(true);
            setDetailError(null);

            try {
                const game = await getCompletedGame(selectedGameId);
                if (cancelled) {
                    return;
                }

                if (!game) {
                    setSelectedGame(null);
                    setDetailError("This match detail is no longer available.");
                    return;
                }

                setSelectedGame(game);
            } catch (error) {
                if (cancelled) {
                    return;
                }
                console.error("Failed to load match detail:", error);
                setSelectedGame(null);
                setDetailError("Unable to load this match detail right now.");
            } finally {
                if (!cancelled) {
                    setIsDetailLoading(false);
                }
            }
        };

        void loadDetail();

        return () => {
            cancelled = true;
        };
    }, [selectedGameId, detailRefreshKey]);

    const handleSelectGame = (gameId: string) => {
        setSearchParams({ game: gameId });
    };

    const handleRefresh = async () => {
        await loadProfile();
        setDetailRefreshKey((key) => key + 1);
    };

    const hasHistory =
        (stats?.summary.games_played ?? 0) > 0 || (recentGames?.games.length ?? 0) > 0;

    if (isLoading && !stats && !recentGames) {
        return (
            <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4">
                <p className="text-sm text-muted-foreground">Loading your stats...</p>
            </div>
        );
    }

    return (
        <>
            <SeoHead
                title="My Big Two Stats | big2.app"
                description="Track your Big Two lifetime stats, win rate, streaks, and recent completed matches."
                canonicalPath="/me/stats"
                robots="noindex, nofollow"
            />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <TrendingUp className="h-4 w-4" />
                                <span>Personal profile</span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                My Stats
                            </h1>
                            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                                See your lifetime Big Two record, recent matches, and per-match
                                breakdowns for this anonymous profile.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" asChild>
                                <Link to="/">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back To Lobby
                                </Link>
                            </Button>
                            <Button variant="secondary" onClick={() => void handleRefresh()}>
                                <RefreshCcw className="h-4 w-4" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <StatCard
                            label="Games Played"
                            value={formatNumber(stats?.summary.games_played ?? 0)}
                            hint="Lifetime completed matches"
                        />
                        <StatCard
                            label="Wins"
                            value={formatNumber(stats?.summary.wins ?? 0)}
                            hint="Finished first"
                        />
                        <StatCard
                            label="Win Rate"
                            value={formatPercent(stats?.summary.win_rate ?? 0)}
                            hint="Across all completed matches"
                        />
                        <StatCard
                            label="Current Streak"
                            value={formatNumber(stats?.summary.current_win_streak ?? 0)}
                            hint="Consecutive wins right now"
                        />
                        <StatCard
                            label="Best Streak"
                            value={formatNumber(stats?.summary.best_win_streak ?? 0)}
                            hint="Best run so far"
                        />
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <PlayMixCard
                                passes={stats?.play_style.total_passes ?? 0}
                                singles={stats?.play_style.total_single_plays ?? 0}
                                pairs={stats?.play_style.total_pair_plays ?? 0}
                                triples={stats?.play_style.total_triple_plays ?? 0}
                                fiveCardHands={stats?.play_style.total_five_card_plays ?? 0}
                            />
                        </div>
                        <SmallSummaryCard
                            title="Recent Form"
                            description={`${formatPercent(
                                stats?.recent_form.last_10.win_rate ?? 0
                            )} over the last 10 matches`}
                            badge={`${stats?.recent_form.last_10.wins ?? 0} wins`}
                        />
                        <SmallSummaryCard
                            title="Human-Only Games"
                            description={`${formatPercent(
                                stats?.splits.human_only.win_rate ?? 0
                            )} win rate without bots`}
                            badge={`${stats?.splits.human_only.games_played ?? 0} games`}
                        />
                        <SmallSummaryCard
                            title="Games With Bots"
                            description={`${formatPercent(
                                stats?.splits.with_bots.win_rate ?? 0
                            )} win rate when bots joined`}
                            badge={`${stats?.splits.with_bots.games_played ?? 0} games`}
                        />
                    </div>
                </section>

                {pageError && (
                    <Alert variant="destructive">
                        <AlertTitle>Could not load your profile</AlertTitle>
                        <AlertDescription>{pageError}</AlertDescription>
                    </Alert>
                )}

                {!hasHistory && !pageError && (
                    <Card>
                        <CardHeader>
                            <CardTitle>No completed matches yet</CardTitle>
                            <CardDescription>
                                Your lifetime stats will show up here after you finish a game.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <Button asChild>
                                <Link to="/">Create or join a room</Link>
                            </Button>
                            <Button variant="outline" onClick={() => void handleRefresh()}>
                                Check Again
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <section>
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>Recent Match History</CardTitle>
                                <CardDescription>
                                    Your most recent completed matches across rooms.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!recentGames || recentGames.games.length === 0 ? (
                                    <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                                        No recent completed matches yet.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentGames.games.map((game) => (
                                            <button
                                                key={game.game_id}
                                                type="button"
                                                onClick={() => handleSelectGame(game.game_id)}
                                                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                                                    selectedGameId === game.game_id
                                                        ? "border-primary bg-primary/5"
                                                        : "hover:bg-accent/60"
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant={
                                                                game.winner_uuid === userUuid
                                                                    ? "default"
                                                                    : "secondary"
                                                            }
                                                        >
                                                            {game.winner_uuid === userUuid
                                                                ? "Win"
                                                                : "Loss"}
                                                        </Badge>
                                                        {game.had_bots && (
                                                            <Badge variant="outline">
                                                                <Bot className="h-3.5 w-3.5" />
                                                                Bots
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDateTime(game.completed_at)}
                                                    </span>
                                                </div>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                    <SummaryDatum
                                                        label="Score"
                                                        value={formatSignedNumber(
                                                            game.final_score
                                                        )}
                                                    />
                                                    <SummaryDatum
                                                        label="Cards Left"
                                                        value={formatNumber(
                                                            game.cards_remaining
                                                        )}
                                                    />
                                                    <SummaryDatum
                                                        label="Opponents"
                                                        value={formatOpponentList(
                                                            game.opponents,
                                                            userUuid
                                                        )}
                                                    />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    <section>
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>Match Detail</CardTitle>
                                <CardDescription>
                                    Summary for a completed game from your recent history.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedGameSummary && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                            variant={
                                                selectedGameSummary.winner_uuid === userUuid
                                                    ? "default"
                                                    : "secondary"
                                            }
                                        >
                                            {selectedGameSummary.winner_uuid === userUuid
                                                ? "You won"
                                                : "You lost"}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            {formatDateTime(selectedGameSummary.completed_at)}
                                        </span>
                                    </div>
                                )}

                                {isDetailLoading && (
                                    <div className="rounded-xl border px-4 py-10 text-center text-sm text-muted-foreground">
                                        Loading match detail...
                                    </div>
                                )}

                                {!isDetailLoading && detailError && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Could not load this match</AlertTitle>
                                        <AlertDescription>{detailError}</AlertDescription>
                                    </Alert>
                                )}

                                {!isDetailLoading && !detailError && !selectedGame && (
                                    <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                                        Select a match to inspect the result and player breakdown.
                                    </div>
                                )}

                                {!isDetailLoading && !detailError && selectedGame && (
                                    <>
                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                            <SummaryDatum
                                                label="Room"
                                                value={selectedGame.room_id}
                                            />
                                            <SummaryDatum
                                                label="Game Number"
                                                value={formatNumber(selectedGame.game_number)}
                                            />
                                            <SummaryDatum
                                                label="Winner"
                                                value={formatPlayerLabel(
                                                    selectedGame.players.find(
                                                        (player) =>
                                                            player.player_uuid ===
                                                            selectedGame.winner_uuid
                                                    )?.display_name ?? null,
                                                    selectedGame.winner_uuid,
                                                    userUuid
                                                )}
                                            />
                                            <SummaryDatum
                                                label="Duration"
                                                value={formatDuration(
                                                    selectedGame.started_at,
                                                    selectedGame.completed_at
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                Players
                                            </h3>
                                            <div className="space-y-2">
                                                {selectedGame.players.map((player) => (
                                                    <PlayerDetailRow
                                                        key={player.player_uuid}
                                                        player={player}
                                                        currentUserUuid={userUuid}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </>
    );
};

const StatCard: React.FC<{ label: string; value: string; hint: string }> = ({
    label,
    value,
    hint,
}) => (
    <Card>
        <CardContent className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
    </Card>
);

const SmallSummaryCard: React.FC<{
    title: string;
    description: string;
    badge: string;
}> = ({ title, description, badge }) => (
    <Card>
        <CardContent className="flex items-start justify-between gap-3 p-4">
            <div className="space-y-1">
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Badge variant="secondary" className="shrink-0">
                {badge}
            </Badge>
        </CardContent>
    </Card>
);

const PlayMixCard: React.FC<{
    passes: number;
    singles: number;
    pairs: number;
    triples: number;
    fiveCardHands: number;
}> = ({ passes, singles, pairs, triples, fiveCardHands }) => {
    const segments = [
        { key: "singles", label: "Singles", value: singles, barClassName: "bg-sky-500" },
        { key: "pairs", label: "Pairs", value: pairs, barClassName: "bg-emerald-500" },
        { key: "triples", label: "Triples", value: triples, barClassName: "bg-rose-500" },
        {
            key: "five",
            label: "Five-Card",
            value: fiveCardHands,
            barClassName: "bg-amber-500",
        },
        { key: "passes", label: "Passes", value: passes, barClassName: "bg-violet-500" },
    ] as const;
    const percentages = allocateRoundedPercentages(segments.map((segment) => segment.value));
    const segmentsWithPercentages = segments.map((segment, index) => ({
        ...segment,
        percentage: percentages[index],
    }));

    return (
        <Card className="border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-sm">
            <CardContent className="space-y-4 p-5 sm:p-6">
                <div>
                    <p className="text-sm font-medium text-foreground">Play Mix</p>
                    <p className="text-sm text-muted-foreground">
                        Rounded share of your lifetime turns, including passes.
                    </p>
                </div>
                <div className="space-y-3">
                    {segmentsWithPercentages.map((segment) => (
                        <div
                            key={segment.key}
                            className="space-y-2 rounded-xl border bg-background/70 p-3"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">{segment.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatNumber(segment.value)} turns
                                    </p>
                                </div>
                                <Badge variant="secondary" className="shrink-0">
                                    {segment.percentage}%
                                </Badge>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={`h-full rounded-full ${segment.barClassName}`}
                                    style={{ width: `${segment.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="rounded-xl border border-dashed bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    Percentages are rounded to whole numbers and always add up to 100%.
                </div>
            </CardContent>
        </Card>
    );
};

const SummaryDatum: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-xl border bg-background/60 p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-medium sm:text-base">{value}</p>
    </div>
);

const PlayerDetailRow: React.FC<{
    player: CompletedGameDetailPlayer;
    currentUserUuid: string;
}> = ({ player, currentUserUuid }) => (
    <div className="rounded-xl border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <span className="font-medium">
                    {formatPlayerLabel(player.display_name, player.player_uuid, currentUserUuid)}
                </span>
                {player.is_bot && (
                    <Badge variant="outline">
                        <Bot className="h-3.5 w-3.5" />
                        Bot
                    </Badge>
                )}
                {player.started_first && <Badge variant="secondary">Started</Badge>}
            </div>
            <Badge variant={player.won ? "default" : "secondary"}>
                {player.won ? "Winner" : "Finished"}
            </Badge>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryDatum label="Score" value={formatSignedNumber(player.final_score)} />
            <SummaryDatum label="Cards Left" value={formatNumber(player.cards_remaining)} />
            <SummaryDatum label="Turns" value={formatNumber(player.turns_taken)} />
            <SummaryDatum label="Passes" value={formatNumber(player.passes)} />
            <SummaryDatum
                label="Pass Rate"
                value={formatPercent(calculatePassRate(player.passes, player.turns_taken))}
            />
        </div>
    </div>
);

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value);
}

function formatSignedNumber(value: number): string {
    const formatter = new Intl.NumberFormat(undefined, {
        signDisplay: "exceptZero",
    });
    return formatter.format(value);
}

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function allocateRoundedPercentages(values: number[]): number[] {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
        return values.map(() => 0);
    }

    const rawPercentages = values.map((value) => (value / total) * 100);
    const flooredPercentages = rawPercentages.map((value) => Math.floor(value));
    let remainder = 100 - flooredPercentages.reduce((sum, value) => sum + value, 0);

    const rankedRemainders = rawPercentages
        .map((value, index) => ({
            index,
            remainder: value - Math.floor(value),
        }))
        .sort((left, right) => {
            if (right.remainder === left.remainder) {
                return left.index - right.index;
            }
            return right.remainder - left.remainder;
        });

    const result = [...flooredPercentages];
    for (const item of rankedRemainders) {
        if (remainder <= 0) {
            break;
        }
        result[item.index] += 1;
        remainder -= 1;
    }

    return result;
}

function formatDuration(startedAt: string, completedAt: string): string {
    const diffMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    if (Number.isNaN(diffMs) || diffMs <= 0) {
        return "Instant";
    }

    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) {
        return "Under 1 min";
    }
    if (minutes === 1) {
        return "1 min";
    }
    return `${minutes} mins`;
}

function calculatePassRate(totalPasses: number, totalTurns: number): number {
    if (totalTurns === 0) {
        return 0;
    }

    return totalPasses / totalTurns;
}

function formatPlayerLabel(
    displayName: string | null | undefined,
    playerUuid: string,
    currentUserUuid: string
): string {
    if (playerUuid === currentUserUuid) {
        return "You";
    }

    if (displayName && displayName.trim().length > 0) {
        return displayName;
    }

    const trimmed = playerUuid.replace(/^bot-/, "");
    const shortId = trimmed.slice(0, 8);
    return `${playerUuid.startsWith("bot-") ? "Bot" : "Player"} ${shortId}`;
}

function formatOpponentList(opponents: GameOpponentSummary[], currentUserUuid: string): string {
    return opponents
        .map((opponent) =>
            formatPlayerLabel(opponent.display_name, opponent.player_uuid, currentUserUuid)
        )
        .join(", ");
}

export default MyStatsPage;
