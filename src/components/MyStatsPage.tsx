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
    ProfileStatsGameFilter,
    PlayerProfileStatsResponse,
    PlayerRecentGamesResponse,
} from "../types.profile";
import { useSessionContext } from "../contexts/SessionContext";
import SeoHead from "./SeoHead";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const DEFAULT_GAME_FILTER: ProfileStatsGameFilter = "all";

const FILTER_OPTIONS: Array<{
    value: ProfileStatsGameFilter;
    label: string;
    description: string;
}> = [
    {
        value: "all",
        label: "All",
        description: "Everything you've completed",
    },
    {
        value: "human_only",
        label: "Human Only",
        description: "Matches without bots",
    },
    {
        value: "with_bots",
        label: "With Bots",
        description: "Matches where bots joined",
    },
];

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

    const selectedFilter = getProfileStatsFilter(searchParams.get("filter"));
    const selectedGameId = searchParams.get("game");
    const selectedGameSummary =
        recentGames?.games.find((game) => game.game_id === selectedGameId) ?? null;

    const updateSearchParams = useCallback(
        (next: { game?: string | null; filter?: ProfileStatsGameFilter }, replace = false) => {
            const params = new URLSearchParams(searchParams);
            const filter = next.filter ?? selectedFilter;
            if (filter === DEFAULT_GAME_FILTER) {
                params.delete("filter");
            } else {
                params.set("filter", filter);
            }

            if (next.game === undefined) {
                // Preserve existing selection.
            } else if (next.game) {
                params.set("game", next.game);
            } else {
                params.delete("game");
            }

            setSearchParams(params, { replace });
        },
        [searchParams, selectedFilter, setSearchParams]
    );

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        setPageError(null);

        try {
            const [statsResponse, recentGamesResponse] = await Promise.all([
                getMyProfileStats(selectedFilter),
                getMyRecentGames(20, selectedFilter),
            ]);

            setStats(statsResponse);
            setRecentGames(recentGamesResponse);
        } catch (error) {
            console.error("Failed to load profile page:", error);
            setPageError("Unable to load your stats right now. Try again in a moment.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedFilter]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        if (!recentGames) {
            return;
        }

        if (recentGames.games.length === 0) {
            if (selectedGameId) {
                updateSearchParams({ game: null }, true);
            }
            setSelectedGame(null);
            setDetailError(null);
            return;
        }

        if (!selectedGameId) {
            updateSearchParams({ game: recentGames.games[0].game_id }, true);
            return;
        }

        const hasSelectedGame = recentGames.games.some((game) => game.game_id === selectedGameId);
        if (!hasSelectedGame) {
            updateSearchParams({ game: recentGames.games[0].game_id }, true);
        }
    }, [recentGames, selectedGameId, updateSearchParams]);

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
        updateSearchParams({ game: gameId });
    };

    const handleSelectFilter = (filter: ProfileStatsGameFilter) => {
        updateSearchParams({ filter, game: null });
        setSelectedGame(null);
        setDetailError(null);
    };

    const handleRefresh = async () => {
        await loadProfile();
        setDetailRefreshKey((key) => key + 1);
    };

    const hasHistory =
        (stats?.summary.games_played ?? 0) > 0 || (recentGames?.games.length ?? 0) > 0;
    const historyTitle =
        selectedFilter === "all"
            ? "No completed matches yet"
            : `No ${getFilterLabel(selectedFilter).toLowerCase()} matches yet`;
    const historyDescription =
        selectedFilter === "all"
            ? "Your lifetime stats will show up here after you finish a game."
            : `Your ${getFilterLabel(selectedFilter).toLowerCase()} stats will show up here after you finish a matching game.`;
    const recentHistoryDescription = getRecentHistoryDescription(selectedFilter);

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
                <section className="relative overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-br from-card via-card to-primary/10 p-5 shadow-[0_24px_56px_-32px_rgba(15,23,42,0.45)] sm:p-6 dark:to-primary/15">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.2),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_36%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.24),transparent_40%)]" />
                    <div className="relative flex flex-col gap-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    <span>Personal profile</span>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                    My Stats
                                </h1>
                                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                                    Switch between all games, human-only tables, and matches with
                                    bots while keeping the same stat layout.
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
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2">
                                {FILTER_OPTIONS.map((option) => {
                                    const isActive = option.value === selectedFilter;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleSelectFilter(option.value)}
                                            className={`rounded-full border px-4 py-2 text-left transition-colors ${
                                                isActive
                                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                                    : "border-border/70 bg-background/60 text-foreground hover:bg-accent"
                                            }`}
                                        >
                                            <span className="block text-sm font-medium">
                                                {option.label}
                                            </span>
                                            <span
                                                className={`block text-xs ${
                                                    isActive
                                                        ? "text-primary-foreground/80"
                                                        : "text-muted-foreground"
                                                }`}
                                            >
                                                {option.description}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Viewing {getFilterLabel(selectedFilter).toLowerCase()} stats.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <StatCard
                                label="Games Played"
                                value={formatNumber(stats?.summary.games_played ?? 0)}
                            />
                            <StatCard label="Wins" value={formatNumber(stats?.summary.wins ?? 0)} />
                            <StatCard
                                label="Win Rate"
                                value={formatPercent(stats?.summary.win_rate ?? 0)}
                            />
                            <StatCard
                                label="Current Streak"
                                value={formatNumber(stats?.summary.current_win_streak ?? 0)}
                            />
                            <StatCard
                                label="Best Streak"
                                value={formatNumber(stats?.summary.best_win_streak ?? 0)}
                            />
                        </div>
                        <PlayMixCard
                            passes={stats?.play_style.total_passes ?? 0}
                            singles={stats?.play_style.total_single_plays ?? 0}
                            pairs={stats?.play_style.total_pair_plays ?? 0}
                            triples={stats?.play_style.total_triple_plays ?? 0}
                            fiveCardHands={stats?.play_style.total_five_card_plays ?? 0}
                            filterLabel={getFilterLabel(selectedFilter)}
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
                            <CardTitle>{historyTitle}</CardTitle>
                            <CardDescription>{historyDescription}</CardDescription>
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
                                <CardDescription>{recentHistoryDescription}</CardDescription>
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
                                                className={`w-full rounded-xl border border-border/70 p-4 text-left transition-all duration-200 ${
                                                    selectedGameId === game.game_id
                                                        ? "border-primary/60 bg-primary/10 shadow-sm"
                                                        : "bg-background/35 hover:bg-accent/70"
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

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <Card className="border-border/70 bg-background/50 dark:bg-background/35">
        <CardContent className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </CardContent>
    </Card>
);

const PlayMixCard: React.FC<{
    passes: number;
    singles: number;
    pairs: number;
    triples: number;
    fiveCardHands: number;
    filterLabel: string;
}> = ({ passes, singles, pairs, triples, fiveCardHands, filterLabel }) => {
    const segments = [
        { key: "singles", label: "Singles", value: singles, color: "#0ea5e9" },
        { key: "pairs", label: "Pairs", value: pairs, color: "#10b981" },
        { key: "triples", label: "Triples", value: triples, color: "#f43f5e" },
        {
            key: "five",
            label: "Five-Card",
            value: fiveCardHands,
            color: "#f59e0b",
        },
        { key: "passes", label: "Passes", value: passes, color: "#8b5cf6" },
    ] as const;
    const percentages = allocateRoundedPercentages(segments.map((segment) => segment.value));
    const segmentsWithPercentages = segments.map((segment, index) => ({
        ...segment,
        percentage: percentages[index],
    }));
    const radarCenter = 120;
    const radarRadius = 84;
    const ringCount = 4;
    const chartPoints = segmentsWithPercentages.map((segment, index, allSegments) => {
        const angle = (-Math.PI / 2) + (index / allSegments.length) * Math.PI * 2;
        const normalizedValue = segment.percentage / 100;
        const pointRadius = normalizedValue * radarRadius;

        return {
            ...segment,
            angle,
            point: polarToCartesian(radarCenter, radarCenter, pointRadius, angle),
            axisEnd: polarToCartesian(radarCenter, radarCenter, radarRadius, angle),
            labelPoint: polarToCartesian(radarCenter, radarCenter, radarRadius + 22, angle),
        };
    });
    const polygonPoints = chartPoints
        .map(({ point }) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
        .join(" ");

    return (
        <Card className="border-border/70 bg-background/45 shadow-none dark:bg-background/30">
            <CardContent className="space-y-5 p-5 sm:p-6">
                <div>
                    <p className="text-sm font-medium text-foreground">Play Mix</p>
                    <p className="text-sm text-muted-foreground">
                        Kiviat view of your {filterLabel.toLowerCase()} action mix, including
                        passes.
                    </p>
                </div>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center">
                    <div className="rounded-[28px] border border-border/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),rgba(255,255,255,0.2)_45%,transparent_72%)] p-3 dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(255,255,255,0.03)_42%,transparent_72%)]">
                        <svg
                            viewBox="0 0 240 240"
                            className="mx-auto block w-full max-w-[360px] overflow-visible"
                            role="img"
                            aria-label="Radar chart showing the distribution of singles, pairs, triples, five-card hands, and passes."
                        >
                            {Array.from({ length: ringCount }, (_, index) => {
                                const radius = (radarRadius / ringCount) * (index + 1);
                                const ringPoints = chartPoints
                                    .map(({ angle }) =>
                                        polarToCartesian(radarCenter, radarCenter, radius, angle)
                                    )
                                    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
                                    .join(" ");

                                return (
                                    <polygon
                                        key={`ring-${radius}`}
                                        points={ringPoints}
                                        fill={index % 2 === 0 ? "rgba(148,163,184,0.08)" : "rgba(148,163,184,0.03)"}
                                        stroke="rgba(148,163,184,0.22)"
                                        strokeWidth="1"
                                    />
                                );
                            })}
                            {chartPoints.map((segment) => (
                                <g key={segment.key}>
                                    <line
                                        x1={radarCenter}
                                        y1={radarCenter}
                                        x2={segment.axisEnd.x}
                                        y2={segment.axisEnd.y}
                                        stroke="rgba(148,163,184,0.24)"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={segment.labelPoint.x}
                                        y={segment.labelPoint.y}
                                        textAnchor={getTextAnchor(segment.angle)}
                                        dominantBaseline="middle"
                                        fill="currentColor"
                                        className="fill-foreground text-[9px] font-medium tracking-[0.16em]"
                                    >
                                        {segment.label.toUpperCase()}
                                    </text>
                                </g>
                            ))}
                            <polygon
                                points={polygonPoints}
                                fill="rgba(14,165,233,0.14)"
                                stroke="rgba(15,23,42,0.12)"
                                strokeWidth="1.5"
                            />
                            {chartPoints.map((segment) => (
                                <g key={`${segment.key}-point`}>
                                    <circle
                                        cx={segment.point.x}
                                        cy={segment.point.y}
                                        r="7"
                                        fill={segment.color}
                                        fillOpacity="0.2"
                                    />
                                    <circle
                                        cx={segment.point.x}
                                        cy={segment.point.y}
                                        r="4.5"
                                        fill={segment.color}
                                        stroke="rgba(255,255,255,0.92)"
                                        strokeWidth="1.5"
                                    />
                                </g>
                            ))}
                        </svg>
                    </div>
                    <div className="grid gap-3">
                        {segmentsWithPercentages.map((segment) => (
                            <div
                                key={segment.key}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 p-3 dark:bg-background/40"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span
                                        className="h-3 w-3 shrink-0 rounded-full"
                                        style={{ backgroundColor: segment.color }}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">{segment.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatNumber(segment.value)} turns
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="shrink-0">
                                    {segment.percentage}%
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const SummaryDatum: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3 dark:bg-background/35">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-medium sm:text-base">{value}</p>
    </div>
);

const PlayerDetailRow: React.FC<{
    player: CompletedGameDetailPlayer;
    currentUserUuid: string;
}> = ({ player, currentUserUuid }) => (
    <div className="rounded-xl border border-border/70 bg-background/35 p-3 dark:bg-background/20">
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

function getProfileStatsFilter(value: string | null): ProfileStatsGameFilter {
    if (value === "human_only" || value === "with_bots") {
        return value;
    }
    return DEFAULT_GAME_FILTER;
}

function getFilterLabel(filter: ProfileStatsGameFilter): string {
    switch (filter) {
        case "human_only":
            return "Human Only";
        case "with_bots":
            return "With Bots";
        default:
            return "All";
    }
}

function getRecentHistoryDescription(filter: ProfileStatsGameFilter): string {
    switch (filter) {
        case "human_only":
            return "Your most recent completed matches without bots.";
        case "with_bots":
            return "Your most recent completed matches where bots joined.";
        default:
            return "Your most recent completed matches across rooms.";
    }
}

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

function polarToCartesian(centerX: number, centerY: number, radius: number, angle: number) {
    return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
    };
}

function getTextAnchor(angle: number): "start" | "middle" | "end" {
    const cosine = Math.cos(angle);
    if (cosine > 0.35) {
        return "start";
    }
    if (cosine < -0.35) {
        return "end";
    }
    return "middle";
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
