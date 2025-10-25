/**
 * Stats type definitions matching backend models
 * Backend reference: bigtwo/src/stats/models.rs
 */

export interface PlayerStats {
  uuid: string;
  games_played: number;
  wins: number;
  total_score: number;
  current_win_streak: number;
  best_win_streak: number;
}

export interface RoomStats {
  room_id: string;
  games_played: number;
  player_stats: Record<string, PlayerStats>;
}

/**
 * Enriched player stats with display name for UI rendering
 */
export interface PlayerStatsDisplay extends PlayerStats {
  display_name: string;
  is_bot: boolean;
  is_current_user: boolean;
}
