import React from 'react';
import { Trophy, Flame, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { PlayerStatsDisplay } from '../types.stats';

interface StatsPanelProps {
  gamesPlayed: number;
  playerStats: PlayerStatsDisplay[];
  className?: string;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  gamesPlayed,
  playerStats,
  className,
}) => {
  if (gamesPlayed === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Room Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No games played yet. Start a game to see stats!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Room Statistics
          </CardTitle>
          <Badge variant="secondary">
            {gamesPlayed} game{gamesPlayed === 1 ? '' : 's'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {playerStats.map((player) => (
            <PlayerStatsRow key={player.uuid} player={player} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface PlayerStatsRowProps {
  player: PlayerStatsDisplay;
}

const PlayerStatsRow: React.FC<PlayerStatsRowProps> = ({ player }) => {
  const showWinStreak = player.current_win_streak >= 2;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md border p-3',
        'transition-colors hover:bg-accent',
        player.is_current_user && 'border-primary bg-primary/5'
      )}
    >
      {/* Player name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-medium truncate">
          {player.display_name}
        </span>
        {player.is_bot && (
          <Badge variant="outline" className="text-xs">
            Bot
          </Badge>
        )}
      </div>

      {/* Stats - fixed widths for alignment */}
      <div className="flex items-center gap-3 text-sm">
        {/* Wins - fixed width */}
        <div className="flex items-center gap-1 w-12 justify-end">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold w-4 text-right">{player.wins}</span>
        </div>

        {/* Score - fixed width */}
        <div className="flex items-center gap-1 w-24 justify-end">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            'font-mono whitespace-nowrap text-right',
            player.total_score <= 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
          )}>
            {player.total_score} pts
          </span>
        </div>

        {/* Win streak (only if >= 2) - fixed width to prevent layout shift */}
        <div className="flex items-center gap-1 w-10 justify-end">
          {showWinStreak && (
            <>
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-orange-600 dark:text-orange-400 w-4 text-right">
                {player.current_win_streak}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
